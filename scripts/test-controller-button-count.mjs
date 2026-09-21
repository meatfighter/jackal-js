import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

test("HumanInput scans only physical buttons reported by each controller", () => {
    const source = read("pwa/src/jackal/HumanInput.ts");

    assert.doesNotMatch(source, /GAMEPAD_BUTTON_INDEX_LIMIT/);
    assert.match(source, /const buttonCount = this\.input\.getButtonCount\(controller\);/);
    assert.match(source, /for \(let button = 0; button < buttonCount; button\+\+\)/);
    assert.match(source, /!this\.input\.isControllerButtonDirectional\(button, controller\) && !this\.isMappedDirectionButton\(button\)/);
});
