import { resolve } from "@std/path";
import { fatal } from "./main.ts";
import { parseArgs } from "@std/cli/parse-args";

export type CliAction = "init" | "build" | "clean" | "gen_clangd" | "hello" | "help";
export type CliVerbosity = "quiet" | "normal" | "verbose";

export type CliArgs = {
    action: CliAction,
    root: string,
    verbose: CliVerbosity,
    dryRun: boolean,
};

export function parseCli(): CliArgs {
    if (Deno.args.length === 0)
        return { action: "build", root: Deno.cwd(), verbose: "normal", dryRun: false }
    
    let action: CliAction;
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
        
        default:
            fatal("Unrecognized subcommand", Deno.args[0]);
            break;
    }

    const args = parseArgs(Deno.args.slice(1), {
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
        root: resolve(Deno.cwd(), args.root ?? Deno.cwd()),
        verbose: args.verbose
            ? "verbose"
            : args.quiet
                ? "quiet"
                : "normal",
        dryRun: args["dry-run"]
    };
}