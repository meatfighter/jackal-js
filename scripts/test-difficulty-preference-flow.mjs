import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function source(relativePath) {
    return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function methodBody(text, marker) {
    const markerIndex = text.indexOf(marker);
    assert.notEqual(markerIndex, -1, `Missing method marker: ${marker}`);
    const openIndex = text.indexOf("{", markerIndex);
    assert.notEqual(openIndex, -1, `Missing method body: ${marker}`);
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        if (text[i] === "{") {
            depth++;
        } else if (text[i] === "}") {
            depth--;
            if (depth === 0) {
                return text.slice(openIndex + 1, i);
            }
        }
    }
    throw new Error(`Unterminated method body: ${marker}`);
}

const tsPreferences = source("pwa/src/app/AppPreferences.ts");
const tsIntro = source("pwa/src/jackal/IntroMode.ts");
const tsDifficulty = source("pwa/src/jackal/DifficultyMode.ts");
const tsMain = source("pwa/src/jackal/Main.ts");
const tsStateFields = source("pwa/src/jackal/persistence/GameStateFields.ts");
const tsSerializer = source("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");
const javaLoading = source("desktop/src/jackal/LoadingMode.java");
const javaDifficulty = source("desktop/src/jackal/DifficultyMode.java");
const javaMain = source("desktop/src/jackal/Main.java");

test("Jackal difficulty is persisted independently for fresh Java and browser games", () => {
    assert.match(tsPreferences, /DIFFICULTY_STORAGE_KEY\s*=\s*"jackal-difficulty"/);
    assert.match(tsPreferences, /readDifficultyPreference\(\)/);
    assert.match(tsPreferences, /writeDifficultyPreference\(hardMode:\s*boolean\)/);
    assert.match(tsPreferences, /clearDifficultyPreference\(\)/);

    assert.match(tsIntro, /if \(main\.loadIndex < 42\) \{\s*main\.hardMode = readDifficultyPreference\(\);/s);
    assert.match(tsDifficulty, /this\.main\.hardMode = this\.selectedIndex === 1;\s*writeDifficultyPreference\(this\.main\.hardMode\);/s);

    assert.match(javaLoading, /main\.hardMode = java\.util\.prefs\.Preferences[\s\S]*getBoolean\("jackal-difficulty", false\)/);
    assert.match(javaDifficulty, /main\.hardMode = \(selectedIndex == 1\);[\s\S]*putBoolean\("jackal-difficulty", main\.hardMode\)/);
});

test("saved Jackal runs retain their own difficulty and restore it after mode initialization", () => {
    assert.match(tsStateFields, /"hardMode"/);

    const createModeIndex = tsSerializer.indexOf("const mode = this.createStandaloneMode(snapshot.modeId);");
    const initIndex = tsSerializer.indexOf("mode.init(main, gc);", createModeIndex);
    const restoredMainIndex = tsSerializer.indexOf("decodeFieldsInto(main, snapshot.mainFields", initIndex);
    assert.ok(createModeIndex >= 0 && initIndex > createModeIndex && restoredMainIndex > initIndex);
});

test("automatic second-loop Hard mode does not overwrite the difficulty preference", () => {
    const tsAdvance = methodBody(tsMain, "public advancePlayerToHardMode(): void");
    assert.match(tsAdvance, /this\.hardMode = true;/);
    assert.doesNotMatch(tsAdvance, /writeDifficultyPreference|jackal-difficulty/);

    const javaAdvance = methodBody(javaMain, "public void advancePlayerToHardMode()");
    assert.match(javaAdvance, /hardMode = true;/);
    assert.doesNotMatch(javaAdvance, /putBoolean|jackal-difficulty/);
});
