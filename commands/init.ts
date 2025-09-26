import { exists } from "@std/fs/exists";
import { CliArgs } from "../cli_util.ts";
import { createTree } from "../util.ts";
import { fatal } from "../main.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path/join";

import gitignore from "../resource/gitignore.txt" with { type: "text" };
import lib from "../resource/lib.d.ts" with { type: "text" };
import buildFile from "../resource/build.txt" with { type: "text" };

export default async function(args: CliArgs) {
    const tree = createTree(args.root);
    if (await exists(tree.metaRoot))
        fatal(".seeglue folder already exists");

    await ensureDir(tree.metaRoot);
    await Promise.all([
        Deno.writeTextFile(join(tree.metaRoot, ".gitignore"), gitignore),
        Deno.writeTextFile(join(tree.metaRoot, "build.d.ts"), lib),
        Deno.writeTextFile(tree.buildFile, buildFile)
    ]);
}