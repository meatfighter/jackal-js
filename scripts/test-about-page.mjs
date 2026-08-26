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
            .replaceAll("__REPO_URL__", "https://github.com/meatfighter/jackal-js")
            .replaceAll("__DESKTOP_ZIP__", "downloads/jackal-desktop.zip?v=test-build")
    );
}

test("about Markdown content is the user-facing source of truth", () => {
    assert.match(contentMarkdown, /\[Play\]\(__PWA_URL__\)/);
    assert.match(contentMarkdown, /\[meatfighter\/jackal-js repository\]\(__REPO_URL__\)/);
    assert.ok(contentMarkdown.includes(desktopZipProse));
    assert.doesNotMatch(contentMarkdown, /!\[Screenshot of Jackal gameplay\]/);
    assert.doesNotMatch(contentMarkdown, /\*\*\[here\]\*\*/);
    assert.doesNotMatch(contentMarkdown, /\bTODO\b/i);
    assert.doesNotMatch(contentMarkdown, /executable JAR/i);
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
    assert.match(rendered.articleHtml, /<div class="table-wrap"><table>/);
    assert.match(rendered.articleHtml, /href="https:\/\/github\.com\/meatfighter\/jackal-js"/);
    assert.doesNotMatch(rendered.articleHtml, /target="_blank"/);
    assert.doesNotMatch(rendered.articleHtml, /jackal-screenshot\.png/);
    assert.ok(rendered.headings.some((heading) => heading.slug === "hard-mode" && heading.level === 1));
});

test("about page shell carries SEO, theme, footer, and generated-content placeholders", () => {
    assert.match(indexTemplate, /<link rel="canonical" href="__CANONICAL_URL__" \/>/);
    assert.match(indexTemplate, /<meta property="og:image" content="__SOCIAL_IMAGE_URL__" \/>/);
    assert.match(indexTemplate, /<meta name="twitter:card" content="summary_large_image" \/>/);
    assert.match(indexTemplate, /href=".\/assets\/fonts\/source-sans-3\/SourceSans3VF-Upright\.ttf\.woff2\?v=__BUILD_STAMP_ENCODED__"/);
    assert.match(indexTemplate, /as="font"/);
    assert.match(indexTemplate, /<title>Jackal<\/title>/);
    assert.match(indexTemplate, /src=".\/__TITLE_IMAGE__"/);
    assert.match(indexTemplate, /__ARTICLE_HTML__/);
    assert.match(indexTemplate, /https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\/\?ref=chooser-v1/);
    assert.match(indexTemplate, /class="license-wrap"/);
    assert.match(indexTemplate, /class="license-icons"/);
    assert.match(indexTemplate, /mirrors\.creativecommons\.org\/presskit\/icons\/cc\.svg\?ref=chooser-v1/);
    assert.match(indexTemplate, /mirrors\.creativecommons\.org\/presskit\/icons\/by\.svg\?ref=chooser-v1/);
    assert.match(indexTemplate, /mirrors\.creativecommons\.org\/presskit\/icons\/sa\.svg\?ref=chooser-v1/);
    assert.match(indexTemplate, /<a href="__REPO_URL__">Source<\/a>/);
    assert.match(indexTemplate, /<a href="https:\/\/meatfighter\.com\/">Home<\/a>/);
    assert.doesNotMatch(indexTemplate, /__TOC_HTML__/);
    assert.match(styles, /\.license-wrap/);
    assert.match(styles, /\.license-icons/);
    assert.match(styles, /width: 18px;/);
    assert.match(styles, /\.site-footer \{\s+margin-top: auto;\s+background: transparent;\s+\}/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*border-top: 1px solid var\(--border\);/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*color: var\(--text\);/);
    assert.match(styles, /\.site-footer__inner \{[\s\S]*font-size: 0\.95rem;\s+line-height: 1\.6;/);
    assert.match(styles, /\.site-footer__links \{[\s\S]*font-size: 0\.95rem;\s+font-weight: 600;\s+line-height: 1\.6;/);
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
    assert.match(styles, /--bg: #111419;/);
    assert.match(styles, /--link: #0078d4;/);
    assert.match(styles, /--link-hover: #006dc1;/);
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
    assert.match(styles, /--switch-track-checked: #c7d8ec;/);
    assert.match(styles, /--switch-track-checked: #324962;/);
    assert.match(styles, /background: var\(--switch-track-checked\);/);
    assert.match(styles, /a \{\s+color: var\(--link\);\s+text-decoration: none;\s+transition: color 0\.18s ease;\s+\}/);
    assert.match(styles, /a:hover,\s+a:focus-visible \{\s+color: var\(--link-hover\);\s+\}/);
    assert.match(styles, /--play-button-bg: var\(--link\);/);
    assert.match(styles, /--play-button-bg-hover: var\(--link-hover\);/);
    assert.match(styles, /background: var\(--play-button-bg\);/);
    assert.match(styles, /background: var\(--play-button-bg-hover\);/);
    assert.match(styles, /color: var\(--play-button-text\);/);
    assert.match(styles, /position: absolute;\s+top: 1rem;\s+right: 0;\s+display: inline-flex;/);
    assert.match(styles, /site-footer__links/);
    assert.doesNotMatch(styles, /table-of-contents/);
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
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "SourceSans3VF-Upright.ttf.woff2")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "SourceSans3VF-Italic.ttf.woff2")), true);
    assert.equal(existsSync(join(aboutDir, "assets", "fonts", "source-sans-3", "LICENSE.md")), true);
    assert.equal(existsSync(join(rootDir, "title.png")), false);
    assert.equal(existsSync(join(rootDir, "jackal-screenshot.png")), false);
});
