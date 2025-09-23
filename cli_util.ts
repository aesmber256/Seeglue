import { resolve, dirname } from "@std/path";

export type CliAction = "init" | "build" | "clean";

export type CliArgs = {
    action: CliAction,
    root: string
}

export function parseCli(): CliArgs | string {

  if (Deno.args.length === 0)
    return { action: "build", root: Deno.cwd()}

  let action: string;
  switch (Deno.args[0]) {
    case "init":
    case "i":
      action = "init";
      break
  
    case "build":
    case "b":
      action = "build";
      break;

    case "clean":
    case "c":
        action = "clean";
        break

    default:
      return null;
  }
}

export function getProjectRoot(): string | null {
    switch (Deno.args) {
        case value:
            
            break;
    
        default:
            break;
    }

    const metaRoot = resolve(Deno.cwd(), Deno.args.length > 0
        ? Deno.args[0]
        : ".seeglue");
}