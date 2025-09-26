import { CliArgs } from "../cli_util.ts";
import { readJsonOrDefault, remove } from "../fs_util.ts";
import { GlobalCache } from "../main.ts";
import { createTree } from "../util.ts";
import { defaultBuildEnv, invokeBuildFunction } from "./build.ts";

export default async function(args: CliArgs) {
    const tree = createTree(args.projectRoot);

    const customCache = (await readJsonOrDefault<GlobalCache | null>(tree.cacheFile, null))?.custom ?? Object.create(null);
    const buildEnv = defaultBuildEnv(tree.root, args.dryRun, customCache);

    await invokeBuildFunction(tree.buildFile, "clean", buildEnv);

    if (args.dryRun)
        return;
    
    await Promise.all([
        remove(tree.buildFolder),
        remove(tree.cacheFile)
    ]);
}