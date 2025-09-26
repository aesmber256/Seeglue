import { resolve } from "@std/path/resolve";
import { CliArgs } from "../cli_util.ts";
import { stat } from "../fs_util.ts";
import { compileFatal, fatal } from "../main.ts";
import { createTree, getOrCreateGlobalCache } from "../util.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { toFileUrl } from "@std/path/to-file-url";
import * as libf from "../lib_funcs.ts";
import { common } from "@std/path/common";
import { dirname } from "@std/path/dirname";
import { relative } from "@std/path/relative";
import { HEADER, RESET, SUCCESS, ERROR, WHITE } from "../colors.ts";
import { Toolchain, GCC, CLANG, SourceFileEntry, CompileOutput, custom as customToolchain } from "../toolchains/toolchain.ts";
import { normal as log } from "../log.ts";

export type BuildScriptResult = {
    env: Seeglue.BuildEnv,
    toolchain?: Toolchain,
    error?: string,
}

export function defaultBuildEnv(root: string, isDryRun: boolean, cache: Record<string, number>): Seeglue.BuildEnv {
    return {
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

        cache: cache,
        isDryRun: isDryRun,
        
        shell: libf.shell,
        
        fs: {
           glob: libf.glob.bind(undefined, root),
           globFiles: libf.globFiles.bind(undefined, root),
           writeText: libf.writeText,
           writeBin: libf.writeBin,
           readText: libf.readText,
           readBin: libf.readBin,
           appendText: libf.appendText,
           appendBin: libf.appendBin,
           exists: libf.exists,
           mkdir: libf.mkdir,
           mkfile: libf.mkfile,
           rm: libf.rm,
           stat: libf.stat
        }
    };
}

export type BuildFunctionType = "build" | "clean";

export async function invokeBuildFunction(scriptFile: string, func: BuildFunctionType, buildEnv: Seeglue.BuildEnv) {
    // Load the build file
    const module: Seeglue.BuildScript = (await import(toFileUrl(scriptFile).toString())).default;
    
    // Prepare return value
    const result: BuildScriptResult = {
        env: buildEnv
    };

    // Run the build script
    log.group("*** %cRunning build script%c ***", HEADER, RESET);
    await module[func](buildEnv);
    log.groupEnd();
    log.log();
    
    // Select the toolchain
    switch (buildEnv.compiler) {
        case "gcc":
            result.toolchain = GCC;
            break;
        
        case "clang":
            result.toolchain = CLANG;
            break;
        
        case "custom":
            if (!buildEnv.compilerPath)
            {
                result.error = "No compiler path specified";
                return result;
            }
            
            result.toolchain = customToolchain(buildEnv.compilerPath!);
            break;
        
        case null:
        case undefined:
            result.error = "No compiler specified";
            return result;
        
        default:
            result.error = "Unknown compiler specified";
            return result;
    }
    
    // Ensure output kind is specified
    switch (buildEnv.outputKind) {
        case "app":
        case "sharedlib":
        case "staticlib":
            break;
        
        default:
            result.error = "Invalid output type specified";
            return result;
    }
    
    // Ensure output type
    if (!buildEnv.output) {
        result.error = "No output file specified";
        return result;
    }

    // Create output directory exists
    await ensureDir(dirname(buildEnv.output!));

    return result;
}

