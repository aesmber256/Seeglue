import { exists } from "@std/fs/exists";
import { CliArgs } from "../cli_util.ts";
import { createTree } from "../util.ts";
import { fatal } from "../main.ts";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path/join";

import lib from "../resource/seeglue.d.ts" with { type: "text" };

export default async function(args: CliArgs) {
    const tree = createTree(args.projectRoot);
    if (!(await exists(tree.metaRoot))) {
        fatal(".seeglue folder does not exists");
    }

    await ensureDir(tree.metaRoot);
    await Promise.all([
        Deno.writeTextFile(join(tree.metaRoot, "seeglue.d.ts"), lib),
    ]);
}