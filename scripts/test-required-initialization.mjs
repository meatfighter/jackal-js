import assert from "node:assert/strict";
import test from "node:test";
import { shellSubject } from "./persistence-test-loader.mjs";
test("required font construction errors propagate", () => {
    const failure = new Error("font unavailable");
    const subject = shellSubject(
        "pwa/src/jackal/Main.ts",
        ["loadFont"],
        {
            XMLPackedSheet: class {
                constructor() {
                    throw failure;
                }
            }
        },
        "Main"
    );
    assert.throws(
        () => subject.loadFont(),
        (error) => error === failure
    );
});
for (const step of ["init", "update"]) {
    test("mode " + step + " errors propagate without advancing frame state", () => {
        const failure = new Error("mode failed");
        const events = [];
        const subject = shellSubject(
            "pwa/src/jackal/Main.ts",
            ["setMode"],
            {
                input: { clearKeyPressedRecord() {} },
                resetNextFrameTime() {
                    events.push("reset");
                }
            },
            "Main"
        );
        const mode = {
            init() {
                events.push("init");
                if (step === "init") throw failure;
            },
            update() {
                events.push("update");
                if (step === "update") throw failure;
            }
        };
        assert.throws(
            () => subject.setMode(mode, {}),
            (error) => error === failure
        );
        assert.deepEqual(events, step === "init" ? ["init"] : ["init", "update"]);
    });
}
