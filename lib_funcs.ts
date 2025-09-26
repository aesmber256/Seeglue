import { expandGlob } from "@std/fs/expand-glob";
import { ensureDir } from "@std/fs/ensure-dir";
import { ensureFile } from "@std/fs/ensure-file";
import { exists as _exists } from "@std/fs/exists";
import { stat as _stat, remove } from "./fs_util.ts";

export async function* glob(root: string, path: string): AsyncIterableIterator<Seeglue.GlobResult> {
    for await (const element of expandGlob(path, { globstar: true, root: root })) {
        yield { path: element.path, isFile: element.isFile, isDir: element.isDirectory }
    }
}

export async function* globFiles(root: string, path: string): AsyncIterableIterator<string> {
    for await (const element of expandGlob(path, { globstar: true, root: root, includeDirs: false })) {
        yield element.path;
    }
}

export async function shell(exec: string, args?: string[]): Promise<Seeglue.ShellResult> {
    const result = await new Deno.Command(exec, {
        args: args
    }).output();
    
    return {
        signal: result.signal,
        exitCode: result.code,
        success: result.success,
        stdout: result.stdout,
        stderr: result.stderr
    }
}

export async function rm(path: string) {
    await remove(path);
}

export async function mkdir(path: string) {
    await ensureDir(path);
}

export async function mkfile(path: string) {
    await ensureFile(path);
}

export async function writeText(path: string, value: string) {
    await Deno.writeTextFile(path, value, { append: false, create: true });
}

export async function appendText(path: string, value: string) {
    await Deno.writeTextFile(path, value, { append: true, create: true });
}

export async function readText(path: string) {
    try {
        return await Deno.readTextFile(path);
    } catch (err) {
        if (err instanceof Deno.errors.NotFound)
            return null;
        throw err;
    }
}

export async function writeBin(path: string, value: Seeglue.BinaryData) {
    await Deno.writeFile(path, value, { append: false, create: true });
}

export async function appendBin(path: string, value: Seeglue.BinaryData) {
    await Deno.writeFile(path, value, { append: true, create: true });
}

export async function readBin(path: string) {
    try {
        return await Deno.readFile(path);
    } catch (err) {
        if (err instanceof Deno.errors.NotFound)
            return null;
        throw err;
    }
}

export async function exists(path: string, kind?: Seeglue.FileKind) {
    return await _exists(path, kind);
}

export function stat(path: string) {
    return _stat(path);
}