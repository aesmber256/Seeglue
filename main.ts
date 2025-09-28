import { RESET, WHITE } from "./colors.ts";
import { parseCli } from "./cli_util.ts";
import build from "./commands/build.ts";
import clean from "./commands/clean.ts";
import init from "./commands/init.ts";
import help from "./commands/help.ts";
import { formatMicros } from "./util.ts";
import _delete from "./commands/tool/delete.ts";

export function fatal(...args: unknown[]) {
    console.error(...args);
    Deno.exit(1);
}

export function compileFatal() {
    console.error("*** %cCompilation failed!%c ***", "color: #d43c3c", RESET);
    Deno.exit(2);
}

export type GlobalCache = {
    object: Record<string, number>,
    custom: Record<string, number>    
}

export type DirTree = {
    // The project root
    readonly root: string,

    // The seeglue tool's root
    readonly toolRoot: string
    
    // The .seeglue folder
    readonly metaRoot: string,
    
    // The build folder containing object files
    readonly buildFolder: string,
    
    // The build.ts script file
    readonly buildFile: string,
    
    // The object cache, cache.json, file
    readonly cacheFile: string
}


if (import.meta.main) {
    const start = performance.now();
    const params = parseCli();
    switch (params.action) {
        case "build":
            await build(params);
            break;
    
        case "clean":
            await clean(params);
            break;

        case "init":
            await init(params);
            break;

        case "help":
            help();
            break;

        case "hello":
            console.log("%cHewooo! :3%c", WHITE, RESET);
            break;
        
        case "gen_clangd":
            throw new TypeError("Not impl");

        case "tool-delete":
            _delete(params);
            break;

        default:
            throw new TypeError("Invalid build action after parseCli()");
    }

    const span = (performance.now() - start) * 1000;
    console.log(
        `*** %cFinished in %c${formatMicros(span)}%c ***`, 
        WHITE, "color: #c074dfff" ,RESET);
}
