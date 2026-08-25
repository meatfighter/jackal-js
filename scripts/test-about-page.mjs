import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderAboutMarkdown } from "./about-markdown.mjs";
import { rootDir } from "./build-utils.mjs";
import { test } from "node:test";

const aboutDir = join(rootDir, "about");
const contentMarkdown = readFileSync(join(aboutDir, "content.md"), "utf8");
const indexTemplate = readFileSync(join(aboutDir, "index.html"), "utf8");
const styles = readFileSync(join(aboutDir, "styles.css"), "utf8");
const themeScript = readFileSync(join(aboutDir, "theme.js"), "utf8");
const buildAboutSource = readFileSync(new URL("./build-about.mjs", import.meta.url), "utf8");

const desktopZipProse = `The Java desktop version is available as a [desktop ZIP](__DESKTOP_ZIP__). Download and extract the ZIP, then run the launcher for your operating system:

- Windows: \`run-windows.cmd\`
- Linux: \`run-linux.sh\`
- macOS: \`run-macos.sh\`

Java 21 or newer is required.`;

function renderedAboutFixture() {
    return renderAboutMarkdown(
        contentMarkdown
            .replaceAll("__PWA_URL__", "pwa/?v=test-build")
            .replaceAll("__SCREENSHOT_IMAGE__", "assets/jackal-screenshot.png?v=test-build")
            .replaceAll("__REPO_URL__", "https://github.com/meatfighter/jackal-js")
            .replaceAll("__DESKTOP_ZIP__", "downloads/jackal-desktop.zip?v=test-build")
    );
}

test("about Markdown content is the user-facing source of truth", () => {
    assert.match(contentMarkdown, /\[Play\]\(__PWA_URL__\)/);
    assert.match(contentMarkdown, /!\[Screenshot of Jackal gameplay\]\(__SCREENSHOT_IMAGE__\)/);
    assert.match(contentMarkdown, /\[meatfighter\/jackal-js repository\]\(__REPO_URL__\)/);
    assert.ok(contentMarkdown.includes(desktopZipProse));
    assert.doesNotMatch(contentMarkdown, /\*\*\[here\]\*\*/);
    assert.doesNotMatch(contentMarkdown, /\bTODO\b/i);
    assert.doesNotMatch(contentMarkdown, /executable JAR/i);
});

test("about Markdown renderer creates the expected article features", () => {
    const rendered = renderedAboutFixture();

    assert.match(rendered.tocHtml, /<nav class="table-of-contents" aria-label="Contents">/);
    assert.match(rendered.tocHtml, /href="#controls"/);
    assert.match(rendered.articleHtml, /<h2 id="controls">/);
    assert.match(rendered.articleHtml, /data-copy-url="#controls"/);
    assert.match(rendered.articleHtml, /class="play-button" href="pwa\/\?v=test-build"/);
    assert.match(rendered.articleHtml, /class="article-figure"><img src="assets\/jackal-screenshot\.png\?v=test-build"/);
    assert.match(rendered.articleHtml, /<div class="table-wrap"><table>/);
    assert.match(rendered.articleHtml, /href="https:\/\/github\.com\/meatfighter\/jackal-js"/);
    assert.doesNotMatch(rendered.articleHtml, /target="_blank"/);
    assert.doesNotMatch(rendered.articleHtml, /<h1\b/);
    assert.ok(rendered.headings.some((heading) => heading.slug === "hard-mode" && heading.level === 2));
});

test("about page shell carries SEO, theme, footer, and generated-content placeholders", () => {
    assert.match(indexTemplate, /<link rel="canonical" href="__CANONICAL_URL__" \/>/);
    assert.match(indexTemplate, /<meta property="og:image" content="__SOCIAL_IMAGE_URL__" \/>/);
    assert.match(indexTemplate, /<meta name="twitter:card" content="summary_large_image" \/>/);
    assert.match(indexTemplate, /src=".\/__TITLE_IMAGE__"/);
    assert.match(indexTemplate, /__TOC_HTML__/);
    assert.match(indexTemplate, /__ARTICLE_HTML__/);
    assert.match(indexTemplate, /CC BY-SA 4\.0/);
    assert.match(indexTemplate, /<script src=".\/theme\.js\?v=__BUILD_STAMP_ENCODED__"><\/script>/);
    assert.match(styles, /\.play-button/);
    assert.match(themeScript, /jackal-about-theme/);
});

test("about build uses constrained Markdown and stable public repository link", () => {
    assert.match(buildAboutSource, /content\.md/);
    assert.match(buildAboutSource, /renderAboutMarkdown/);
    assert.match(buildAboutSource, /https:\/\/github\.com\/meatfighter\/jackal-js/);
    assert.doesNotMatch(buildAboutSource, /releaseSourceUrlEnv/);
    assert.doesNotMatch(buildAboutSource, /__SOURCE_URL__/);
});

test("about title and screenshot assets live with the about page source", () => {
    assert.equal(existsSync(join(aboutDir, "assets", "title.png")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "jackal-screenshot.png")), true);
    assert.equal(existsSync(join(rootDir, "title.png")), false);
    assert.equal(existsSync(join(rootDir, "jackal-screenshot.png")), false);
});
