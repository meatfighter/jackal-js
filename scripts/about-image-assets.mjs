import sharp from "sharp";
import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { assertComponentReleaseOutputPath, ensureDirectory } from "./build-utils.mjs";
import { join } from "node:path";

export const titleImageWidth = 750;
export const titleImageHeight = 250;
export const titleImageSizes = "min(750px, calc(100vw - 2rem))";

const titleVariants = [
    { name: "title-750", width: 750 },
    { name: "title-1500", width: 1500 }
];

async function renderTitleVariant(sourcePath, targetPath, width, format) {
    const pipeline = sharp(sourcePath).resize({
        width,
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true
    });

    const output =
        format === "png"
            ? await pipeline.png({ adaptiveFiltering: true, compressionLevel: 9 }).toBuffer()
            : await pipeline.webp({ lossless: true, effort: 6 }).toBuffer();

    writeFileAtomic(targetPath, output);
}

export async function generateAboutImageAssets(sourceAssetsDir, outputAssetsDir) {
    const sourceTitlePath = join(sourceAssetsDir, "title.png");
    ensureDirectory(outputAssetsDir);

    for (const variant of titleVariants) {
        for (const format of ["png", "webp"]) {
            const targetPath = assertComponentReleaseOutputPath("about responsive title image output file", join(outputAssetsDir, `${variant.name}.${format}`));
            await renderTitleVariant(sourceTitlePath, targetPath, variant.width, format);
        }
    }
}
