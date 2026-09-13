import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mainPath = "pwa/src/jackal/Main.ts";
const currentVersionTestPath = "scripts/test-game-state-current-version.mjs";
const savePreservationTestPath = "scripts/test-game-state-save-preservation.mjs";
const parityExceptionsPath = "scripts/java-ts-parity-exceptions.json";
let mainSource = readFileSync(mainPath, "utf8");
let currentVersionTestSource = readFileSync(currentVersionTestPath, "utf8");
let savePreservationTestSource = readFileSync(savePreservationTestPath, "utf8");
const parityExceptions = JSON.parse(readFileSync(parityExceptionsPath, "utf8"));

for (const [text, label] of [
    ["    BufferUtils,\n", "BufferUtils import"],
    ["    CursorLoader,\n", "CursorLoader import"],
    ["    Mouse,\n", "Mouse import"],
    ["    type Cursor,\n", "Cursor type import"]
]) {
    mainSource = replaceTextExactlyOnce(mainSource, text, "", label);
}

mainSource = replaceExactlyOnce(
    mainSource,
    /\ninterface BrowserFullscreenController \{\n    isFullscreen\(\): boolean;\n    enterFullscreen\(\): void;\n    exitFullscreen\(\): void;\n\}\n/,
    "\n",
    "BrowserFullscreenController type"
);
mainSource = replaceExactlyOnce(mainSource, /\n    public nativeCursor: Cursor \| null = null;/, "", "nativeCursor field");
mainSource = replaceExactlyOnce(mainSource, /\n    public hiddenCursor: Cursor \| null = null;/, "", "hiddenCursor field");
mainSource = replaceExactlyOnce(
    mainSource,
    /\n    public browserFullscreenController: BrowserFullscreenController \| null = null;/,
    "",
    "browserFullscreenController field"
);
mainSource = replaceExactlyOnce(mainSource, /\n            this\.fullScreenToggleCheck\(gc\);/, "", "fullScreenToggleCheck call");
mainSource = replaceExactlyOnce(
    mainSource,
    /\n    private fullScreenToggleCheck\(gc: GameContainer\): void \{[\s\S]*?\n    \}\n(?=\n    public render)/,
    "\n",
    "fullScreenToggleCheck method"
);
mainSource = replaceExactlyOnce(
    mainSource,
    /\n    private showMouseCursor\(\): void \{[\s\S]*?\n    \}\n\n    private hideMouseCursor\(\): void \{[\s\S]*?\n    \}\n(?=\n    public drawNumber)/,
    "\n",
    "translated cursor fullscreen helpers"
);
mainSource = replaceExactlyOnce(mainSource, /\n        this\.browserFullscreenController = null;/, "", "browser fullscreen disposal line");

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
    if (mainSource.includes(forbidden)) {
        throw new Error(`Cleanup incomplete: ${forbidden} still exists in ${mainPath}`);
    }
}

currentVersionTestSource = replaceExactlyOnce(
    currentVersionTestSource,
    /\n    assert\.equal\(validator\.isSupportedGameStateSnapshot\(modeSnapshot\(fields, currentVersion - 1\)\), false\);/,
    "",
    "previous-version save fixture"
);
if (currentVersionTestSource.includes("currentVersion - 1")) {
    throw new Error(`Old development save-version fixture still exists in ${currentVersionTestPath}`);
}

savePreservationTestSource = replaceTextExactlyOnce(
    savePreservationTestSource,
    'test("game-state inspection never deletes future, obsolete, unsupported, or malformed data", async () => {',
    'test("game-state inspection never deletes future, unsupported, or malformed data", async () => {',
    "save-inspection test title"
);
savePreservationTestSource = replaceExactlyOnce(
    savePreservationTestSource,
    /\n        JSON\.stringify\(\{ version: 5, kind: "game", supported: true \}\),\n        JSON\.stringify\(\{ version: currentGameStateVersion - 1, kind: "game", supported: false \}\),/,
    "",
    "obsolete save-version fixtures"
);
if (/\bversion:\s*5\b|currentGameStateVersion - 1/.test(savePreservationTestSource)) {
    throw new Error(`Old development save-version fixture still exists in ${savePreservationTestPath}`);
}

addParityException(
    parityExceptions.fieldExceptions,
    "Main.nativeCursor",
    "The Java desktop keeps native cursor state for its legacy fullscreen lifecycle; browser cursor/fullscreen presentation is owned by the PWA shell."
);
addParityException(
    parityExceptions.fieldExceptions,
    "Main.hiddenCursor",
    "The Java desktop keeps a hidden cursor for its legacy fullscreen lifecycle; browser cursor/fullscreen presentation is owned by the PWA shell."
);
addParityException(
    parityExceptions.methodExceptions,
    "Main.fullScreenToggleCheck",
    "Java retains legacy Space/Escape desktop fullscreen polling; the browser PWA shell owns fullscreen and menu transitions."
);
addParityException(
    parityExceptions.methodExceptions,
    "Main.showMouseCursor",
    "Java desktop cursor restoration is part of its legacy fullscreen lifecycle; browser presentation is owned by the PWA shell."
);
addParityException(
    parityExceptions.methodExceptions,
    "Main.hideMouseCursor",
    "Java desktop cursor hiding is part of its legacy fullscreen lifecycle; browser presentation is owned by the PWA shell."
);

writeFileSync(mainPath, mainSource);
writeFileSync(currentVersionTestPath, currentVersionTestSource);
writeFileSync(savePreservationTestPath, savePreservationTestSource);
writeFileSync(parityExceptionsPath, `${JSON.stringify(parityExceptions, null, 4)}\n`);
unlinkSync(fileURLToPath(import.meta.url));
console.log(
    "Removed obsolete Jackal PWA fullscreen/cursor machinery and pre-release save-schema fixtures, documented the intentional Java/PWA parity boundary, and deleted the cleanup helper."
);

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

function addParityException(table, key, reason) {
    if (table === null || typeof table !== "object" || Array.isArray(table)) {
        throw new Error(`Invalid parity exception table while adding ${key}.`);
    }
    if (Object.prototype.hasOwnProperty.call(table, key)) {
        throw new Error(`Parity exception already exists for ${key}; cleanup assumptions must be re-audited.`);
    }
    table[key] = { reason };
}
