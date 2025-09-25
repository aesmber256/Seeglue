import { type DirTree } from "../main.ts";
import gcc from "./gcc.ts";

export type SourceFileEntry = {
    file: string;
    cachePath: string;
    mtime: number;
}

export type Toolchain = {
    compileFile(tree: DirTree, env: Seeglue.BuildEnv, file: SourceFileEntry): Promise<Deno.CommandOutput>;
    link(tree: DirTree, env: Seeglue.BuildEnv, objects: string[]): Promise<Deno.CommandOutput>;
}

export function custom(compilerPath: string): Toolchain {
    throw new TypeError("Not impl");
}

export const GCC: Toolchain = gcc;
export const CLANG: Toolchain = gcc;