import { join } from "@std/path/join";
import { DirTree, GlobalCache } from "./main.ts";
import { resolve } from "@std/path/resolve";
import { readJsonOrCreate } from "./fs_util.ts";

export async function scheduleChunk<T>(parallelism: number, chunkSize: number, input: T[], func: (chunk: T[]) => Promise<void>): Promise<void> {
    const tasks: Set<Promise<void>> = new Set();
    let idx = 0;
    while (idx < input.length) {
        if (tasks.size >= parallelism)
            await Promise.race(tasks);
        
        const slice = input.slice(idx, idx += chunkSize);
        const task = func(slice);
        tasks.add(task);
        
        task.finally(() => tasks.delete(task));
    }
    
    if (tasks.size !== 0) 
        await Promise.all(tasks);
}

export function createTree(root: string): DirTree {    
    // Get the meta directory
    const metaRoot = join(root, ".seeglue");
    
    // Get the build/cache directory
    const buildFolder = resolve(metaRoot, "build");
    
    // Get the build script
    const buildFile = resolve(metaRoot, "build.ts");
    
    // Get the cache
    const cacheFile = resolve(metaRoot, "cache.json");

    if (!import.meta.dirname)
        throw new TypeError("import.meta.dirname is null");
    
    // Return the three structure
    return {
        root: root,
        toolRoot: import.meta.dirname,
        metaRoot: metaRoot,
        buildFile: buildFile,
        cacheFile: cacheFile,
        buildFolder: buildFolder
    }
}

export async function getOrCreateGlobalCache(file: string) {
    return await readJsonOrCreate(file, { 
        buildFileMtime: -1, 
        object: Object.create(null), 
        custom: Object.create(null) 
    });
}

export function formatMicros(micros: number): string {
  const US_PER_MS = 1_000;
  const US_PER_SEC = 1_000_000;
  const US_PER_MIN = US_PER_SEC * 60;
  const US_PER_HOUR = US_PER_MIN * 60;
  const US_PER_DAY = US_PER_HOUR * 24;

  const parts: string[] = [];

  const days = Math.floor(micros / US_PER_DAY);
  if (days > 0) parts.push(`${days}d`);
  micros %= US_PER_DAY;

  const hours = Math.floor(micros / US_PER_HOUR);
  if (hours > 0) parts.push(`${hours}h`);
  micros %= US_PER_HOUR;

  const minutes = Math.floor(micros / US_PER_MIN);
  if (minutes > 0) parts.push(`${minutes}m`);
  micros %= US_PER_MIN;

  const seconds = Math.floor(micros / US_PER_SEC);
  if (seconds > 0) parts.push(`${seconds}s`);
  micros %= US_PER_SEC;

  const millis = Math.floor(micros / US_PER_MS);
  if (millis > 0) parts.push(`${millis}ms`);
  micros %= US_PER_MS;

  if (micros > 0 || parts.length === 0) {
    parts.push(`${Math.ceil(micros)}µs`);
  }

  return parts.join(" ");
}

export function spawnPowershellScript(file: string, ...args: string[]) {
    let cmd: Deno.Command;
    switch (Deno.build.os) {
        case "windows":
            cmd = new Deno.Command("cmd.exe", {
                args: [
                    "/c",
                    "start",
                    "powershell.exe",
                    "-NoProfile", 
                    "-ExecutionPolicy", "Bypass", 
                    "-File", file,
                    ...args
                ],
                stdin: "null",
                stdout: "null",
                stderr: "null",
            });
            break;
            
        default:
            throw new TypeError("Unsupported os");
    }
    cmd.spawn().unref();
}