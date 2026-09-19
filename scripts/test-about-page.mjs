import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { generateAboutImageAssets, titleImageHeight, titleImageSizes, titleImageWidth } from "./about-image-assets.mjs";
import { renderAboutFooterMarkdown, renderAboutMarkdown } from "./about-markdown.mjs";
import { rootDir } from "./build-utils.mjs";
import sharp from "sharp";
import { test } from "node:test";

const aboutDir = join(rootDir, "about");
const contentMarkdown = readFileSync(join(aboutDir, "content.md"), "utf8");
const footerMarkdown = readFileSync(join(aboutDir, "footer.md"), "utf8");
const indexTemplate = readFileSync(join(aboutDir, "index.html"), "utf8");
const styles = readFileSync(join(aboutDir, "styles.css"), "utf8");
const themeScript = readFileSync(join(aboutDir, "theme.js"), "utf8");
const buildAboutSource = readFileSync(new URL("./build-about.mjs", import.meta.url), "utf8");
const temporaryOutputDir = join(rootDir, ".release-test-about-images");

function renderedAboutFixture() {
    return renderAboutMarkdown(
        contentMarkdown
            .replaceAll("__PWA_URL__", "pwa/?v=test-build")
            .replaceAll("__REPO_URL__", "https://github.com/meatfighter/jackal-js")
            .replaceAll("__DESKTOP_ZIP__", "downloads/jackal-desktop.zip?v=test-build")
    );
}

function renderedFooterFixture() {
    return renderAboutFooterMarkdown(footerMarkdown);
}

test("about Markdown content is the user-facing source of truth", () => {
    assert.match(contentMarkdown, /\[Play\]\(__PWA_URL__\)/);
    assert.match(contentMarkdown, /\[meatfighter\/jackal-js repository\]\(__REPO_URL__\)/);
    assert.match(contentMarkdown, /\[ZIP file\]\(__DESKTOP_ZIP__\)/);
    assert.match(contentMarkdown, /- \*\*Scaling\*\* — /);
    assert.match(contentMarkdown, /- \*\*Reset\*\* — /);
    assert.match(contentMarkdown, /To use a gamepad with the Java version, connect and enable it before starting the game\./);
    assert.match(contentMarkdown, /- Windows: `run-windows\.cmd`/);
    assert.match(contentMarkdown, /- Linux: `run-linux\.sh`/);
    assert.match(contentMarkdown, /- macOS: `run-macos\.sh`/);
    assert.match(contentMarkdown, /Java 21 or newer is required\./);
    assert.doesNotMatch(contentMarkdown, /!\[Screenshot of Jackal gameplay\]/);
    assert.doesNotMatch(contentMarkdown, /\*\*\[here\]\*\*/);
    assert.doesNotMatch(contentMarkdown, /\bTODO\b/i);
    assert.doesNotMatch(contentMarkdown, /executable JAR/i);
});

