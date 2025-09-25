declare namespace Seeglue {
  // deno-lint-ignore ban-types
  type CStandardEnum = 'c89' | 'c90' | 'c99' | 'c11' | 'c17' | 'c18' | 'c23' | (`c${string}` & {});
  //w deno-lint-ignore ban-types
  type CCEnum = "gcc" | "clang"| "custom";// | 'msvc' | (string & {});

  type OutputType = "app" | "lib" | "custom";

  type ProcSignal = 
    | "SIGABRT" | "SIGALRM" | "SIGBREAK"  | "SIGBUS"    | "SIGCHLD" | "SIGCONT"
    | "SIGEMT"  | "SIGFPE"  | "SIGHUP"    | "SIGILL"    | "SIGINFO" | "SIGINT"
    | "SIGIO"   | "SIGPOLL" | "SIGUNUSED" | "SIGKILL"   | "SIGPIPE" | "SIGPROF" 
    | "SIGPWR"  | "SIGQUIT" | "SIGSEGV"   | "SIGSTKFLT" | "SIGSTOP" | "SIGSYS" 
    | "SIGTERM" | "SIGTRAP" | "SIGTSTP"   | "SIGTTIN"   | "SIGTTOU" | "SIGURG"
    | "SIGUSR1" | "SIGUSR2" | "SIGVTALRM" | "SIGWINCH"  | "SIGXCPU" | "SIGXFSZ";

  type ShellResult = {
    readonly exitCode: number;
    readonly success: boolean;
    readonly signal: ProcSignal | null;
    readonly stdout: Uint8Array<ArrayBuffer>;
    readonly stderr: Uint8Array<ArrayBuffer>;
  }

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
    readonly libFolders: Set<string>;
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
    compilerPath?: string;

    output?: OutputType;

    readonly incPath: Set<string>;
    readonly compile: CompileEnv;
    readonly link: LinkEnv;

    glob(path: string): AsyncIterableIterator<GlobResult>;
    globFiles(path: string): AsyncIterableIterator<string>;
    shell(exec: string, args?: string[]): Promise<ShellResult>;
  }
}