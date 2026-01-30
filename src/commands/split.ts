import * as fs from "node:fs";
import * as path from "node:path";
import { Argv, Arguments } from "yargs";
import { PNGPaletteImage } from "png-palette";
import { War2Font, getPalette } from "../index";

export const command = "split <file>";
export const describe = "Extract each character into a separate PNG file";

export const builder = (y: Argv) => {
    return y
        .positional("file", {
            describe: "Path to the Blizzard .fnt file",
            type: "string",
            demandOption: true,
        })
        .option("output", {
            alias: "o",
            describe: "Output directory",
            type: "string",
            demandOption: true,
        })
        .option("palette", {
            alias: "p",
            describe: "Name of built-in palette or path to JSON file (array of {r,g,b,a})",
            type: "string",
        });
};

export const handler = async (argv: Arguments<{ file: string; output: string; palette?: string }>) => {
    const filePath = argv.file;
    const outputDir = argv.output;

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Splitting ${filePath} into ${outputDir}...`);

    try {
        const buffer = fs.readFileSync(filePath);
        const font = War2Font.fromBuffer(buffer.buffer as ArrayBuffer);
        const chars = font.getChars();

        const metadata = {
            charSpacing: 1,
            glyphs: [] as any[]
        };

        const lookup = getPalette(argv.palette);

        for (const char of chars) {
            metadata.glyphs.push({
                id: char.charCode,
                xOffset: char.xOffset,
                yOffset: char.yOffset,
                width: char.width,
                height: char.height
            });

            if (char.width > 0 && char.height > 0) {
                const png = new PNGPaletteImage(char.width, char.height, 8);

                // Set palette
                for (let i = 0; i < lookup.length; i++) {
                    const color = lookup[i];
                    png.setPaletteColor(i, color.r, color.g, color.b);
                    png.setTransparency(i, color.a);
                }

                // Set pixels
                for (let py = 0; py < char.height; py++) {
                    for (let px = 0; px < char.width; px++) {
                        const idx = char.data[py * char.width + px];
                        png.setPixelPaletteIndex(px, py, idx);
                    }
                }

                const pngBuffer = png.encodeToPngBytes();
                fs.writeFileSync(path.join(outputDir, `char_${char.charCode}.png`), pngBuffer);
            }
        }

        fs.writeFileSync(path.join(outputDir, "metadata.json"), JSON.stringify(metadata, null, 2));
        console.log(`Split complete. Metadata and ${chars.length} glyphs saved.`);
    } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
    }
};
