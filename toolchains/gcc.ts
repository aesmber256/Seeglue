import { SourceFileEntry, Toolchain } from "./toolchain.ts";
import { type DirTree } from "../main.ts";
import { resolve } from "@std/path";
import { ensureFile } from "@std/fs";

function compile(t: DirTree, b: Seeglue.BuildEnv, f: SourceFileEntry): Promise<Deno.CommandOutput> {
  if (b.compiler !== "gcc")
    throw new TypeError("expected gcc compiler");
  
  // Figure out the args
  const args = b.compile.flags.override[f.file] || [
    `-std=${b.standard}`,
    ...b.compile.flags.args
  ];
  const output = resolve(t.buildFolder, f.cachePath + ".o");
  
  // Compiler go wrooooom!
  return ensureFile(output).then(() => new Deno.Command(b.compiler!, {
    args: [
      "-c", f.file,
      ...args,
      "-o", output,
      "-fdiagnostics-color=always"
    ]
  }).output());
}

function link(t: DirTree, b: Seeglue.BuildEnv, f: string[]): Promise<Deno.CommandOutput> {
  if (b.compiler !== "gcc")
    throw new TypeError("expected gcc compiler");


}

export default {
  compileFile: compile,
  link: link,
} satisfies Toolchain