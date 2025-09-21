import { resolve, toFileUrl, dirname, common, relative, join, parse } from "@std/path";
import { expandGlob, ensureDir, exists } from "@std/fs";

async function* glob(root: string, path: string): AsyncIterableIterator<Seeglue.GlobResult> {
  for await (const element of expandGlob(path, { globstar: true, root: root })) {
    yield { path: element.path, isFile: element.isFile, isDir: element.isDirectory }
  }
}

async function* globFiles(root: string, path: string): AsyncIterableIterator<string> {
  for await (const element of expandGlob(path, { globstar: true, root: root, includeDirs: false })) {
    yield element.path;
  }
}

async function readJson<T>(path: string | URL): Promise<T> {
  return (await import(path.toString(), { with: { type: "json" } })).default as T;
}

type ObjectCache = Record<string, number>;

if (import.meta.main) {
  const fileName = resolve(Deno.cwd(), Deno.args.length > 0
    ? Deno.args[0]
    : "seeglue.ts");
  const root = dirname(fileName);
  Deno.chdir(root);

  const metaRoot = resolve(root, ".seeglue");
  const metaBuild = resolve(metaRoot, "build");
  await ensureDir(metaRoot);
  await ensureDir(metaBuild);

  const objCacheUrl = toFileUrl(resolve(metaRoot, "objCache.json"));
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

  const module: { default: Seeglue.BuildFunc } = await import(toFileUrl(fileName).toString());

  const buildEnv: Seeglue.BuildEnv = {
    projectRoot: root,
    
    compile: {
      flags: {},
      srcFiles: new Set()
    },

    link: {
      flags: {},
      incFolders: new Set(),
      libFiles: new Set()
    },

    glob: glob.bind({}, root),
    globFiles: globFiles.bind({}, root)
  };

  await module.default(buildEnv);

  // TODO: Parallelize?
  const freshFiles: { file: string, cachePath: string, mtime: number}[] = [];
  for (const file of buildEnv.compile.srcFiles) {
    const parsed = parse(relative(common([root, file]), file));
    const cachePath = join(parsed.dir, parsed.name).replaceAll("\\", "/");
    const mtime = (await Deno.stat(file)).mtime!.getTime();

    if (!(cachePath in objCache) || mtime > objCache[cachePath])
    {
      freshFiles.push({ file: file, cachePath: cachePath, mtime: mtime });
    }
  }

  console.log(freshFiles);

  console.log(buildEnv);
}
