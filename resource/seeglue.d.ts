declare namespace Seeglue {
    /** Indicates a C standard */
    // deno-lint-ignore ban-types
    type CStandardEnum = 'c89' | 'c90' | 'c99' | 'c11' | 'c17' | 'c18' | 'c23' | (`c${string}` & {});

    /** Indicates a toolchain */
    type CCEnum = "gcc" | "clang"| "custom";
    
    /** Indicates the type of a resulting binary */
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
     * Represents the result of a shell command invocation
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

    /** Information about the current system */
    type SysInfo = {
        /** The [LLVM](https://llvm.org/) target triple, which is the combination
        * of `${arch}-${vendor}-${os}` and represent the specific build target that
        * the current runtime was built for. */
        target: string;
        
        /** The computer vendor that the Deno CLI was built for. */
        vendor: string;

        /** Instruction set architecture that the Deno CLI was built for. */
        arch: "x86_64" | "aarch64";

        /** The operating system that the Deno CLI was built for. `"darwin"` is
        * also known as OSX or MacOS. */
        os:
            | "darwin"
            | "linux"
            | "android"
            | "windows"
            | "freebsd"
            | "netbsd"
            | "aix"
            | "solaris"
            | "illumos";
    };

    /** Indicates a file system object's kind */
    type FileKind = {
        isFile?: boolean,
        isDirectory?: boolean
    };

    /** Contains information about a file system object */
    type FileInfo = {
        /** True if this is info for a regular file. Mutually exclusive to
        * `FileInfo.isDirectory` and `FileInfo.isSymlink`. */
        isFile: boolean;
        /** True if this is info for a regular directory. Mutually exclusive to
        * `FileInfo.isFile` and `FileInfo.isSymlink`. */
        isDirectory: boolean;
        /** True if this is info for a symlink. Mutually exclusive to
        * `FileInfo.isFile` and `FileInfo.isDirectory`. */
        isSymlink: boolean;
        /** The size of the file, in bytes. */
        size: number;
        /** The last modification time of the file. This corresponds to the `mtime`
        * field from `stat` on Linux/Mac OS and `ftLastWriteTime` on Windows. This
        * may not be available on all platforms. */
        mtime: Date | null;
        /** The last access time of the file. This corresponds to the `atime`
        * field from `stat` on Unix and `ftLastAccessTime` on Windows. This may not
        * be available on all platforms. */
        atime: Date | null;
        /** The creation time of the file. This corresponds to the `birthtime`
        * field from `stat` on Mac/BSD and `ftCreationTime` on Windows. This may
        * not be available on all platforms. */
        birthtime: Date | null;
        /** The last change time of the file. This corresponds to the `ctime`
        * field from `stat` on Mac/BSD and `ChangeTime` on Windows. This may
        * not be available on all platforms. */
        ctime: Date | null;
        /** ID of the device containing the file. */
        dev: number;
        /** Inode number.
        *
        * _Linux/Mac OS only._ */
        ino: number | null;
        /** The underlying raw `st_mode` bits that contain the standard Unix
        * permissions for this file/directory.
        */
        mode: number | null;
        /** Number of hard links pointing to this file.
        *
        * _Linux/Mac OS only._ */
        nlink: number | null;
        /** User ID of the owner of this file.
        *
        * _Linux/Mac OS only._ */
        uid: number | null;
        /** Group ID of the owner of this file.
        *
        * _Linux/Mac OS only._ */
        gid: number | null;
        /** Device ID of this file.
        *
        * _Linux/Mac OS only._ */
        rdev: number | null;
        /** Blocksize for filesystem I/O.
        *
        * _Linux/Mac OS only._ */
        blksize: number | null;
        /** Number of blocks allocated to the file, in 512-byte units.
        *
        * _Linux/Mac OS only._ */
        blocks: number | null;
        /**  True if this is info for a block device.
        *
        * _Linux/Mac OS only._ */
        isBlockDevice: boolean | null;
        /**  True if this is info for a char device.
        *
        * _Linux/Mac OS only._ */
        isCharDevice: boolean | null;
        /**  True if this is info for a fifo.
        *
        * _Linux/Mac OS only._ */
        isFifo: boolean | null;
        /**  True if this is info for a socket.
        *
        * _Linux/Mac OS only._ */
        isSocket: boolean | null;
    }
    
    /** Union of types from which can binary data be read from */
    type BinaryData = Uint8Array | ReadableStream<Uint8Array>;

    type FileSystem = {
        /** Returns all files and directories which match the provided glob */
        glob(path: string): AsyncIterableIterator<GlobResult>;

        /** Returns all files which match the provided glob */
        globFiles(path: string): AsyncIterableIterator<string>;

        /** Deletes a file or directory at the specified path (behaves like `rm -rf <path>`) */
        rm(path: string): Promise<void>;

        /** Create a directory at the specified location, creating parent directories as needed */
        mkdir(path: string): Promise<void>;

        /** Tries to create a file at the specified location. If `overwrite` is true, clears the content of the file if it exists */
        mkfile(path: string, overwrite: boolean): Promise<void>;

        /** Writes to the specified path, overwriting any existing contect. If file does not exist it is created */
        writeText(path: string, value: string): Promise<void>;

        /** Appends to the specified path, keeping any existing contect. If file does not exist it is created */
        appendText(path: string, value: string): Promise<void>;

        /** Reads from the specified path. If file does not exist returns `null` */
        readText(path: string): Promise<string | null>;

        /** Writes to the specified path, overwriting any existing contect. If file does not exist it is created */
        writeBin(path: string, value: BinaryData): Promise<void>;

        /** Appends to the specified path, keeping any existing contect. If file does not exist it is created */
        appendBin(path: string, value: BinaryData): Promise<void>;

        /** Reads from the specified path. If file does not exist returns `null` */
        readBin(path: string): Promise<Uint8Array | null>;

        /** Checks wheteher a specified file system object exists */
        exists(path: string, kind?: FileKind): Promise<boolean>;

        /** Returns information about a specific file system object. If not found returns `null` */
        stat(path: string): Promise<FileInfo | null>;
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

        /** Indicated whether or not this is a dry run invocation and not visible changes should be made */
        readonly isDryRun: boolean;
        
        /** Contains functions to interact with the file system */
        readonly fs: FileSystem;

        /** Contains information about current system */
        readonly sysInfo: SysInfo;

        /** Invokes a shell command and returns its result */
        shell(exec: string, args?: string[]): Promise<ShellResult>;
    }

    /** The default build function which is invoke by Seeglue */
    type BuildFunc = (b: BuildEnv) => PromiseLike<void> | void;

    /** 
     * The object required to be exported for a build script to function correctly 
     * 
     * @example
     * ```ts
     *  export default {
          async build(b: Seeglue.BuildEnv) {},
          async clean(b: Seeglue.BuildEnv) {}
     *  } satisfies Seeglue.BuildScript
     * ```
     */
    type BuildScript = {
        build: (b: BuildEnv) => PromiseLike<void> | void,
        clean: (b: BuildEnv) => PromiseLike<void> | void,
    }
}