import { resolve, toFileUrl, dirname, common, relative, join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { readJsonOrCreate, stat } from "./fs_util.ts";
import { glob, globFiles, shell } from "./lib_funcs.ts";
import { CLANG, CompileOutput, custom as customToolchain, GCC, SourceFileEntry, Toolchain } from "./toolchains/toolchain.ts";
import { ERROR, HEADER, RESET, SUCCESS, WHITE } from "./colors.ts";
import { parseCli } from "./cli_util.ts";

export function fatal(...args: unknown[]) {
    console.error(...args);
    Deno.exit(1);
}

export function compileFatal() {
    console.error("*** %cCompilation failed!%c ***", "color: #d43c3c", RESET);
    Deno.exit(2);
}

export type GlobalCache = {
    object: Record<string, number>,
    custom: Record<string, number>    
}

export type DirTree = {
    // The project root
    readonly root: string,
    
    // The .seeglue folder
    readonly metaRoot: string,
    
    // The build folder containing object files
    readonly buildFolder: string,
    
    // The build.ts script file
    readonly buildFile: string,
    
    // The object cache, cache.json, file
    readonly cacheFile: string
}


if (import.meta.main) {
    const params = parseCli();

    // Get the project root
    const root = resolve(Deno.cwd(), params.root);

    // Get the meta directory
    const metaRoot = join(root, ".seeglue");
    
    // Get the build/cache directory
    const buildFolder = resolve(metaRoot, "build");
    
    // Get the build script
    const buildFile = resolve(metaRoot, "build.ts");
    
    // Check if build file exists (and by extension, .seeglue)
    const buildFileStat = await stat(buildFile);
    if (buildFileStat === null) {
        fatal("Build file does not exist", buildFile);
    }
    if (!buildFileStat!.isFile) {
        fatal("Build file is not a file", buildFile);
    }
    
    // Ensure they actually exist
    await Promise.all([
        //ensureDir(metaRoot),
        ensureDir(buildFolder)
    ]);
    
    // Change cwd to possibly prevent user error
    Deno.chdir(root);
    
    // Make the cache
    const cacheFile = resolve(metaRoot, "cache.json");
    const cacheFileUrl = toFileUrl(cacheFile);
    const globalCache = await readJsonOrCreate<GlobalCache>(cacheFileUrl, { object: Object.create(null), custom: Object.create(null) });
    const objCache = globalCache.object;
    
    // Check if deno supports mtime, since allegedly it might not always
    if (!(await Deno.stat(cacheFileUrl)).mtime) {
        throw new TypeError("Deno.stat does not support mtime");
    }
    
    // The pro
    const tree: DirTree = {
        root: root,
        metaRoot: metaRoot,
        buildFile: buildFile,
        cacheFile: cacheFile,
        buildFolder: buildFolder
    }
    
    // Create the build environment object
    const buildEnv: Seeglue.BuildEnv = {
        projectRoot: root,
        standard: "c11",
        
        compile: {
            commonIncludes: new Set(),
            units: new Set(),
            commonFlags: [],
        },
        
        link: {
            extraInput: new Set(),
            libFolders: new Set(),
            sharedLibs: new Set(),
            staticLibs: new Set(),
            flags: {
                args: [],
                mergeStyle: "after"
            }
        },

        cache: globalCache.custom,
        
        glob: glob.bind({}, root),
        globFiles: globFiles.bind({}, root),
        shell: shell
    };
    
    // Load the build file
    const module: { default: Seeglue.BuildFunc } = await import(toFileUrl(buildFile).toString());
    
    // Run the build script
    console.group("*** %cRunning build script%c ***", HEADER, RESET)
    await module.default(buildEnv);
    console.groupEnd();
    console.log();

    await Deno.writeTextFile(cacheFileUrl, JSON.stringify(globalCache));
    
    // Ensure compiler exists
    if (!buildEnv.compiler || (buildEnv.compiler === "custom" && !await exists(buildEnv.compilerPath ?? "", { isFile: true }))) {
        fatal("No compiler/path specified");
    }

    if (!buildEnv.output) {
        fatal("No output file specified");
    }

    await ensureDir(dirname(buildEnv.output!));
    
    let toolchain: Toolchain = null!;
    switch (buildEnv.compiler) {
        case "gcc":
        toolchain = GCC;
        break;
        
        case "clang":
        toolchain = CLANG;
        break;
        
        case "custom":
        if (!buildEnv.compilerPath)
            fatal("No compiler path specified");
        
        toolchain = customToolchain(buildEnv.compilerPath!);
        break;
        
        case null:
        case undefined:
        fatal("No compiler specified");
        break;
        
        default:
        fatal("Unknown compiler specified");
        break;
    }
    
    // Ensure output kind is specified
    switch (buildEnv.outputKind) {
        case "app":
        case "sharedlib":
        case "staticlib":
        break;
        
        default:
            fatal("Invalid output type specified");
            break;
    }
    
    // Ensure output type
    if (!buildEnv.output) {
        fatal("No output type specified");
    }
    
    // Updated object cache
    const updatedObjCache: Record<string, number> = Object.create(null); 
    const objectFiles: string[] = [];
    const notFound: string[] = [];
    const tasks: Promise<Map<SourceFileEntry, CompileOutput>>[] = [];
    
    // TODO: Parallelize?
    // Compile the source files
    console.group("*** %cRunning compiler%c ***", HEADER, RESET);
    for (const unit of buildEnv.compile.units) {
        // Find files that require compilation to objects
        const freshFiles: SourceFileEntry[] = [];
        for (const file of unit.input) {
            const cachePath = relative(common([root, file]), file).replaceAll("\\", "/");
            const fileStat = await stat(file);
            
            if (fileStat === null) {
                notFound.push(file);
                continue;
            }

            objectFiles.push(resolve(buildFolder, cachePath + ".o"));
            
            // Get the last modified timestamp in unix
            const mtime = fileStat!.mtime!.getTime();
            
            // File is in cache and up to date, keep it
            if (cachePath in objCache && mtime <= objCache[cachePath]) {
                updatedObjCache[cachePath] = mtime;
                continue;
            }
            
            // Add to files needing compilation
            freshFiles.push({ file: file, cachePath: cachePath, mtime: mtime });  
        }
        
        // Compile the darn unit
        tasks.push(toolchain.compile(tree, buildEnv, freshFiles, unit));
    }

    // Check if all files exist
    if (notFound.length !== 0) {
        console.group("Following files were not found");
        for (const file of notFound) {  
            console.error(file)
        }
        console.groupEnd();
        compileFatal()
    }
    
    // Print output from compilation
    let compileFailed = false;
    const decoder = new TextDecoder('utf-8');
    for (const unit of await Promise.all(tasks)) {
        for (const [src,result] of unit) {            
            // Print status for each file
            if (result.shell.success) {
                console.groupCollapsed(`[%c✓%c] Compiling file... ${src.cachePath}`, SUCCESS, RESET);
            } else {
                console.groupCollapsed(`[%cX%c] Compiling file... ${src.cachePath}`, ERROR, RESET);
                compileFailed = true;
            }{
                // Print stdout if any data
                if (result.shell.stdout.length !== 0) {
                    console.groupCollapsed("%cout%c:", WHITE, RESET);
                    console.log(decoder.decode(result.shell.stdout));
                    console.groupEnd();
                }
                
                // Print stderr if any data
                if (result.shell.stderr.length !== 0) {
                    console.groupCollapsed("%cerr%c:", ERROR, RESET);
                    console.error(decoder.decode(result.shell.stderr));
                    console.groupEnd();
                }
            }
            
            console.groupEnd();
            
            if (!result.shell.success)
                continue;

            // Update the cache
            updatedObjCache[src.cachePath] = src.mtime;
        }
    }    
    console.groupEnd();
    console.log();
    
    // Overwrite old cache
    await Deno.writeTextFile(cacheFileUrl, JSON.stringify(globalCache));
    
    // Oof.
    if (compileFailed) {
        compileFatal();
    }
    
    // === Link it ===
    let linkFailed = false;
    console.group("*** %cRunning linker%c ***", HEADER, RESET);
    {
        const result = await toolchain.link(tree, buildEnv, objectFiles);
        // Print status for each file
        if (result.shell.success) {
            console.groupCollapsed(`[%c✓%c] Linking file... ${buildEnv.output}`, SUCCESS, RESET);
        } else {
            console.groupCollapsed(`[%cX%c] Linking file... ${buildEnv.output}`, ERROR, RESET);
            linkFailed = true;
        }{
            // Print stdout if any data
            if (result.shell.stdout.length !== 0) {
                console.groupCollapsed("%cout%c:", WHITE, RESET);
                console.log(decoder.decode(result.shell.stdout));
                console.groupEnd();
            }
            
            // Print stderr if any data
            if (result.shell.stderr.length !== 0) {
                console.groupCollapsed("%cerr%c:", ERROR, RESET);
                console.error(decoder.decode(result.shell.stderr));
                console.groupEnd();
            }
        }
        console.groupEnd();
    }
    console.groupEnd();
    console.log();

    if (!linkFailed) {
        console.log(`*** %cLinked executable %c${resolve(root, buildEnv.output!)}%c ***`, SUCCESS, WHITE, RESET);
    }
    else {
        console.error(`*** %cLinker failed%c ***`, ERROR, RESET)
    }
}
