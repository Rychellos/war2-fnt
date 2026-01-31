import * as fs from "node:fs";
import * as path from "node:path";
import { Argv, Arguments } from "yargs";
import { War2Font } from "../index";

export const command = "info <file>";
export const describe = "Show information about a Blizzard .fnt file";

export const builder = (y: Argv) => {
    return y.positional("file", {
        describe: "Path to the Blizzad .fnt file",
        type: "string",
        demandOption: true,
    });
};

export const handler = async (argv: Arguments<{ file: string }>) => {
    const filePath = argv.file;
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    try {
        const buffer = fs.readFileSync(filePath);
        const font = War2Font.fromBlizzardFntBytes(buffer.buffer as ArrayBuffer);
        const header = font.getHeader();
        const chars = font.getChars();

        console.log(`Font Info: ${path.basename(filePath)}`);
        console.log(`-----------------------------------`);
        console.log(`Max Height:     ${header.maxHeight}px`);
        console.log(`Glyph Count:    ${chars.length}`);

        if (chars.length > 0) {
            const codes = chars.map(c => c.charCode).sort((a, b) => a - b);
            console.log(`Code Range:     ${codes[0]} - ${codes[codes.length - 1]}`);
        }
        console.log(`-----------------------------------\n`);
    } catch (err) {
        console.error(`Error reading font: ${(err as Error).message}`);
        process.exit(1);
    }
};