test("about footer Markdown is a heading-free scoped legal source", () => {
    assert.match(footerMarkdown, /Original code, graphics, and other original material created for this project © 2013, 2026 meatfighter\.com/);
    assert.match(footerMarkdown, /third-party and preexisting game content and trademarks remain\s+the property of their respective rights holders/);
    assert.match(footerMarkdown, /Original page text is licensed under \[CC BY-SA 4\.0\]\(https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/\)/);
    assert.doesNotMatch(footerMarkdown, /^#{1,6}\s/m);
    assert.doesNotMatch(footerMarkdown, /<span\b|class=/);
    assert.doesNotMatch(footerMarkdown, /\u00a0/);
    const rendered = renderedFooterFixture();
    assert.equal((rendered.articleHtml.match(/<p>/g) ?? []).length, 1);
    assert.match(rendered.articleHtml, /<span class="site-footer__copyright">© 2013, 2026 meatfighter\.com<\/span>/);
    assert.match(
        rendered.articleHtml,
        /href="https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/" class="site-footer__license-link" target="_blank" rel="noopener noreferrer">CC BY-SA 4\.0<\/a>/
    );
    assert.equal(rendered.headings.length, 0);
    assert.equal(rendered.tocHtml, "");

    const ordinary = renderAboutMarkdown("© 2013, 2026 meatfighter.com [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)");
    assert.doesNotMatch(ordinary.articleHtml, /site-footer__/);
});

test("about Markdown renderer creates the expected article features", () => {
    const rendered = renderedAboutFixture();

    assert.match(rendered.articleHtml, /<h1 id="about">/);
    assert.match(rendered.articleHtml, /<a class="heading-link" href="#about">About<\/a>/);
    assert.match(rendered.articleHtml, /<h1 id="controls">/);
    assert.match(rendered.articleHtml, /<a class="heading-link" href="#controls">Controls<\/a>/);
    assert.match(rendered.articleHtml, /<button class="copy-link" type="button" data-copy-url="#controls"/);
    assert.match(rendered.articleHtml, /<h2 id="browser-menu">/);
    assert.match(rendered.articleHtml, /class="play-button" href="pwa\/\?v=test-build"/);
    assert.doesNotMatch(rendered.articleHtml, /class="play-button"[^>]+target="_blank"/);
    assert.match(rendered.articleHtml, /<div class="table-wrap"><table>/);
    assert.match(rendered.articleHtml, /href="https:\/\/github\.com\/meatfighter\/jackal-js" target="_blank" rel="noopener noreferrer"/);
    assert.match(rendered.articleHtml, /href="downloads\/jackal-desktop\.zip\?v=test-build" download="jackal-desktop\.zip"/);
    assert.doesNotMatch(rendered.articleHtml, /downloads\/jackal-desktop\.zip\?v=test-build" target="_blank"/);
    assert.doesNotMatch(rendered.articleHtml, /jackal-screenshot\.png/);
    assert.ok(rendered.headings.some((heading) => heading.slug === "hard-mode" && heading.level === 1));
    assert.match(rendered.tocHtml, /<nav class="toc" aria-labelledby="toc-heading">/);
    assert.match(rendered.tocHtml, /<h2 id="toc-heading">Contents<\/h2>/);
    assert.match(rendered.tocHtml, /<li class="toc-level-1"><a href="#about">About<\/a><\/li>/);
    assert.match(rendered.tocHtml, /<li class="toc-level-2"><a href="#browser-menu">Browser Menu<\/a><\/li>/);
    assert.doesNotMatch(rendered.tocHtml, /class="toc-level-3"/);
});

test("about page shell carries SEO, theme, footer, and generated-content placeholders", () => {
    assert.match(indexTemplate, /<link rel="canonical" href="__CANONICAL_URL__" \/>/);
    assert.match(indexTemplate, /<meta property="og:image" content="__SOCIAL_IMAGE_URL__" \/>/);
    assert.match(indexTemplate, /<meta name="twitter:card" content="summary_large_image" \/>/);
    assert.match(indexTemplate, /href=".\/assets\/fonts\/source-sans-3\/SourceSans3VF-Upright\.ttf\.woff2\?v=__BUILD_STAMP_ENCODED__"/);
    assert.match(indexTemplate, /as="font"/);
    assert.match(indexTemplate, /<title>Jackal<\/title>/);
    assert.match(indexTemplate, /<picture class="site-logo-picture">/);
    assert.match(indexTemplate, /type="image\/webp"/);
    assert.match(indexTemplate, /srcset=".\/__TITLE_WEBP_SRCSET__"/);
    assert.match(indexTemplate, /src=".\/__TITLE_PNG_SRC__"/);
    assert.match(indexTemplate, /srcset=".\/__TITLE_PNG_SRCSET__"/);
    assert.match(indexTemplate, /sizes="__TITLE_IMAGE_SIZES__"/);
    assert.match(indexTemplate, /width="__TITLE_IMAGE_WIDTH__"/);
    assert.match(indexTemplate, /height="__TITLE_IMAGE_HEIGHT__"/);
    assert.match(indexTemplate, /__TOC_HTML__/);
    assert.match(indexTemplate, /__ARTICLE_HTML__/);
    assert.match(indexTemplate, /__FOOTER_HTML__/);
    assert.doesNotMatch(indexTemplate, /&copy; 2013, 2026 meatfighter\.com/);
    assert.doesNotMatch(indexTemplate, /This content is licensed under/);
    assert.doesNotMatch(indexTemplate, /license-wrap|license-icons|mirrors\.creativecommons\.org/);
    assert.match(indexTemplate, /<a href="__REPO_URL__" target="_blank" rel="noopener noreferrer">Source<\/a>/);
    assert.match(indexTemplate, /<a href="https:\/\/meatfighter\.com\/">Home<\/a>/);
    assert.match(styles, /\.toc \{\s+margin: 0 0 2rem;/);
    assert.match(styles, /\.toc li:not\(:last-child\)::after \{\s+content: " \| ";/);
    assert.match(styles, /\.toc a,\s+\.toc a:visited \{\s+color: var\(--link\);\s+\}/);
    assert.match(styles, /\.toc a:hover,\s+\.toc a:focus-visible \{\s+color: var\(--link-hover\);\s+\}/);
    assert.match(styles, /\.toc \{[\s\S]*font-size: inherit;\s+line-height: inherit;/);
    assert.doesNotMatch(styles, /\.toc \.toc-level-2 a\s*\{/);
    assert.doesNotMatch(styles, /\.license-wrap|\.license-icons/);
    assert.match(styles, /\.site-footer \{\s+margin-top: auto;\s+background: transparent;\s+\}/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*padding: 0\.85rem 0 2rem;\s+border-top: 1px solid var\(--border\);/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*border-top: 1px solid var\(--border\);/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*color: var\(--text\);/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*font-family: var\(--font-ui\);\s+line-height: 1\.6;/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*align-items: flex-start;[\s\S]*gap: 1\.5rem;/);
    assert.match(styles, /\.site-footer__left \{\s+min-width: 0;\s+flex: 1 1 auto;\s+font-size: 0\.95rem;\s+\}/);
    assert.match(styles, /\.site-footer__left p \+ p \{\s+margin-top: 0\.12rem;\s+\}/);
    assert.match(styles, /\.site-footer__license-link \{\s+white-space: nowrap;\s+\}/);
    assert.match(styles, /@media \(min-width: 721px\) \{[\s\S]*\.site-footer__copyright \{\s+white-space: nowrap;\s+\}/);
    assert.match(styles, /\.site-footer__links \{[\s\S]*flex: 0 0 auto;[\s\S]*align-self: center;[\s\S]*font-weight: 600;\s+line-height: 1\.6;/);
    assert.match(styles, /\.site-footer__links \{[\s\S]*white-space: nowrap;/);
    assert.doesNotMatch(styles, /\.site-footer__links \{[^}]*font-size:/);
    assert.match(styles, /@media \(max-width: 720px\) \{[\s\S]*\.site-footer__links \{\s+margin-top: 0\.65rem;\s+text-align: center;\s+\}/);
    assert.match(indexTemplate, /<script src=".\/theme\.js\?v=__BUILD_STAMP_ENCODED__"><\/script>/);
    assert.match(styles, /\.play-button/);
    assert.match(styles, /min-width: 192px;/);
    assert.match(styles, /min-height: 48px;/);
    assert.match(styles, /border-radius: 30px;/);
    assert.match(styles, /font-family: "Source Sans 3";/);
    assert.match(styles, /SourceSans3VF-Upright\.ttf\.woff2\?v=__BUILD_STAMP_ENCODED__/);
    assert.match(styles, /SourceSans3VF-Italic\.ttf\.woff2\?v=__BUILD_STAMP_ENCODED__/);
    assert.match(styles, /--font-body: "Source Sans 3", "Segoe UI"/);
    assert.match(styles, /--bg: #f7f8fa;/);
    assert.match(styles, /--border: #e6d2a8;/);
    assert.match(styles, /--border-strong: #b5874a;/);
    assert.match(styles, /--code-bg: #f4efe4;/);
    assert.match(styles, /--inline-code-bg: #e8f3df;/);
    assert.match(styles, /--inline-code-text: #183716;/);
    assert.match(styles, /--bg: #111419;/);
    assert.match(styles, /--border: #403522;/);
    assert.match(styles, /--border-strong: #7a633b;/);
    assert.match(styles, /--code-bg: #171a14;/);
    assert.match(styles, /--inline-code-bg: #182817;/);
    assert.match(styles, /--inline-code-text: #dff1d5;/);
    assert.match(styles, /--link: #9a5514;/);
    assert.match(styles, /--link-hover: #6a390d;/);
    assert.match(styles, /--link: #f2d59d;/);
    assert.match(styles, /--link-hover: #fff0c4;/);
    assert.match(styles, /line-height: 1\.75;/);
    assert.doesNotMatch(styles, /scrollbar-color/);
    assert.doesNotMatch(styles, /::-webkit-scrollbar/);
    assert.doesNotMatch(styles, /--scrollbar-/);
    assert.doesNotMatch(styles, /--table-head/);
    assert.doesNotMatch(styles, /background: var\(--table-head\)/);
    assert.match(styles, /\.table-wrap \{\s+margin: 1rem 0;/);
    assert.match(styles, /\.article table \{\s+width: auto;\s+border-collapse: collapse;\s+font-size: inherit;\s+line-height: 1\.35;\s+\}/);
    assert.match(styles, /\.article th,\s+\.article td \{\s+padding: 0\.24rem 2\.2rem 0\.24rem 0;\s+text-align: left;\s+vertical-align: top;\s+\}/);
    assert.match(styles, /\.article th:last-child,\s+\.article td:last-child \{\s+padding-right: 0;\s+\}/);
    assert.match(styles, /\.article th \{\s+border-bottom: 1px solid var\(--border\);\s+font-weight: 700;\s+\}/);
    assert.match(styles, /--switch-track: #e5e8ec;/);
    assert.match(styles, /--switch-track-checked: #c8ced6;/);
    assert.match(styles, /--switch-border: #8a949e;/);
    assert.match(styles, /--switch-knob-border: var\(--title-shadow-gray\);/);
    assert.match(styles, /--switch-track: #2b3036;/);
    assert.match(styles, /--switch-track-checked: var\(--title-shadow-gray\);/);
    assert.match(styles, /--switch-border: #6e7681;/);
    assert.match(styles, /--switch-knob-border: #8d96a0;/);
    assert.match(styles, /background: var\(--switch-track-checked\);/);
    assert.match(styles, /a \{\s+color: var\(--link\);\s+text-decoration: none;\s+transition: color 0\.18s ease;\s+\}/);
    assert.match(styles, /a:hover,\s+a:focus-visible \{\s+color: var\(--link-hover\);\s+\}/);
    assert.match(styles, /--play-button-bg: var\(--title-jeep-green\);/);
    assert.match(styles, /--play-button-text: var\(--bg\);/);
    assert.doesNotMatch(styles, /--play-button-bg-hover/);
    assert.match(styles, /background: var\(--play-button-bg\);/);
    assert.doesNotMatch(styles, /background: var\(--play-button-bg-hover\);/);
    assert.match(styles, /color: var\(--play-button-text\);/);
    assert.match(styles, /position: absolute;\s+top: 1rem;\s+right: 0;\s+display: inline-flex;/);
    assert.match(styles, /site-footer__links/);
    assert.doesNotMatch(styles, /table-of-contents/);
    assert.match(themeScript, /jackal-about-theme/);
});

test("about build uses constrained Markdown and stable public repository link", () => {
    assert.match(buildAboutSource, /content\.md/);
    assert.match(buildAboutSource, /footer\.md/);
    assert.match(buildAboutSource, /renderAboutMarkdown/);
    assert.match(buildAboutSource, /renderAboutFooterMarkdown/);
    assert.match(buildAboutSource, /__FOOTER_HTML__/);
    assert.match(buildAboutSource, /about\/footer\.md must not be empty/);
    assert.match(buildAboutSource, /about\/footer\.md must not contain headings/);
    assert.match(buildAboutSource, /generateAboutImageAssets/);
    assert.match(buildAboutSource, /__TITLE_WEBP_SRCSET__/);
    assert.match(buildAboutSource, /__TITLE_PNG_SRCSET__/);
    assert.match(buildAboutSource, /https:\/\/github\.com\/meatfighter\/jackal-js/);
    assert.doesNotMatch(buildAboutSource, /releaseSourceUrlEnv/);
    assert.doesNotMatch(buildAboutSource, /__SOURCE_URL__/);
});

test("about title and screenshot assets live with the about page source", () => {
    assert.equal(existsSync(join(aboutDir, "footer.md")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "title.png")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "jackal-screenshot.png")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "SourceSans3VF-Upright.ttf.woff2")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "SourceSans3VF-Italic.ttf.woff2")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "LICENSE.md")), true);
    assert.equal(existsSync(join(rootDir, "title.png")), false);
    assert.equal(existsSync(join(rootDir, "jackal-screenshot.png")), false);
});

test("about responsive title images are generated with expected dimensions", async () => {
    rmSync(temporaryOutputDir, { recursive: true, force: true });

    await generateAboutImageAssets(join(aboutDir, "assets"), temporaryOutputDir);

    assert.equal(titleImageWidth, 750);
    assert.equal(titleImageHeight, 250);
    assert.equal(titleImageSizes, "min(750px, calc(100vw - 2rem))");

    const expectedDimensions = new Map([
        ["title-750.png", { width: 750, height: 250 }],
        ["title-1500.png", { width: 1500, height: 500 }],
        ["title-750.webp", { width: 750, height: 250 }],
        ["title-1500.webp", { width: 1500, height: 500 }]
    ]);

    for (const [fileName, expected] of expectedDimensions) {
        const outputPath = join(temporaryOutputDir, fileName);
        assert.equal(existsSync(outputPath), true);
        const metadata = await sharp(outputPath).metadata();
        assert.equal(metadata.width, expected.width);
        assert.equal(metadata.height, expected.height);
    }
});
