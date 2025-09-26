import help from "../resource/help.txt" with { type: "text" };

export default function() {
    const colorsDict: string[] = [
        "color: initial",
        "color: #81ca46ff",
        "color: #ffffffff",
        "color: #fbff04ff",
        "color: #81ca46ff",
        "color: #ffffffff",
        "color: #8d8d8dff"
    ]

    const colors: string[] = [];
    for (const match of help.matchAll(/(?<!%)%(\d)/g)) {
        colors.push(colorsDict[Number(match[1])]);
    }

    console.log(help.replaceAll(/(?<!%)%(\d)/g, "%c"), ...colors);
}