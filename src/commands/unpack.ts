import * as fs from "node:fs";
import * as path from "node:path";
import { Argv, Arguments } from "yargs";
import { PNGPaletteImage } from "png-palette";
import { fntToBMFontAndPixelData, getPalette } from "../index";

export const command = "unpack <file>";
export const describe = "Convert a Blizzard .fnt file to BMFont and PNG atlas";

export const builder = (y: Argv) => {
    return y
        .positional("file", {
            describe: "Path to the .fnt file",
            type: "string",
            demandOption: true,
        })
        .option("output", {
            alias: "o",
            describe: "Output directory",
            type: "string",
            default: ".",
        })
        .option("name", {
            alias: "n",
            describe: "Font name to use in .fnt file",
            type: "string",
        })
        .option("spacing", {
            alias: "s",
            describe: "Character spacing in atlas",
            type: "number",
            default: 1,
        })
        .option("palette", {
            alias: "p",
            describe: "Name of built-in palette or path to JSON file (array of {r,g,b,a})",
            type: "string",
        });
};

export const handler = async (argv: Arguments<{ file: string; output: string; name?: string; spacing: number; palette?: string }>) => {
    const filePath = argv.file;
    const outputDir = argv.output;
    const fontName = argv.name || path.basename(filePath, ".fnt");
    const spacing = argv.spacing;

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Unpacking ${filePath}...`);

    try {
        const buffer = fs.readFileSync(filePath);
        const result = fntToBMFontAndPixelData(
            buffer.buffer as ArrayBuffer,
            fontName,
            `${fontName}.png`,
            spacing
        );

        // Save .fnt file
        const fntPath = path.join(outputDir, `${fontName}.fnt`);
        fs.writeFileSync(fntPath, result.BMFTextBuffer);
        console.log(`Created: ${fntPath}`);

        // Save .png file
        if (result.pixelData) {
            const lookup = getPalette(argv.palette);

            const png = new PNGPaletteImage(result.size.width, result.size.height, 8);

            // Set palette
            for (let i = 0; i < lookup.length; i++) {
                const color = lookup[i];
                png.setPaletteColor(i, color.r, color.g, color.b);
                png.setTransparency(i, color.a);
            }

            // Set pixels
            for (let y = 0; y < result.size.height; y++) {
                for (let x = 0; x < result.size.width; x++) {
                    const idx = result.pixelData[y * result.size.width + x];
                    png.setPixelPaletteIndex(x, y, idx);
                }
            }

            const pngBuffer = png.encodeToPngBytes();
            const pngPath = path.join(outputDir, `${fontName}.png`);
            fs.writeFileSync(pngPath, pngBuffer);
            console.log(`Created: ${pngPath}`);
        }
    } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
    }
};
