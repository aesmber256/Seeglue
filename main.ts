import { resolve, toFileUrl, dirname, common, relative, isAbsolute } from "@std/path";
import { ensureDir, exists, ensureFile } from "@std/fs";
import { stat } from "./fs_util.ts";
import { glob, globFiles, shell } from "./lib_funcs.ts";

import LIB_EMBED from "./lib.d.ts" with { type: "text" };

async function readJson<T>(path: string | URL): Promise<T> {
  return (await import(path.toString(), { with: { type: "json" } })).default as T;
}

function fatal(...args: unknown[]) {
  console.error(...args);
  Deno.exit(1);
}

type ObjectCache = Record<string, number>;

if (import.meta.main) {
  // Find the meta directory
  const metaRoot = resolve(Deno.cwd(), Deno.args.length > 0
    ? Deno.args[0]
    : ".seeglue"
  );
  
  // Get the project root
  const root = dirname(metaRoot);
  // Get the build/cache directory
  const metaBuild = resolve(metaRoot, "build");
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
    ensureDir(metaBuild)
  ]);
  
  // Change cwd to possibly prevent user error
  Deno.chdir(root);
  
  // TODO: Refactor this abomination
  // Get the object cache as a dict
  const objCacheUrl = toFileUrl(resolve(metaRoot, "cache.json"));
  let objCache: ObjectCache;
  if (await exists(objCacheUrl)) {
    objCache = await readJson(objCacheUrl);
  }
  else {
    await Deno.writeTextFile(objCacheUrl, "{}");
    objCache = {};
  }
  if (!(await Deno.stat(objCacheUrl)).mtime) {
    throw new TypeError("Deno.stat does not support mtime");
  }
  
  // Create the build environment object
  const buildEnv: Seeglue.BuildEnv = {
    projectRoot: root,
    
    standard: "c11",
    
    compile: {
      flags: { args: [], override: Object.create(null) },
      srcFiles: new Set()
    },
    
    link: {
      flags: { args: [] },
      incFolders: new Set(),
      libFiles: new Set()
    },
    
    glob: glob.bind({}, root),
    globFiles: globFiles.bind({}, root),
    shell: shell
  };
  
  // Load the build file
  const module: { default: Seeglue.BuildFunc } = await import(toFileUrl(buildFile).toString());
  
  // Run the build script
  console.group("--- %cRunning build script%c ---", "color: rgba(44, 209, 209, 1)", "color: initial")
  await module.default(buildEnv);
  console.groupEnd();
  console.log();
  
  // Ensure compiler exists
  buildEnv.compiler ||= Deno.env.get("CC");
  if (!buildEnv.compiler) {
    fatal("No compiler speicified, and $CC is not set");
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
    fatal("*** Compilation failed! ***");
  }
  
  // Compile the source files
  const compileFlags = [
    `-std=${buildEnv.standard}`,
    ...buildEnv.compile.flags.args
  ];

  let colorFlag = "";
  // If known compiler, enable color output
  switch (buildEnv.compiler) {
    case "gcc":
      colorFlag = "-fdiagnostics-color=always";
      break;

    case "clang":
      colorFlag = "-fdiagnostics-color";
      break;
  }
  
  // Compile the source files
  const jobs: Promise<Deno.CommandOutput>[] = [];
  for (const file of freshFiles) {
    const args = buildEnv.compile.flags.override[file.file] || compileFlags;
    const output = resolve(metaBuild, file.cachePath + ".o");

    const command = new Deno.Command(buildEnv.compiler!, { 
      args: [
        "-c", file.file,
        ...args,
        "-o", output,
        colorFlag
      ]
    });
    
    jobs.push(ensureFile(output).then(() => command.output()));
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
      if (result.stdout.length !== 0) {
        console.groupCollapsed("Stdout");
        console.log(decoder.decode(result.stdout));
        console.groupEnd();
      }
      
      if (result.stderr.length !== 0) {
        console.groupCollapsed("Stderr");
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
  await Deno.writeTextFile(objCacheUrl, JSON.stringify(updatedObjCache));
  
  // Oof.
  if (compileFailed) {
    fatal("*** Compilation failed! ***");
  }


}
