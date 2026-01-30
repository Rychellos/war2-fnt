import * as fs from "node:fs";
import * as path from "node:path";
import { Argv, Arguments } from "yargs";
import { PNGPaletteImage } from "png-palette";
import { getPalette, War2Font } from "../index";

export const command = "pack <fnt> <image>";
export const describe = "Convert BMFont and PNG back to Blizzard .fnt format";

export const builder = (y: Argv) => {
    return y
        .positional("fnt", {
            describe: "Path to the BMFont .fnt file",
            type: "string",
            demandOption: true,
        })
        .positional("image", {
            describe: "Path to the PNG atlas image",
            type: "string",
            demandOption: true,
        })
        .option("palette", {
            alias: "p",
            describe: "Name of built-in palette or path to JSON file (array of {r,g,b,a})",
            type: "string"
        })
        .option("output", {
            alias: "o",
            describe: "Output file path",
            type: "string",
        });
};

export const handler = async (argv: Arguments<{ fnt: string; image: string; palette: string; output?: string }>) => {
    const fntPath = argv.fnt;
    const imgPath = argv.image;
    const palNameOrPath = argv.palette;
    const outputPath = argv.output || path.join(path.dirname(fntPath), "out.fnt");

    if (!fs.existsSync(fntPath)) {
        console.error("Font file not found.");
        process.exit(1);
    }

    if (!fs.existsSync(imgPath)) {
        console.error("Image file not found.");
        process.exit(1);
    }

    console.log(`Packing ${fntPath} and ${imgPath}...`);

    try {
        const bmfDesc = fs.readFileSync(fntPath, "utf-8");
        const imageBytes = fs.readFileSync(imgPath);
        const image = PNGPaletteImage.fromPngBytes(new Uint8Array(imageBytes));

        const palette = getPalette(palNameOrPath);

        const font = War2Font.fromBMFont(
            bmfDesc,
            {
                width: image.width,
                height: image.height,
                data: image.getImageData(),
            },
            palette
        );

        const binary = font.write();
        fs.writeFileSync(outputPath, binary);
        console.log(`Created: ${outputPath}`);
    } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
    }
};
