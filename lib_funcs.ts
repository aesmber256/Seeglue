import { expandGlob } from "@std/fs/expand-glob";

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