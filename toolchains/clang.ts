import { SourceFileEntry, Toolchain } from "./toolchain.ts";
import { type DirTree } from "../main.ts";
import { resolve } from "@std/path";
import { ensureFile } from "@std/fs";

function compile(t: DirTree, b: Seeglue.BuildEnv, f: SourceFileEntry): Promise<Deno.CommandOutput> {
  if (b.compiler !== "clang")
    throw new TypeError("expected clang compiler");
  
  // Compile the source files
  const compileFlags = [
    `-std=${b.standard}`,
    ...b.compile.flags.args
  ];
  const args = b.compile.flags.override[f.file] || compileFlags;
  const output = resolve(t.buildFolder, f.cachePath + ".o");
  
  return ensureFile(output).then(() => new Deno.Command(b.compiler!, {
    args: [
      "-c", f.file,
      ...args,
      "-o", output,
      "-fdiagnostics-color"
    ]
  }).output());
}

export default {
  compileFile: compile,
  link: null!
} satisfies Toolchain