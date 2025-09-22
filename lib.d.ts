declare namespace Seeglue {
  // deno-lint-ignore ban-types
  type CStandardEnum = 'c89' | 'c90' | 'c99' | 'c11' | 'c17' | 'c18' | 'c23' | (`c${string}` & {});
  // deno-lint-ignore ban-types
  type CCEnum = 'gcc' | 'clang' | 'msvc' | (string & {});

  type BuildFunc = (b: BuildEnv) => PromiseLike<void> | void;

  type GlobResult = {
    path: string,
    isFile: boolean,
    isDir: boolean
  }

  type CompileEnv = {
    readonly srcFiles: Set<string>;
    readonly flags: CompileFlags;
  }

  type CompileFlags = {
    args: string[];
    override: Record<string, string[]>;
  }

  type LinkEnv = {
    readonly incFolders: Set<string>;
    readonly libFiles: Set<string>;
    readonly flags: LinkFlags;
  }

  type LinkFlags = {
    args: string[];
  }

  type BuildEnv = {
    readonly projectRoot: string;
    
    standard: CStandardEnum;
    compiler?: CCEnum;

    readonly compile: CompileEnv;
    readonly link: LinkEnv;

    glob: (path: string) => AsyncIterableIterator<GlobResult>;
    globFiles: (path: string) => AsyncIterableIterator<string>;
  }
}

