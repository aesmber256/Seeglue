import { exists } from "@std/fs/exists";
import { CliArgs } from "../cli_util.ts";
import { createTree } from "../util.ts";
import { fatal } from "../main.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path/join";

export default async function(args: CliArgs) {
    const tree = createTree(args.projectRoot);
    if (await exists(tree.metaRoot))
        fatal(".seeglue folder already exists");

    await ensureDir(tree.metaRoot);

    // Raw imports break the Deno LSP for some reason
    const resDir = join(tree.toolRoot, "resource");
    await Promise.all([
        readWrite(join(resDir, "gitignore.txt"), join(tree.metaRoot, ".gitignore")),
        readWrite(join(resDir, "seeglue.d.ts"), join(tree.metaRoot, "seeglue.d.ts")),
        readWrite(join(resDir, "deno.txt"), join(tree.metaRoot, "deno.d.ts")),
        readWrite(join(resDir, "build.txt"), join(tree.metaRoot, "build.ts"))
    ]);
}

async function readWrite(src: string, dst: string) {
    const content = await Deno.readTextFile(src);
    await Deno.writeTextFile(dst, content);
}