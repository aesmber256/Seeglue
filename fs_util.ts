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

export async function readJsonDirect<T>(path: string | URL): Promise<T> {
    return (await import(path.toString(), { with: { type: "json" } })).default as T;
}