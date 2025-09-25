declare namespace Seeglue {
    /** Indicates a C standard */
    // deno-lint-ignore ban-types
    type CStandardEnum = 'c89' | 'c90' | 'c99' | 'c11' | 'c17' | 'c18' | 'c23' | (`c${string}` & {});

    /** Indicates a toolchain */
    type CCEnum = "gcc" | "clang"| "custom";
    
    /** Indicates the type of fragment */
    type OutputType = "app" | "sharedlib" | "staticlib";
    
    /** Posix process signals */
    type ProcSignal = 
        | "SIGABRT" | "SIGALRM" | "SIGBREAK"  | "SIGBUS"    | "SIGCHLD" | "SIGCONT"
        | "SIGEMT"  | "SIGFPE"  | "SIGHUP"    | "SIGILL"    | "SIGINFO" | "SIGINT"
        | "SIGIO"   | "SIGPOLL" | "SIGUNUSED" | "SIGKILL"   | "SIGPIPE" | "SIGPROF" 
        | "SIGPWR"  | "SIGQUIT" | "SIGSEGV"   | "SIGSTKFLT" | "SIGSTOP" | "SIGSYS" 
        | "SIGTERM" | "SIGTRAP" | "SIGTSTP"   | "SIGTTIN"   | "SIGTTOU" | "SIGURG"
        | "SIGUSR1" | "SIGUSR2" | "SIGVTALRM" | "SIGWINCH"  | "SIGXCPU" | "SIGXFSZ";
    
    /**
     * Represents the result of invoke a shell command
     */
    type ShellResult = {
        /** The exit code of the invocation */
        readonly exitCode: number;

        /** Whether or not the invocation was successful. Equivalent to `exitCode === 0` */
        readonly success: boolean;

        /** Imma be real idk when a signal is set, but when something something signal, it will be here */
        readonly signal: ProcSignal | null;

        /** The standard output */
        readonly stdout: Uint8Array<ArrayBuffer>;
        
        /** The standard error */
        readonly stderr: Uint8Array<ArrayBuffer>;
    }
    
    /** The default build function which is invoke by Seeglue */
    type BuildFunc = (b: BuildEnv) => PromiseLike<void> | void;
    
    /** Merging strategy for flags */
    type FlagMergeStyle = "before" | "after" | "override";

    /** Merging strategy for include directories */
    type IncludeMergeStyle = "merge" | "override";
    
    /**
     * Represents a result entry from globbing
     */
    type GlobResult = {
        /** The absolute path of the entry */
        path: string,

        /** Indicates whether or not this entry is a file. Mutually exclusive with {@link GlobResult.isDir} */
        isFile: boolean,

        /** Indicates whether or not this entry is a directory. Mutually exclusive with {@link GlobResult.isFile} */
        isDir: boolean
    }
    
    /**
    * Configuration for the compilation stage
    */
    type CompileEnv = {
        /** Paths to include for header resolution (`-I` in gcc) */
        readonly commonIncludes: Set<string>;
        
        /** A set of flags to use for default compilation and override flags if allowed */
        commonFlags: string[];
        
        /** List of compile units. Note that each unit might result in an invocation of the compiler */
        readonly units: Set<CompileUnit>;
    }
    
    /** Specifies overrides for common flags for certain files */
    type CompileUnit = {
        /** Files to compile using these flags */
        readonly input: Set<string>;
        
        /** Paths to include for header resolution (`-I` in gcc) */
        readonly includes?: Set<string>;
        
        /** Actual flags to pass along */
        readonly args?: string[];
        
        /** How to merge this unit's flags and common flags */
        readonly flagsMergeStyle?: FlagMergeStyle;
        
        /** How to merge this unit's includes and common includes */
        readonly includesMergeStyle?: IncludeMergeStyle;
    }
    
    /**
    * Configuration for the linking stage
    */
    type LinkEnv = {
        /** Appends extra files after the files from compilation */
        readonly extraInput: Set<string>;
        
        /** Library paths to use (`-L` for gcc) */
        readonly libFolders: Set<string>;
        
        /** Shared library names to use (`-l` for gcc) */
        readonly sharedLibs: Set<string>;
        
        /** Static library names to use (`-Wl,--start-group,-l<name>,...,--end-group` for gcc) */
        readonly staticLibs: Set<string>;
        
        /** Custom flags */
        readonly flags: LinkFlags;
    }
    
    /**
     * Configuration for the linking stage
     */
    type LinkFlags = {
        /** Flags which are passed to the linker */
        readonly args: string[];

        /** How to merge this configuration's flags with the common flags specified by the toolchain */
        mergeStyle: FlagMergeStyle;
    }
    
    type BuildEnv = {
        /** The root directory against which all other files are resolved */
        readonly projectRoot: string;
        
        /** Indicated as to which C standard to conform to */
        standard: CStandardEnum;
        
        /** Selects the compiler toolchain to use */
        compiler?: CCEnum;
        
        /** If not null, specifies which executable to use instead of an alias */
        compilerPath?: string;
        
        /** What kind of file to generate */
        outputKind?: OutputType;
        
        /** The path of the file being generated */
        output?: string;

        /** Compilation step configuration */
        readonly compile: CompileEnv;
        
        /** Link step configuration */
        readonly link: LinkEnv;
        
        /** Custom cache which is persisted between runs */
        readonly cache: Record<string, number>;
        
        /** Returns all files and directories which match the provided glob */
        glob(path: string): AsyncIterableIterator<GlobResult>;

        /** Returns all files which match the provided glob */
        globFiles(path: string): AsyncIterableIterator<string>;

        /** Invokes a shell command and returns its result */
        shell(exec: string, args?: string[]): Promise<ShellResult>;
    }
}