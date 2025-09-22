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