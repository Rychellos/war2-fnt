import * as fs from "node:fs";
import * as path from "node:path";
import { Argv, Arguments } from "yargs";
import { PNGPaletteImage } from "png-palette";
import { War2Font, FontChar } from "../index";

export const command = "stitch <dir>";
export const describe = "Combine individual PNG glyphs and metadata.json into a Blizzard .fnt file";

export const builder = (y: Argv) => {
    return y
        .positional("dir", {
            describe: "Directory containing glyphs and metadata.json",
            type: "string",
            demandOption: true,
        })
        .option("palette", {
            alias: "p",
            describe: "Name of built-in palette or path to JSON file (array of {r,g,b,a})",
            type: "string",
            demandOption: true,
        })
        .option("output", {
            alias: "o",
            describe: "Output file path",
            type: "string",
            demandOption: true,
        });
};

export const handler = async (argv: Arguments<{ dir: string; palette: string; output: string }>) => {
    const dir = argv.dir;
    const palPath = argv.palette;
    const outputPath = argv.output;

    const metaPath = path.join(dir, "metadata.json");

    if (!fs.existsSync(metaPath)) {
        console.error(`Metadata not found in ${dir}`);
        process.exit(1);
    }

    console.log(`Stitching glyphs from ${dir}...`);

    try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        const palette = JSON.parse(fs.readFileSync(palPath, "utf-8"));

        const fontChars = [];

        for (const glyph of metadata.glyphs) {
            const imgPath = path.join(dir, `char_${glyph.id}.png`);
            const char = new FontChar(glyph.id, glyph.width, glyph.height, glyph.xOffset, glyph.yOffset);

            if (fs.existsSync(imgPath)) {
                const imageBytes = fs.readFileSync(imgPath);
                const image = PNGPaletteImage.fromPngBytes(new Uint8Array(imageBytes));

                for (let py = 0; py < glyph.height; py++) {
                    for (let px = 0; px < glyph.width; px++) {
                        const paletteIndex = image.getPixelPaletteIndex(px, py);
                        const color = image.getPaletteColor(paletteIndex);
                        const alpha = image.getTransparency(paletteIndex) ?? 255;

                        if (!color) {
                            char.data[py * glyph.width + px] = 0;
                            continue;
                        }

                        const r = color.r;
                        const g = color.g;
                        const b = color.b;
                        const a = alpha;

                        let bestIdx = 0;
                        let bestDist = Infinity;

                        for (let pid = 0; pid < palette.length; pid++) {
                            const p = palette[pid];
                            const dist = Math.sqrt(
                                Math.pow(r - p.r, 2) +
                                Math.pow(g - p.g, 2) +
                                Math.pow(b - p.b, 2) +
                                Math.pow(a - p.a, 2)
                            );

                            if (dist < bestDist) {
                                bestDist = dist;
                                bestIdx = pid;
                            }
                        }
                        char.data[py * glyph.width + px] = bestIdx;
                    }
                }
            }
            fontChars.push(char);
        }

        const font = War2Font.fromGlyphs(fontChars, metadata.charSpacing || 1);
        const binary = font.write();

        fs.writeFileSync(outputPath, binary);
        console.log(`Created: ${outputPath}`);
    } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
    }
};
