import { encodeBMF } from "./BMFontTextWriter";
import { War2Font } from "./War2Font";

export * from "./types";
export * from "./War2Font";
export * from "./FontChar";
export * from "./BMFontTextWriter";
export * from "./palettes";

/**
 *
 * @param data Raw data of the Blizzard's .fnt file
 * @param fontName Name that can be user to identify font in app's font context, e.g. "font_header"
 * @param fileName Name that will be used to load image file, e.g. "font.png"
 */
export function fntToBMFontAndPixelData(
    data: ArrayBuffer,
    fontName: string,
    fileName: string,
    characterSpacing = 1,
) {
    const reader = War2Font.fromBlizzardFntBytes(data, characterSpacing);

    const BMFTextBuffer = encodeBMF({
        chars: reader.getChars().map((char) => ({
            x: char.atlasX,
            y: char.atlasY,
            width: char.width,
            height: char.height,
            id: char.charCode,
            xoffset: char.xOffset,
            yoffset: char.yOffset,
            xadvance: char.width + characterSpacing,
            page: 0,
            chnl: 15,
        })),
        pages: [fileName],
        info: {
            aa: 0,
            bold: false,
            fontName: fontName,
            fontSize: reader.getHeader().maxHeight,
            italic: false,
            outline: 0,
            padding: [0, 0, 0, 0],
            smooth: false,
            spacing: [1, 1],
            stretchH: 100, //No scaling
            unicode: false,
        },
        common: {
            alphaChnl: 0,
            redChnl: 0,
            greenChnl: 0,
            blueChnl: 0,
            scaleW: reader.getAtlasSize().width,
            scaleH: reader.getAtlasSize().height,
            pages: 1,
            packed: false,
            lineHeight: reader.getHeader().maxHeight,
            base: reader.getHeader().maxHeight,
        },
    });

    return {
        pixelData: reader.getPixelData(),
        BMFTextBuffer,
        size: reader.getAtlasSize(),
    };
}
