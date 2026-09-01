import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

async function loadAxes() {
    const source = readFileSync(new URL("../pwa/src/app/BrowserGamepadAxes.ts", import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function inputWith(valueByKey) {
    return {
        getAxisCount() {
            return 16;
        },
        getAxisValue(controller, axis) {
            const key = `${controller}:${axis}`;
            const value = valueByKey.get(key);
            if (value instanceof Error) throw value;
            return value ?? 0;
        }
    };
}

test("browser gamepad axis calibration is shared, allocation-free at read time, and recenters safely", async () => {
    const axes = await loadAxes();
    const values = new Map([["0:2", 0.8]]);
    const input = inputWith(values);
    const baselines = axes.createExtraAxisBaselines();

    assert.equal(baselines.length, axes.CONTROLLER_INDEX_LIMIT * axes.GAMEPAD_AXIS_LIMIT);
    assert.equal(axes.readCalibratedExtraAxisValue(input, baselines, 0, 2), 0, "The first observed resting value becomes the baseline.");

    values.set("0:2", 1.0);
    assert.ok(Math.abs(axes.readCalibratedExtraAxisValue(input, baselines, 0, 2) - 0.2) < 1e-12);
    values.set("0:2", 0.01);
    assert.equal(axes.readCalibratedExtraAxisValue(input, baselines, 0, 2), 0, "Near-center readings recenter without drift.");

    values.set("0:2", -0.6);
    assert.equal(axes.isAnyCalibratedAxisLessThan(input, baselines, [2], -0.5), true);
    values.set("0:2", 0.6);
    assert.equal(axes.isAnyCalibratedAxisGreaterThan(input, baselines, [2], 0.5), true);

    axes.resetExtraAxisBaselines(baselines);
    assert.equal(Number.isNaN(baselines[2]), true);
    values.set("0:2", new Error("missing controller"));
    assert.equal(axes.readCalibratedExtraAxisValue(input, baselines, 0, 2), 0);
});
