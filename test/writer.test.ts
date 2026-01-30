import * as fs from "node:fs";
import * as path from "node:path";
import { War2Font, fntToBMFontAndPixelData } from "../src/index";
import { test, expect, beforeAll, afterAll } from "vitest";

const testFolder = "temp_tests_writer";

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

test("Roundtrip .fnt file", () => {
    console.log("Starting Roundtrip .fnt file test...");
    const file = fs.readFileSync("test/small.war2-fnt");

    console.log("Reading original font...");
    const font1 = War2Font.fromBuffer(file.buffer as ArrayBuffer);

    console.log("Writing new font...");
    const newBuffer = font1.write();

    console.log("Reading new font...");
    const font2 = War2Font.fromBuffer(newBuffer.buffer as ArrayBuffer);

    console.log("Verifying headers...");
    expect(font1.getHeader()).toEqual(font2.getHeader());

    const chars1 = font1.getChars();
    const chars2 = font2.getChars();

    console.log(`Verifying ${chars1.length} characters...`);
    expect(chars1.length).toBe(chars2.length);

    chars1.forEach((c1) => {
        const c2 = chars2.find((c) => c.charCode === c1.charCode);
        expect(c2).toBeDefined();
        if (c2) {
            expect(c1.width).toBe(c2.width);
            expect(c1.height).toBe(c2.height);
            expect(c1.xOffset).toBe(c2.xOffset);
            expect(c1.yOffset).toBe(c2.yOffset);
            expect(c1.data).toEqual(c2.data);
        }
    });
    console.log("Roundtrip test successful.");
});

test.skip("Import from BMFont", () => {
    console.log("Starting Import from BMFont test...");
    const file = fs.readFileSync("test/small.war2-fnt");
    const font = War2Font.fromBuffer(file.buffer as ArrayBuffer);

    const lookup = [
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0xf4, g: 0xe0, b: 0x20, a: 0xff },
        { r: 208, g: 192, b: 28, a: 0xff },
        { r: 168, g: 140, b: 16, a: 0xff },
        { r: 92, g: 48, b: 0, a: 0xff },
        { r: 0, g: 0, b: 0, a: 0xff },
        { r: 0, g: 0, b: 0, a: 0 },
        { r: 0, g: 0, b: 0, a: 0 },
    ];

    const pixelData = font.getPixelData();
    if (!pixelData) throw new Error("No pixel data");

    const colorData = new Uint8Array(4 * pixelData.length);
    for (let index = 0; index < pixelData.length; index++) {
        const color = lookup[pixelData[index]] || { r: 0, g: 0, b: 0, a: 0 };
        colorData[index * 4] = color.r;
        colorData[index * 4 + 1] = color.g;
        colorData[index * 4 + 2] = color.b;
        colorData[index * 4 + 3] = color.a;
    }

    const atlasWidth = font.getAtlasSize().width;
    const atlasHeight = font.getAtlasSize().height;

    const { BMFTextBuffer } = fntToBMFontAndPixelData(
        file.buffer as ArrayBuffer,
        "test",
        "test.png",
    );
    const bmFontText = new TextDecoder().decode(BMFTextBuffer);

    const importedFont = War2Font.fromBMFont(
        bmFontText,
        { width: atlasWidth, height: atlasHeight, data: colorData },
        lookup,
    );

    const originalChars = font.getChars();
    const importedChars = importedFont.getChars();

    originalChars.forEach((origChar) => {
        const impChar = importedChars.find(
            (c) => c.charCode === origChar.charCode,
        );

        if (!impChar) {
            return;
        }

        expect(impChar.width).toBe(origChar.width);
        expect(impChar.height).toBe(origChar.height);

        // Pixel data check
        const origData = origChar.data;
        const impData = impChar.data;

        for (let i = 0; i < origData.length; i++) {
            const oVal = origData[i];
            const iVal = impData[i];

            // If oVal maps to same RGBA as iVal, it's fine.
            const oColor = lookup[oVal] || lookup[0];
            const iColor = lookup[iVal] || lookup[0];

            try {
                expect(iColor).toEqual(oColor);
            } catch (e) {
                console.log(
                    `Mismatch at Char ${origChar.charCode} (Atlas: ${origChar.atlasX}, ${origChar.atlasY}) Pixel (${i % impChar.width}, ${Math.floor(i / impChar.height)})`,
                );
                console.log(
                    `Original Val: ${oVal} -> ${JSON.stringify(oColor)}`,
                );
                console.log(
                    `Imported Val: ${iVal} -> ${JSON.stringify(iColor)}`,
                );
                throw e;
            }
        }
    });

    expect(importedFont.getHeader().maxHeight).toBe(font.getHeader().maxHeight);
    console.log("Import from BMFont test successful.");
});
