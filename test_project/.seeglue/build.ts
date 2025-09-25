export default async function(b: Seeglue.BuildEnv) {
    b.compiler = "gcc";
    b.standard = "c11";
    b.output = "out.exe";
    b.outputKind = "app";

    const unit: Seeglue.CompileUnit = {
        input: new Set()
    };

    for await (const file of b.globFiles("src/**/*.c")) {
        unit.input.add(file);
    }

    b.compile.units.add(unit);
};