const siteOrigin = "https://meatfighter.com";
const copyIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>`;
const stashMarker = "%%ABOUT_HTML_";

function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("'", "&#39;");
}

function stripInlineMarkdown(value) {
    return value
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/[*_~#]/g, "")
        .trim();
}

function normalizeSlug(value) {
    return stripInlineMarkdown(value)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function uniqueSlug(value, usedSlugs) {
    const base = normalizeSlug(value) || "section";
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
    }
    usedSlugs.add(slug);
    return slug;
}

function sanitizeUrl(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return "#";
    }

    try {
        const parsed = new URL(trimmed, `${siteOrigin}/jackal/`);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return trimmed;
        }
    } catch {
        // Fall through to the inert URL below.
    }

    return "#";
}

function stashHtml(html, stashedHtml) {
    const index = stashedHtml.push(html) - 1;
    return `${stashMarker}${index}%%`;
}

function restoreStashedHtml(value, stashedHtml) {
    return value.replace(/%%ABOUT_HTML_(\d+)%%/g, (_, index) => stashedHtml[Number(index)] ?? "");
}

function renderInlineNoLinks(value) {
    const stashedHtml = [];
    let output = value.replace(/`([^`]+)`/g, (_, code) => stashHtml(`<code>${escapeHtml(code)}</code>`, stashedHtml));
    output = escapeHtml(output);
    output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    output = output.replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>");
    output = output.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
    return restoreStashedHtml(output, stashedHtml);
}

function renderLink(label, href) {
    const sanitizedHref = sanitizeUrl(href);
    return `<a href="${escapeAttribute(sanitizedHref)}">${renderInlineNoLinks(label)}</a>`;
}

function renderInline(value) {
    const stashedHtml = [];
    let output = value.replace(/`([^`]+)`/g, (_, code) => stashHtml(`<code>${escapeHtml(code)}</code>`, stashedHtml));
    output = output.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => stashHtml(renderLink(label, href), stashedHtml));
    output = escapeHtml(output);
    output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    output = output.replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>");
    output = output.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
    return restoreStashedHtml(output, stashedHtml);
}

function isBlank(line) {
    return /^\s*$/.test(line);
}

function isFence(line) {
    return /^```/.test(line.trim());
}

function headingMatch(line) {
    return /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
}

function unorderedListMatch(line) {
    return /^\s*[-*+]\s+(.+)$/.exec(line);
}

function orderedListMatch(line) {
    return /^\s*\d+[.)]\s+(.+)$/.exec(line);
}

function parseTableRow(line) {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) {
        trimmed = trimmed.slice(1);
    }
    if (trimmed.endsWith("|")) {
        trimmed = trimmed.slice(0, -1);
    }
    return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replaceAll("\\|", "|").trim());
}

