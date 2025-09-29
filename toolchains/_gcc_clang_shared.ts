import { CompileOutput, LinkOutput, SourceFileEntry, Toolchain } from "./toolchain.ts";
import { type DirTree } from "../main.ts";
import { resolve } from "@std/path";
import { ensureFile } from "@std/fs";
import { scheduleChunk } from "../util.ts";

type CCType = "gcc" | "clang";

export default function(type: CCType): Toolchain {
    let colorFlag: string;
    switch (type) {
        case "gcc":
            colorFlag = "-fdiagnostics-color=always";
            break;

        case "clang":
            colorFlag = "-fdiagnostics-color";
            break;
    
        default:
            throw new TypeError("Unexpected compiler type");
    }
    return {
        compile: (...args) => compile(type, colorFlag, ...args),
        link: (...args) => link(type, colorFlag, ...args)
    };
}

async function compile(type: CCType, colorFlag: string, t: DirTree, b: Seeglue.BuildEnv, i: SourceFileEntry[], u: Seeglue.CompileUnit): Promise<Map<SourceFileEntry, CompileOutput>> {
    if (b.compiler !== type)
        throw new TypeError(`expected ${type} compiler`);
    const compiler = b.compilerPath || type;

    // Put the standard into the flags
    b.compile.commonFlags.push(`-std=${b.standard}`);

    let flags: string[];
    switch (u.flagsMergeStyle || "after") {
        case "after":
            flags = [...b.compile.commonFlags, ...(u.args ?? [])];
            break;

        case "before":
            flags = [...(u.args ?? []), ...b.compile.commonFlags];
            break;

        case "override":
            flags = u.args ?? [];
            break;

        default:
            throw new TypeError("Invalid flags merge style")
    }

    let includes: Set<string>;
    switch (u.includesMergeStyle || "merge") {
        case "merge":
            includes = b.compile.commonIncludes.union(u.includes ?? new Set());
            break;

        case "override":
            includes = u.includes ?? new Set()
            break;

        default:
            throw new TypeError("Invalid includes merge style")
    }

    const results: Map<SourceFileEntry, CompileOutput> = new Map();

    const buildEnvFlags: string[] = [];
    if (b.outputKind === "sharedlib") {
        buildEnvFlags.push("-fPIC");
    }

    // Compiler bus go wroom wroom
    await scheduleChunk(navigator.hardwareConcurrency, 1, i, async function(chunk) {
        const file = chunk[0];
        const output = resolve(t.buildFolder, file.cachePath + ".o");

        await ensureFile(output);
        const result = await new Deno.Command(compiler, {
            args: [
                ...buildEnvFlags,
                ...includes,
                ...flags,
                "-c", file.file,
                "-o", output,
                colorFlag
            ]
        }).output();

        results.set(file, {
            output: output,
            source: file.file,
            shell: result
        });
    });

    /*=================================================================================
                                      Here you go
    ===================================================================================
                                   ++===------=#=
                                **++=+==-----::--=+*+
                             =#***+++==------::-::-=+*
                            @%#***++===--:::::::::::::*
                           =@%#****+=-=--::.......::::--
                           =@%#****++==::..::.:...:::::-
                            %@%##****=--:::::::..:.:::::
                             %@%#*****+=-::.:-:-. ..-::
                              %@%###......:=::........:
                               -%%#**.......#:. .... .:-
                              %.:%%#*+=-:-=*#*:.::::.::.
                          @.%@@%.%%%###+===#*#=:.:::-:.=%%..%%%%%%%*
                    @@@@@@@.%@@@@.%%%%#*+**##%%***..-:.=%%%+.%%%%%%%%%%%%%%
               *@@@@@@@@@@@.%@@@@@..%@%%*+...  ....:-...%%%%%..%%%%%%%%%%%%.%
           #%%%%%%%%%@@@@@@..@@@@@@@..*@%%#+++=::::..+@.%%%%%#%..%%%%%%%%%%..#
       @@%@%%%%%%%%%%%%%@@@%.@@@@@@@@@..=. .....-+++++#.%%%#%%%##. %%%%%%%%% %#=
     +@@@..%@@%%%%%%%%%%%%@@.@@@@@@@@%@+.####%%*-=++++#.:%%%%%%%##+.%#%%%%%%..%%
    =@@@@@@%%..%%%%%%%%%%%%%..#%%%%%%%%%%.+*#@%%:+%=+=*#.%%%%%%%#%.%##%%%%#%..#%#
    @@@@@@@@%%%:.%%%%%%%%%%%%%@..#%%%%%%%%..*#@%#-%+===%.%#%%%%#%=.%%%#%#%%%..#%%
    @@@@@@@@@@@%%:.%%%%%%%%%%%%%%%.+:....  +.=@*%#=##+=+.%%%%%###.#%#%%#%###..%%%
     @@@%@@@@@@@@%@.#%%%%%%%%%%..:#--::::::-=..#**==#*==.@%#%%%%-.##%%#%%###.=%%%
     @@@@@@%@%@@@@%%.#%%%%%%%*.#===::-::::::-#%.#**+=*%+.@%%%%%%.*.. .%%%###.%%%%+
     -@@@@@@@@@@@@%%. @@%%%@.+*#*+:::::-:::.:-@@ =- ........ .. ......%#%%%. %%%%%
     -@@@@@@@@@%%@@%%-.@@@..@@..:...%...@+===-=@.. .... .............. %##%.:%%%%%#
      @@@@@@@@@@%%%%%%.. @@@%@*.. @@@.....:........   ........ ........=%%%.@%%%%%%:
      @@@@@@@@@@@@@%.-@@@@@@@.....@... .... ....... ... ... . ....... ..%%-.%%%%%%%#
      @@@@@@@@@@@..@@@@@@@@@@@*+=@@....... ............ .................%.@%%%%%%%%
     +@@@@@@@@@@@@@@@@@@@@@@@@@%%% .. ...*/ return results /*...... .. ..@.@@%%%%%%%%=
     %@@@@@@@@@@@@@@@@@@@@@@@@@@@@. .................................... .@@@@@@@@@%%%
     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@..... ..........  ...... . ..............@@@@@%%%%%%
     @@@@@@@@@@@@@@@@@@@@@@@%@@@@*....... .......... .. .... .......... ...@%%%%%%%%%%@
    -@@@@@@@@@@@@@@@@@@@@@@@@@@@@............. ..... ...................... %%%%%%%%%%%
     @@@@@@@@@@@@@@@@@@@@@@@@@..@.  .................... ... ... ........ ..*%%%%%%%%%%
      @@@@@@@@@@@@@@@@@@@@. :@@@@ .... ...... ......... ... .... ............@%%%%%%%%%
        @@@@@@@@@@@@@@@..@@@@@@@@..... ..... ........... .....................%%%%%%%%#
          +@@@@@@@%..-@@@@@@@@@@@............ ...........:+%@@@@%@%%%@@%@@@@@@%%%%%%%%@
    =================================================================================*/
}

async function link(type: CCType, colorFlag: string, _: DirTree, b: Seeglue.BuildEnv, f: string[]): Promise<LinkOutput> {
    if (b.compiler !== type)
        throw new TypeError(`expected ${type} compiler`);
    const compiler = b.compilerPath || type;

    const buildEnvFlags: string[] = [];
    if (b.outputKind === "sharedlib") {
        buildEnvFlags.push("-shared");
    }
    else if (b.outputKind === "staticlib") {
        throw new TypeError("Not implemented");
    }

    const args = [
            ...f,
            ...b.link.extraInput,
            ...b.link.libFolders,
            ...b.link.sharedLibs
    ];

    if (b.link.staticLibs.size !== 0) {
        args.push(["-Wl,--start-group", ...b.link.staticLibs, "--end-group"].join(","))
    }

    args.push(
        ...b.link.flags.args,
        "-o", b.output!,
        colorFlag
    );       

    const result = await new Deno.Command(compiler, { args: args }).output();
    return {
        output: b.output!,
        shell: result,
    };
}