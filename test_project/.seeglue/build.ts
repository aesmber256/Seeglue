export default async function(b: Seeglue.BuildEnv) {
    b.compiler = "clang";
    b.standard = "c11";
    b.output = "app";

    for await (const file of b.globFiles("src/**/*.c")) {
        b.compile.srcFiles.add(file);
    }
};