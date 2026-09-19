import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const tsIntro = readFileSync(join(rootDir, "pwa", "src", "jackal", "IntroMode.ts"), "utf8");
const javaIntro = readFileSync(join(rootDir, "desktop", "src", "jackal", "IntroMode.java"), "utf8");

test("Java and TypeScript title attribution stay centered and copyright-symbol-free", () => {
    assert.match(tsIntro, /ATTRIBUTION_TEXT: string = "2013, 2026 MEATFIGHTER\.COM"/);
    assert.match(tsIntro, /MainConstants\.DISPLAY_WIDTH - \(IntroMode\.ATTRIBUTION_TEXT\.length << 5\)/);
    assert.match(tsIntro, /ATTRIBUTION_TEXT_Y: number = 860/);
    assert.match(tsIntro, /drawString\(IntroMode\.ATTRIBUTION_TEXT, IntroMode\.ATTRIBUTION_TEXT_X, IntroMode\.ATTRIBUTION_TEXT_Y,/);
    assert.doesNotMatch(tsIntro, /© 2013, 2026 MEATFIGHTER\.COM/);
    assert.doesNotMatch(tsIntro, /COPYRIGHT_TEXT/);

    assert.match(javaIntro, /ATTRIBUTION_TEXT = "2013, 2026 MEATFIGHTER\.COM"/);
    assert.match(javaIntro, /Main\.DISPLAY_WIDTH - \(ATTRIBUTION_TEXT\.length\(\) << 5\)/);
    assert.match(javaIntro, /ATTRIBUTION_TEXT_Y = 860/);
    assert.match(javaIntro, /drawString\(ATTRIBUTION_TEXT, ATTRIBUTION_TEXT_X,/);
    assert.doesNotMatch(javaIntro, /© 2013, 2026 MEATFIGHTER\.COM/);
    assert.doesNotMatch(javaIntro, /COPYRIGHT_TEXT/);
});