export default async function(args: CliArgs) {
    const tree = createTree(args.projectRoot);
    const { root, buildFile, buildFolder, cacheFile } = tree;
    
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
    const globalCache = await getOrCreateGlobalCache(cacheFile);
    const objCache = globalCache.object;
    
    // Check if deno supports mtime, since allegedly it might not always
    if (!(await Deno.stat(cacheFile)).mtime) {
        throw new TypeError("Deno.stat does not support mtime");
    }
    
    // Create the build environment object
    const buildEnv = defaultBuildEnv(root, args.dryRun, globalCache.custom);

    // Invoke build script
    const { error: buildError, toolchain } = await invokeBuildFunction(buildFile, "build", buildEnv) as { error: string | undefined, toolchain: Toolchain };
    if (typeof(buildError) === "string") {
        fatal(buildError);
    }

    // Actually make sure we aren't doing something silly
    if (!toolchain) {
        throw new TypeError("Toolchain undefined after no errors");
    }

    // Update the user cache
    await Deno.writeTextFile(cacheFile, JSON.stringify(globalCache));
    
    // Updated object cache
    const updatedObjCache: Record<string, number> = Object.create(null); 
    const objectFiles: string[] = [];
    const notFound: string[] = [];
    const tasks: Promise<Map<SourceFileEntry, CompileOutput>>[] = [];
    globalCache.object = updatedObjCache;

    // TODO: Parallelize?
    // Compile the source files
    log.group("*** %cRunning compiler%c ***", HEADER, RESET);
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
        log.group("Following files were not found");
        for (const file of notFound) {  
            log.error(file)
        }
        log.groupEnd();
        compileFatal()
    }
    
    // Print output from compilation
    let compileFailed = false;
    const decoder = new TextDecoder('utf-8');
    for (const unit of await Promise.all(tasks)) {
        for (const [src,result] of unit) {            
            // Print status for each file
            if (result.shell.success) {
                log.groupCollapsed(`[%c✓%c] Compiling file... ${src.cachePath}`, SUCCESS, RESET);
            } else {
                log.groupCollapsed(`[%cX%c] Compiling file... ${src.cachePath}`, ERROR, RESET);
                compileFailed = true;
            }{
                // Print stdout if any data
                if (result.shell.stdout.length !== 0) {
                    log.groupCollapsed("%cout%c:", WHITE, RESET);
                    log.log(decoder.decode(result.shell.stdout));
                    log.groupEnd();
                }
                
                // Print stderr if any data
                if (result.shell.stderr.length !== 0) {
                    log.groupCollapsed("%cerr%c:", ERROR, RESET);
                    log.error(decoder.decode(result.shell.stderr));
                    log.groupEnd();
                }
            }
            
            log.groupEnd();
            
            if (!result.shell.success)
                continue;

            // Update the cache
            updatedObjCache[src.cachePath] = src.mtime;
        }
    }    
    log.groupEnd();
    log.log();
    
    // Overwrite old cache
    await Deno.writeTextFile(cacheFile, JSON.stringify(globalCache));
    
    // Oof.
    if (compileFailed) {
        compileFatal();
    }
    
    // === Link it ===
    let linkFailed = false;
    log.group("*** %cRunning linker%c ***", HEADER, RESET);
    {
        const result = await toolchain.link(tree, buildEnv, objectFiles);
        // Print status for each file
        if (result.shell.success) {
            log.groupCollapsed(`[%c✓%c] Linking file... ${buildEnv.output}`, SUCCESS, RESET);
        } else {
            log.groupCollapsed(`[%cX%c] Linking file... ${buildEnv.output}`, ERROR, RESET);
            linkFailed = true;
        }{
            // Print stdout if any data
            if (result.shell.stdout.length !== 0) {
                log.groupCollapsed("%cout%c:", WHITE, RESET);
                log.log(decoder.decode(result.shell.stdout));
                log.groupEnd();
            }
            
            // Print stderr if any data
            if (result.shell.stderr.length !== 0) {
                log.groupCollapsed("%cerr%c:", ERROR, RESET);
                log.error(decoder.decode(result.shell.stderr));
                log.groupEnd();
            }
        }
        log.groupEnd();
    }
    log.groupEnd();
    log.log();

    if (!linkFailed) {
        log.log(`*** %cLinked executable %c${resolve(root, buildEnv.output!)}%c ***`, SUCCESS, WHITE, RESET);
    }
    else {
        log.error(`*** %cLinker failed%c ***`, ERROR, RESET)
    }
    log.log();
}
