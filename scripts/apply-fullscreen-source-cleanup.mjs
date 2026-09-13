import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const targetPath = "pwa/src/jackal/Main.ts";
let source = readFileSync(targetPath, "utf8");

for (const [text, label] of [
    ["    BufferUtils,\n", "BufferUtils import"],
    ["    CursorLoader,\n", "CursorLoader import"],
    ["    Mouse,\n", "Mouse import"],
    ["    type Cursor,\n", "Cursor type import"]
]) {
    source = replaceTextExactlyOnce(source, text, "", label);
}

source = replaceExactlyOnce(
    source,
    /\ninterface BrowserFullscreenController \{\n    isFullscreen\(\): boolean;\n    enterFullscreen\(\): void;\n    exitFullscreen\(\): void;\n\}\n/,
    "\n",
    "BrowserFullscreenController type"
);
source = replaceExactlyOnce(source, /\n    public nativeCursor: Cursor \| null = null;/, "", "nativeCursor field");
source = replaceExactlyOnce(source, /\n    public hiddenCursor: Cursor \| null = null;/, "", "hiddenCursor field");
source = replaceExactlyOnce(
    source,
    /\n    public browserFullscreenController: BrowserFullscreenController \| null = null;/,
    "",
    "browserFullscreenController field"
);
source = replaceExactlyOnce(source, /\n            this\.fullScreenToggleCheck\(gc\);/, "", "fullScreenToggleCheck call");
source = replaceExactlyOnce(
    source,
    /\n    private fullScreenToggleCheck\(gc: GameContainer\): void \{[\s\S]*?\n    \}\n(?=\n    public render)/,
    "\n",
    "fullScreenToggleCheck method"
);
source = replaceExactlyOnce(
    source,
    /\n    private showMouseCursor\(\): void \{[\s\S]*?\n    \}\n\n    private hideMouseCursor\(\): void \{[\s\S]*?\n    \}\n(?=\n    public drawNumber)/,
    "\n",
    "translated cursor fullscreen helpers"
);
source = replaceExactlyOnce(source, /\n        this\.browserFullscreenController = null;/, "", "browser fullscreen disposal line");

for (const forbidden of [
    "BrowserFullscreenController",
    "browserFullscreenController",
    "fullScreenToggleCheck",
    "showMouseCursor",
    "hideMouseCursor",
    "CursorLoader",
    "BufferUtils",
    "Mouse.",
    "nativeCursor",
    "hiddenCursor"
]) {
    if (source.includes(forbidden)) {
        throw new Error(`Cleanup incomplete: ${forbidden} still exists in ${targetPath}`);
    }
}

writeFileSync(targetPath, source);
unlinkSync(fileURLToPath(import.meta.url));
console.log(`Removed obsolete PWA fullscreen/cursor machinery from ${targetPath}; cleanup helper deleted itself.`);

function replaceExactlyOnce(text, pattern, replacement, label) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    const matches = [...text.matchAll(globalPattern)];
    if (matches.length !== 1) {
        throw new Error(`Expected exactly one ${label}; found ${matches.length}. Source was not modified.`);
    }
    return text.replace(pattern, replacement);
}

function replaceTextExactlyOnce(text, search, replacement, label) {
    const first = text.indexOf(search);
    const last = text.lastIndexOf(search);
    if (first < 0 || first !== last) {
        const count = first < 0 ? 0 : 2;
        throw new Error(`Expected exactly one ${label}; found ${count === 0 ? 0 : "multiple"}. Source was not modified.`);
    }
    return text.replace(search, replacement);
}
