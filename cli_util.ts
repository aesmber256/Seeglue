import { resolve } from "@std/path";
import { fatal } from "./main.ts";
import { parseArgs } from "@std/cli/parse-args";

export type CliAction = "init" | "build" | "clean" | "gen_clangd" | "hello" | "help" | "tool-delete";
export type CliVerbosity = "quiet" | "normal" | "verbose";

export type CliArgs = {
    action: CliAction,
    projectRoot: string,
    toolRoot: string,
    verbose: CliVerbosity,
    dryRun: boolean,
};

export function parseCli(): CliArgs {
    if (Deno.args.length === 0)
        return { action: "build", toolRoot: import.meta.dirname!, projectRoot: Deno.cwd(), verbose: "normal", dryRun: false }
    
    let action: CliAction;
    let idx = 1;
    switch (Deno.args[0]) {
        case "init":
        case "i":
            action = "init";
            break;
        
        case "build":
        case "b":
            action = "build";
            break;
        
        case "clean":
        case "c":
            action = "clean";
            break;

        case "help":
        case "h":
            action = "help";
            break;

        case "hello":
            action = "hello";
            break;
        
        case "clangd":
            action = "gen_clangd";
            break;

        case "tool":
            if (Deno.args.length < 2)
                fatal("Expected a sub command");
            idx = 2;

            switch (Deno.args[1]) {
                case "delete":
                    action = "tool-delete";
                    break;
            
                default:
                    fatal("Unrecognized subcommand", Deno.args[1]);
                    break;
            }
            break;
        
        default:
            fatal("Unrecognized subcommand", Deno.args[0]);
            break;
    }

    const args = parseArgs(Deno.args.slice(idx), {
        string: ["root"],
        boolean: ["verbose", "quiet", "dry-run"],
        alias: { v: "verbose", q: "quiet" },
    });
    
    // Enforce mutual exclusion
    if (args.verbose && args.quiet) {
        fatal("Can't use --quiet and --verbose together");
    }

    return {
        action: action!,
        projectRoot: resolve(Deno.cwd(), args.root ?? Deno.cwd()),
        toolRoot: import.meta.dirname!,
        verbose: args.verbose
            ? "verbose"
            : args.quiet
                ? "quiet"
                : "normal",
        dryRun: args["dry-run"]
    };
}