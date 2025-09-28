import { expandGlob } from "@std/fs/expand-glob";
import { ensureDir } from "@std/fs/ensure-dir";
import { ensureFile } from "@std/fs/ensure-file";
import { exists as _exists } from "@std/fs/exists";

export async function readJsonOrCreate<T>(path: string | URL, value: T): Promise<T> {
    try {
        return JSON.parse(await Deno.readTextFile(path));
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound))
            throw err;
        await Deno.writeTextFile(path, JSON.stringify(value));
        return value;
    }
}

export async function readJsonOrDefault<T>(path: string | URL, value: T): Promise<T> {
    try {
        return JSON.parse(await Deno.readTextFile(path));
    } catch (err) {
        if (!(err instanceof Deno.errors.NotFound))
            throw err;
        return value;
    }
}

export async function stat(path: string | URL) {
    try {
        return await Deno.stat(path);
    }
    catch (err) {
        if (err instanceof Deno.errors.NotFound)
            return null;
        throw err;
    }
}

export async function remove(path: string) {
    try {
        await Deno.remove(path, { recursive: true });
    } catch (err) {
        if (err instanceof Deno.errors.NotFound)
            return;
    }
}

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