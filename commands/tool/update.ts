import { resolve } from "@std/path/resolve";
import { CliArgs } from "../../cli_util.ts";
import { spawnPowershellScript } from "../../util.ts";

export default function(args: CliArgs) {    
    switch (Deno.build.os) {
        case "windows":
            throw new TypeError("Not impl");
            spawnPowershellScript(resolve(args.toolRoot, "dist/scripts/update.ps1"));
            break;
    
        default:
            throw new TypeError("Unsupported os");
    }
    Deno.exit(0);
}