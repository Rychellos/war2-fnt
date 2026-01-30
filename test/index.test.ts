import { fntToBMFontAndPixelData, getPalette } from "../src/index";
import * as fs from "node:fs";
import * as path from "node:path";
import { PNGPaletteImage } from "png-palette";
import { test, expect, beforeAll, afterAll } from "vitest";

const testFolder = "temp_tests_index";

beforeAll(() => {
    if (!fs.existsSync(testFolder)) {
        fs.mkdirSync(testFolder);
    }
});

afterAll(() => {
    if (fs.existsSync(testFolder)) {
        fs.rmSync(testFolder, { recursive: true, force: true });
    }
});

test("Decoding .fnt file", () => {
    console.log("Starting Decoding .fnt file test...");
    const file = fs.readFileSync("test/small.war2-fnt");

    console.log("Parsing .fnt file...");
    let font:
        | {
            pixelData: Uint8Array<ArrayBuffer> | null;
            BMFTextBuffer: Uint8Array<ArrayBuffer>;
            size: {
                width: number;
                height: number;
            };
        }
        | undefined = fntToBMFontAndPixelData(file.buffer as ArrayBuffer, "small", "small", 0);

    expect(font, "Failed to parse file data").toBeDefined();

    const lookup = getPalette("gold");

    expect(font.pixelData).toBeDefined();

    console.log("Creating image with PNGPaletteImage...");
    const png = new PNGPaletteImage(font.size.width, font.size.height, 8);

    // Set palette
    for (let i = 0; i < lookup.length; i++) {
        const color = lookup[i];
        png.setPaletteColor(i, color.r, color.g, color.b);
        png.setTransparency(i, color.a);
    }

    // Set pixels
    for (let y = 0; y < font.size.height; y++) {
        for (let x = 0; x < font.size.width; x++) {
            const idx = font.pixelData![y * font.size.width + x];
            png.setPixelPaletteIndex(x, y, idx);
        }
    }

    expect(png, "Failed to create PNGPaletteImage instance").toBeDefined();

    console.log("Saving test.png...");
    const pngBuffer = png.encodeToPngBytes();
    fs.writeFileSync(path.join(testFolder, "test.png"), pngBuffer);

    expect(
        fs.existsSync(path.join(testFolder, "test.png")),
        "Failed to create .png"
    ).toBe(true);

    console.log("Saving test.fnt...");
    fs.writeFileSync(path.join(testFolder, "test.fnt"), font.BMFTextBuffer);

    expect(
        fs.existsSync(path.join(testFolder, "test.fnt")),
        "Failed to create .fnt"
    ).toBe(true);

    console.log("Decoding test successful.");
});
