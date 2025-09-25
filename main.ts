import { resolve, toFileUrl, dirname, common, relative, isAbsolute } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { stat } from "./fs_util.ts";
import { glob, globFiles, shell } from "./lib_funcs.ts";
import { CLANG, custom as customToolchain, GCC, Toolchain } from "./toolchains/toolchain.ts";



async function readJson<T>(path: string | URL): Promise<T> {
  return (await import(path.toString(), { with: { type: "json" } })).default as T;
}

export function fatal(...args: unknown[]) {
  console.error(...args);
  Deno.exit(1);
}

export function compileFatal() {
  fatal("*** %cCompilation failed!%c ***", "color: #d43c3c", "color: initial");
}

export type ObjectCache = Record<string, number>;
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
  // Find the meta directory
  const metaRoot = resolve(Deno.cwd(), Deno.args.length > 0
    ? Deno.args[0]
    : ".seeglue"
  );
  
  // Get the project root
  const root = dirname(metaRoot);
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
  
  // TODO: Refactor this abomination
  // Get the object cache as a dict
  const cacheFile = resolve(metaRoot, "cache.json");
  const objCacheUrl = toFileUrl(cacheFile);
  let objCache: ObjectCache;
  // Todo: race condition, see fs_util.ts stat(string)
  if (await exists(objCacheUrl)) {
    objCache = await readJson(objCacheUrl);
  }
  else {
    await Deno.writeTextFile(objCacheUrl, "{}");
    objCache = {};
  }

  // Check if deno supports mtime, since allegedly it might not always
  if (!(await Deno.stat(objCacheUrl)).mtime) {
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
    incPath: new Set(),
    
    compile: {
      flags: { args: [], override: Object.create(null) },
      srcFiles: new Set()
    },
    
    link: {
      flags: { args: [] },
      libFolders: new Set(),
      libFiles: new Set()
    },
    
    glob: glob.bind({}, root),
    globFiles: globFiles.bind({}, root),
    shell: shell
  };
  
  // Load the build file
  const module: { default: Seeglue.BuildFunc } = await import(toFileUrl(buildFile).toString());
  
  // Run the build script
  console.group("*** %cRunning build script%c ***", "color: rgba(44, 209, 154, 1)", "color: initial")
  await module.default(buildEnv);
  console.groupEnd();
  console.log();
  
  // Ensure compiler exists
  if (!buildEnv.compiler || (buildEnv.compiler === "custom" && !await exists(buildEnv.compilerPath ?? "", { isFile: true }))) {
    fatal("No compiler/path specified");
  }

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

  // Ensure output type
  if (!buildEnv.output) {
    fatal("No output type specified");
  }
  
  // Convert to absolute paths
  const convertedOverrides = Object.create(null);
  for (const [key, value] of Object.entries(buildEnv.compile.flags.override)) {
    convertedOverrides[isAbsolute(key) ? key : resolve(root, key)] = value;
  }
  buildEnv.compile.flags.override = convertedOverrides;
  
  // TODO: Parallelize?
  // Find files that require compilation to objects
  const freshFiles: { file: string, cachePath: string, mtime: number}[] = [];
  const notFound: string[] = [];
  const updatedObjCache: ObjectCache = Object.create(null); 
  for (const file of buildEnv.compile.srcFiles) {
    const cachePath = relative(common([root, file]), file).replaceAll("\\", "/");
    const fileStat = await stat(file);
    
    if (fileStat === null) {
      notFound.push(file);
      continue;
    }

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
  
  // Check if all files exist
  if (notFound.length !== 0) {
    console.group("Following files were not found");
    for (const file of notFound) {  
      console.error(file)
    }
    console.groupEnd();
    compileFatal()
  }

  // Compile the source files
  console.group("*** %cRunning compiler%c ***", "color: rgba(44, 209, 154, 1)", "color: initial");
  const jobs: Promise<Deno.CommandOutput>[] = [];
  for (const file of freshFiles) {
    jobs.push(toolchain.compileFile(tree, buildEnv, file));
  }
  
  // Print output from compilation
  const compileResults = await Promise.all(jobs);
  let compileFailed = false;
  const decoder = new TextDecoder('utf-8');
  for (let i = 0; i < compileResults.length; i++) {
    const result = compileResults[i];
    const source = freshFiles[i];
    
    if (!result.success) {
      compileFailed = true;
    }
    
    // Print status for each file
    console.groupCollapsed(`[%c${result.success ? '✓' : 'X'}%c] Compiling file... ${source.cachePath}`,
      `color: #${result.success ? "00FF00" : "FF0000"}`,
      "color: initial"
    ); {
      // Print stdout if any data
      if (result.stdout.length !== 0) {
        console.groupCollapsed("%cout%c:", "color: #FFFFFF", "color: initial");
        console.log(decoder.decode(result.stdout));
        console.groupEnd();
      }
      
      // Print stderr if any data
      if (result.stderr.length !== 0) {
        console.groupCollapsed("%cerr%c:", "color: #ff0000", "color:initial");
        console.error(decoder.decode(result.stderr));
        console.groupEnd();
      }
    } 
    console.groupEnd();
    
    if (!result.success)
      continue;
    
    // Update the cache
    updatedObjCache[source.cachePath] = source.mtime;
  }
  console.groupEnd();

  // Overwrite old cache
  await Deno.writeTextFile(objCacheUrl, JSON.stringify(updatedObjCache));
  
  // Oof.
  if (compileFailed) {
    compileFatal();
  }

  // === Link it ===
  let linkFlags;
  switch (buildEnv.output) {
    case "app":
      linkFlags
      break;

    case "lib":

      break;

    default:
      fatal("Invalid output type specified");
      break;
  }
}