function isTableSeparator(line) {
    const cells = parseTableRow(line);
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableStart(lines, index) {
    const line = lines[index] ?? "";
    const nextLine = lines[index + 1] ?? "";
    return line.includes("|") && isTableSeparator(nextLine);
}

function isBlockStart(lines, index) {
    const line = lines[index] ?? "";
    return (
        isBlank(line) ||
        isFence(line) ||
        headingMatch(line) !== null ||
        unorderedListMatch(line) !== null ||
        orderedListMatch(line) !== null ||
        isTableStart(lines, index)
    );
}

function renderHeading(rawLevel, text, usedSlugs, headings) {
    const level = Math.min(rawLevel + 1, 6);
    const slug = uniqueSlug(text, usedSlugs);
    const plainText = stripInlineMarkdown(text);
    headings.push({ level, text: plainText, slug });
    const label = escapeAttribute(`Copy link to ${plainText}`);
    return `<h${level} id="${escapeAttribute(slug)}"><a class="heading-anchor" href="#${escapeAttribute(slug)}">${renderInline(text)}</a><button class="heading-copy" type="button" data-copy-url="#${escapeAttribute(slug)}" aria-label="${label}">${copyIconSvg}</button></h${level}>`;
}

function renderList(items, tagName) {
    return `<${tagName}>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tagName}>`;
}

function renderTable(header, rows) {
    const headerHtml = header.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("");
    const rowHtml = rows
        .map((row) => {
            const cells = header.map((_, index) => `<td>${renderInline(row[index] ?? "")}</td>`).join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    return `<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table></div>`;
}

function imageDimensions(url) {
    return url.includes("jackal-screenshot.png") ? ' width="1280" height="1200"' : "";
}

function renderImage(alt, url) {
    const sanitizedUrl = sanitizeUrl(url);
    return `<figure class="article-figure"><img src="${escapeAttribute(sanitizedUrl)}" alt="${escapeAttribute(alt)}"${imageDimensions(sanitizedUrl)} loading="lazy" decoding="async" /></figure>`;
}

function renderPlayButton(label, href) {
    const sanitizedHref = sanitizeUrl(href);
    const buttonText = stripInlineMarkdown(label) || "Play";
    const initial = buttonText.slice(0, 1);
    const rest = buttonText.slice(1);
    return `<p class="play-row"><a class="play-button" href="${escapeAttribute(sanitizedHref)}"><span class="play-button__initial">${escapeHtml(initial)}</span>${escapeHtml(rest)}</a></p>`;
}

function renderParagraph(lines) {
    const paragraph = lines.map((line) => line.trim()).join(" ");
    const playMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(paragraph);
    if (playMatch !== null && stripInlineMarkdown(playMatch[1]).toLowerCase() === "play") {
        return renderPlayButton(playMatch[1], playMatch[2]);
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(paragraph);
    if (imageMatch !== null) {
        return renderImage(imageMatch[1], imageMatch[2]);
    }

    return `<p>${renderInline(paragraph)}</p>`;
}

function renderCodeBlock(info, lines) {
    const language = info.trim().replace(/[^a-z0-9_-]/gi, "");
    const languageClass = language.length > 0 ? ` class="language-${escapeAttribute(language)}"` : "";
    const label = language.length > 0 ? language : "Code";
    return `<div class="code-block"><div class="code-block__header"><span>${escapeHtml(label)}</span><button class="copy-code" type="button" data-copy-code="" aria-label="Copy code">${copyIconSvg}</button></div><pre><code${languageClass}>${escapeHtml(lines.join("\n"))}</code></pre></div>`;
}

function renderToc(headings) {
    const visibleHeadings = headings.filter((heading) => heading.level <= 3);
    if (visibleHeadings.length === 0) {
        return "";
    }

    const items = visibleHeadings
        .map((heading) => `<li class="toc-level-${heading.level}"><a href="#${escapeAttribute(heading.slug)}">${escapeHtml(heading.text)}</a></li>`)
        .join("");

    return `<nav class="table-of-contents" aria-label="Contents"><h2>Contents</h2><ol>${items}</ol></nav>`;
}

export function renderAboutMarkdown(markdown) {
    const lines = markdown
        .replace(/^\uFEFF/, "")
        .replace(/\r\n?/g, "\n")
        .split("\n");
    const html = [];
    const headings = [];
    const usedSlugs = new Set();
    let index = 0;
    let seenHeading = false;

    while (index < lines.length) {
        const line = lines[index];

        if (isBlank(line)) {
            index += 1;
            continue;
        }

        const heading = headingMatch(line);
        if (heading !== null) {
            const rawLevel = heading[1].length;
            const headingText = heading[2].trim();
            const isSourceTitle = !seenHeading && rawLevel === 1 && stripInlineMarkdown(headingText).toLowerCase() === "about";
            seenHeading = true;
            if (!isSourceTitle) {
                html.push(renderHeading(rawLevel, headingText, usedSlugs, headings));
            }
            index += 1;
            continue;
        }

        if (isFence(line)) {
            const info = line.trim().slice(3);
            const codeLines = [];
            index += 1;
            while (index < lines.length && !isFence(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length) {
                index += 1;
            }
            html.push(renderCodeBlock(info, codeLines));
            continue;
        }

        if (isTableStart(lines, index)) {
            const header = parseTableRow(lines[index]);
            const rows = [];
            index += 2;
            while (index < lines.length && lines[index].includes("|") && !isBlank(lines[index])) {
                rows.push(parseTableRow(lines[index]));
                index += 1;
            }
            html.push(renderTable(header, rows));
            continue;
        }

        const unorderedItem = unorderedListMatch(line);
        if (unorderedItem !== null) {
            const items = [];
            while (index < lines.length) {
                const match = unorderedListMatch(lines[index]);
                if (match === null) {
                    break;
                }
                items.push(match[1]);
                index += 1;
            }
            html.push(renderList(items, "ul"));
            continue;
        }

        const orderedItem = orderedListMatch(line);
        if (orderedItem !== null) {
            const items = [];
            while (index < lines.length) {
                const match = orderedListMatch(lines[index]);
                if (match === null) {
                    break;
                }
                items.push(match[1]);
                index += 1;
            }
            html.push(renderList(items, "ol"));
            continue;
        }

        const paragraphLines = [];
        while (index < lines.length && !isBlockStart(lines, index)) {
            paragraphLines.push(lines[index]);
            index += 1;
        }
        html.push(renderParagraph(paragraphLines));
    }

    return {
        articleHtml: html.join("\n"),
        headings,
        tocHtml: renderToc(headings)
    };
}
