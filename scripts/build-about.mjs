import { writeFileAtomic } from "./atomic-file-utils.mjs";
import { generateAboutImageAssets, titleImageHeight, titleImageSizes, titleImageWidth } from "./about-image-assets.mjs";
import { finalizeAboutPageHtml, prepareAboutArticleHtml } from "./about-html.mjs";
import { renderAboutFooterMarkdown, renderAboutMarkdown } from "./about-markdown.mjs";
import { assertComponentReleaseOutputPath, componentReleaseDir, copyDirectory, ensureDirectory, readVersion, renderTemplate, rootDir } from "./build-utils.mjs";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";

const outputDir = assertComponentReleaseOutputPath("about release output directory", resolve(rootDir, process.argv[2] ?? join(componentReleaseDir, "web")));
const canonicalUrl = "https://meatfighter.com/jackal/";
const repoUrl = "https://github.com/meatfighter/jackal-js";
const description =
    "Play an enhanced desktop browser port of Jackal and read about its Java origins, TypeScript rewrite, controls, hard mode, and desktop ZIP download.";

function assertNoUnresolvedTokens(content, label) {
    const match = /__[A-Z][A-Z0-9_]*__/.exec(content);
    if (match !== null) {
        throw new Error(`${label} contains unresolved template token ${match[0]}.`);
    }
}

function renderCheckedTemplate(template, replacements, label) {
    const output = renderTemplate(template, replacements);
    assertNoUnresolvedTokens(output, label);
    return output;
}

await withReleaseOperationLock(async () => {
    const version = readVersion();
    const encodedBuildStamp = encodeURIComponent(version.buildStamp);
    const aboutDir = join(rootDir, "about");
    const contentMarkdown = renderCheckedTemplate(
        readFileSync(join(aboutDir, "content.md"), "utf8"),
        {
            __DESKTOP_ZIP__: `downloads/jackal-desktop.zip?v=${encodedBuildStamp}`,
            __PWA_URL__: `pwa/?v=${encodedBuildStamp}`,
            __REPO_URL__: repoUrl
        },
        "about Markdown content"
    );
    const renderedMarkdown = renderAboutMarkdown(contentMarkdown);
    const footerMarkdown = readFileSync(join(aboutDir, "footer.md"), "utf8");
    const renderedFooter = renderAboutFooterMarkdown(footerMarkdown);
    if (renderedFooter.articleHtml.trim() === "") {
        throw new Error("about/footer.md must not be empty.");
    }
    if (renderedFooter.headings.length !== 0) {
        throw new Error("about/footer.md must not contain headings.");
    }
    const pageReplacements = {
        __APP_VERSION__: version.version,
        __ARTICLE_HTML__: prepareAboutArticleHtml(renderedMarkdown),
        __BUILD_STAMP__: version.buildStamp,
        __BUILD_STAMP_ENCODED__: encodedBuildStamp,
        __CANONICAL_URL__: canonicalUrl,
        __DESCRIPTION__: description,
        __FOOTER_HTML__: renderedFooter.articleHtml,
        __REPO_URL__: repoUrl,
        __SOCIAL_IMAGE_URL__: `${canonicalUrl}assets/jackal-screenshot.png`,
        __TITLE_IMAGE_HEIGHT__: titleImageHeight,
        __TITLE_IMAGE_SIZES__: titleImageSizes,
        __TITLE_IMAGE_WIDTH__: titleImageWidth,
        __TOC_HTML__: renderedMarkdown.tocHtml,
        __TITLE_PNG_SRC__: `assets/title-750.png?v=${encodedBuildStamp}`,
        __TITLE_PNG_SRCSET__: `assets/title-750.png?v=${encodedBuildStamp} 750w, assets/title-1500.png?v=${encodedBuildStamp} 1500w`,
        __TITLE_WEBP_SRCSET__: `assets/title-750.webp?v=${encodedBuildStamp} 750w, assets/title-1500.webp?v=${encodedBuildStamp} 1500w`
    };

    const indexPath = assertComponentReleaseOutputPath("about index output file", join(outputDir, "index.html"));
    const stylesPath = assertComponentReleaseOutputPath("about styles output file", join(outputDir, "styles.css"));
    const themePath = assertComponentReleaseOutputPath("about theme output file", join(outputDir, "theme.js"));

    ensureDirectory(outputDir);
    const indexHtml = finalizeAboutPageHtml(renderCheckedTemplate(readFileSync(join(aboutDir, "index.html"), "utf8"), pageReplacements, "about index page"));
    writeFileAtomic(indexPath, indexHtml);
    writeFileAtomic(stylesPath, renderCheckedTemplate(readFileSync(join(aboutDir, "styles.css"), "utf8"), pageReplacements, "about stylesheet"));
    writeFileAtomic(themePath, renderCheckedTemplate(readFileSync(join(aboutDir, "theme.js"), "utf8"), pageReplacements, "about script"));
    copyDirectory(join(aboutDir, "assets"), join(outputDir, "assets"), { assertTargetPath: assertComponentReleaseOutputPath });
    await generateAboutImageAssets(join(aboutDir, "assets"), join(outputDir, "assets"));
    console.log("Built about page");
});
