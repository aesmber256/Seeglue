import { type DirTree } from "../main.ts";
import gcc from "./gcc.ts";

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

export function custom(_compilerPath: string): Toolchain {
    throw new TypeError("Not impl");
}

export const GCC: Toolchain = gcc;
export const CLANG: Toolchain = gcc;