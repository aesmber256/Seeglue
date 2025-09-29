import { type DirTree } from "../main.ts";
import _gcc_clang_shared from "./_gcc_clang_shared.ts";

export type SourceFileEntry = {
    file: string;
    cachePath: string;
    mtime: number;
}

export type CompileOutput = {
    shell: Deno.CommandOutput;
    source: string;
    output: string;
}

export type LinkOutput = {
    shell: Deno.CommandOutput;
    output: string;
}

export type Toolchain = {
    compile(tree: DirTree, env: Seeglue.BuildEnv, input: SourceFileEntry[], unit: Seeglue.CompileUnit): Promise<Map<SourceFileEntry, CompileOutput>>;
    link(tree: DirTree, env: Seeglue.BuildEnv, input: string[]): Promise<LinkOutput>;
}

export const GCC: Toolchain = _gcc_clang_shared("gcc");
export const CLANG: Toolchain = _gcc_clang_shared("clang");