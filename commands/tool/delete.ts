import { resolve } from "@std/path/resolve";
import { CliArgs } from "../../cli_util.ts";

export default function(args: CliArgs) {    
    let cmd: Deno.Command;
    switch (Deno.build.os) {
        case "windows":
            cmd = new Deno.Command("powershell.exe", {
                args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resolve(args.toolRoot, "dist/scripts/uninstall.ps1")],
                stdin: "null",
                stdout: "null",
                stderr: "null",
            });
            break;
    
        default:
            throw new TypeError("Unsupported os");
    }

    console.log("Goodbye :(");
    cmd.spawn().unref();
    Deno.exit(0);
}