import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { JavaRandom } from "slick2d-ts";
import { rootDir } from "./build-utils.mjs";

const gameplayRoot = join(rootDir, "pwa", "src", "jackal");

async function loadJavaRuntime() {
    const runtimePath = join(rootDir, "pwa", "src", "java", "JavaRuntime.ts");
    const source = readFileSync(runtimePath, "utf8").replace(
        /^import\s+\{[^\n]+\}\s+from\s+["']slick2d-ts["'];\s*$/m,
        "const JavaRandom = globalThis.__jackalTestJavaRandom;"
    );
    globalThis.__jackalTestJavaRandom = JavaRandom;
    const testStubs = `
class BinaryReader {
    constructor(stream) {
        this.stream = stream;
    }
}
const ResourceLoader = {
    getResourceAsStream() {
        return null;
    }
};
`;

    const output = ts.transpileModule(testStubs + source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            useDefineForClassFields: false,
            sourceMap: false,
            removeComments: true
        },
        fileName: runtimePath
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function collectTypeScriptFiles(directory) {
    const result = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            result.push(...collectTypeScriptFiles(path));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
            result.push(path);
        }
    }
    return result;
}

function visitGameplay(visitor) {
    for (const path of collectTypeScriptFiles(gameplayRoot)) {
        const source = readFileSync(path, "utf8");
        const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

        function walk(node) {
            visitor(node, sourceFile, path);
            ts.forEachChild(node, walk);
        }

        walk(sourceFile);
    }
}

function callName(node) {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
        return null;
    }
    return node.expression.name.text;
}

function receiverText(node, sourceFile) {
    assert.ok(ts.isCallExpression(node));
    assert.ok(ts.isPropertyAccessExpression(node.expression));
    return node.expression.expression.getText(sourceFile);
}

test("Java numeric helpers preserve the semantics Jackal relies on", async () => {
    const runtime = await loadJavaRuntime();

    assert.equal(runtime.javaInt(12.9), 12);
    assert.equal(runtime.javaInt(-12.9), -12);
    assert.equal(runtime.javaInt(Number.NaN), 0);
    assert.equal(runtime.javaInt(Number.POSITIVE_INFINITY), 2147483647);
    assert.equal(runtime.javaInt(Number.NEGATIVE_INFINITY), -2147483648);
    assert.equal(runtime.javaInt(0x1_0000_0001n), 1);

    assert.equal(runtime.javaIntDiv(7, 3), 2);
    assert.equal(runtime.javaIntDiv(-7, 3), -2);
    assert.equal(runtime.javaIntDiv(-2147483648, -1), -2147483648);
    assert.throws(() => runtime.javaIntDiv(1, 0), /by zero/);

    assert.equal(runtime.javaByte(255), -1);
    assert.equal(runtime.javaFloat(1 / 3), Math.fround(1 / 3));
});

test("Java array helpers preserve the valid operations used by Jackal", async () => {
    const runtime = await loadJavaRuntime();

    const matrix = runtime.java2DArray(2, 3, 0);
    matrix[0][0] = 7;
    assert.deepEqual(matrix, [
        [7, 0, 0],
        [0, 0, 0]
    ]);
    assert.notEqual(matrix[0], matrix[1]);

    const nested = runtime.javaArray(2, [1, 2]);
    nested[0][0] = 9;
    assert.deepEqual(nested, [
        [9, 2],
        [1, 2]
    ]);
    assert.notEqual(nested[0], nested[1]);

    const source = [10, 11, 12, 13];
    const target = [0, 0, 0, 0, 0];
    runtime.System.arraycopy(source, 1, target, 2, 2);
    assert.deepEqual(target, [0, 0, 11, 12, 0]);

    const overlapRight = [0, 1, 2, 3, 4];
    runtime.System.arraycopy(overlapRight, 0, overlapRight, 1, 4);
    assert.deepEqual(overlapRight, [0, 0, 1, 2, 3]);

    const overlapLeft = [0, 1, 2, 3, 4];
    runtime.System.arraycopy(overlapLeft, 1, overlapLeft, 0, 4);
    assert.deepEqual(overlapLeft, [1, 2, 3, 4, 4]);
    assert.throws(() => runtime.System.arraycopy(source, -1, target, 0, 1), RangeError);
    assert.throws(() => runtime.System.arraycopy(source, 0, target, 4, 2), RangeError);
});

test("Java collection helpers preserve the valid operations used by Jackal", async () => {
    const runtime = await loadJavaRuntime();

    const list = new runtime.ArrayList();
    assert.equal(list.add("a"), true);
    assert.equal(list.add("b"), true);
    assert.equal(list.add("c"), true);
    assert.equal(list.get(1), "b");
    assert.equal(list.set(1, "B"), "b");
    assert.equal(list.removeAt(0), "a");
    assert.equal(list.removeValue("c"), true);
    assert.throws(() => list.removeAt(99), RangeError);
    assert.deepEqual([...list], ["B"]);

    const javaSeedOneInts = [-1155869325, 431529176, 1761283695, 1749940626, 892128508];
    const seeded = new runtime.Random(1);
    assert.deepEqual(
        javaSeedOneInts.map(() => seeded.nextInt()),
        javaSeedOneInts,
        "Random must match java.util.Random bit-for-bit."
    );

    const bounded = new runtime.Random(1);
    assert.deepEqual(
        [1, 2, 3, 5, 7, 16, 31, 1000, 2147483647].map((bound) => bounded.nextInt(bound)),
        [0, 0, 1, 3, 6, 0, 4, 606, 2078239978]
    );
    const floating = new runtime.Random(1);
    assert.deepEqual(
        Array.from({ length: 5 }, () => floating.nextFloat()),
        [0.7308781743049622, 0.10047316551208496, 0.41008079051971436, 0.4074397683143616, 0.20771479606628418]
    );

    const state = { seed0: 11, seed1: 22, seed2: 33 };
    const random = runtime.Random.fromState(state);
    const control = runtime.Random.fromState(state);
    assert.deepEqual(random.getState(), state);
    assert.equal(random.nextInt(), control.nextInt(), "Restored random state must continue the same sequence.");
    assert.deepEqual(random.getState(), control.getState());
    assert.throws(() => runtime.Random.fromState({ seed0: -1, seed1: 0, seed2: 0 }), RangeError);
    assert.throws(() => runtime.Random.fromState({ seed0: 0, seed1: 65536, seed2: 0 }), RangeError);
});

test("Jackal uses JavaRuntime only within the lightweight contracts tested above", () => {
    const arraycopyCalls = [];
    const sortCalls = [];
    const soundSets = [];
    const soundGets = [];
    const missingMapEntryChecks = [];
    const oneArgumentRemovals = [];

    visitGameplay((node, sourceFile, path) => {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
            const name = callName(node);
            const receiver = receiverText(node, sourceFile);
            if (receiver === "System" && name === "arraycopy") {
                arraycopyCalls.push({ node, sourceFile });
            }
            if (receiver === "mapLocal" && name === "sort") {
                sortCalls.push({ node, sourceFile, path });
            }
            if (receiver === "this.lastPlayTime" && name === "set") {
                soundSets.push({ node, path });
            }
            if (receiver === "this.lastPlayTime" && name === "get" && node.arguments.length === 1 && node.arguments[0].getText(sourceFile) === "sound") {
                soundGets.push({ node });
            }
            if ((name === "removeAt" || name === "removeValue") && node.arguments.length === 1) {
                oneArgumentRemovals.push(node.getText(sourceFile).replace(/\s+/g, " "));
            }
        }
        if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
            node.left.getText(sourceFile) === "time" &&
            node.right.getText(sourceFile) === "undefined"
        ) {
            missingMapEntryChecks.push({ node });
        }
    });

    assert.equal(arraycopyCalls.length, 2, "Jackal should have exactly the two stage-map array copies audited here.");
    for (const { node, sourceFile } of arraycopyCalls) {
        assert.equal(node.arguments.length, 5);
        assert.notEqual(
            node.arguments[0].getText(sourceFile),
            node.arguments[2].getText(sourceFile),
            "The audited copies use distinct source and target arrays, so overlap handling is unnecessary in the lightweight implementation."
        );
    }

    assert.equal(sortCalls.length, 1, "Jackal should have exactly one audited native numeric sort.");
    assert.equal(sortCalls[0].path, join(gameplayRoot, "Main.ts"));
    assert.equal(sortCalls[0].node.arguments.length, 1, "The native sort must retain its explicit numeric comparator.");

    assert.equal(soundSets.length, 2, "Sound throttling should update its native Map in both volume variants.");
    for (const { node, path } of soundSets) {
        assert.equal(path, join(gameplayRoot, "Main.ts"));
        assert.ok(ts.isExpressionStatement(node.parent), "Sound-throttle Map updates must remain side-effect-only statements.");
    }

    assert.equal(soundGets.length, 2);
    assert.equal(missingMapEntryChecks.length, 2, "The two sound-throttle lookups explicitly recognize a missing JS Map entry.");

    const runtimeSource = readFileSync(join(rootDir, "pwa", "src", "java", "JavaRuntime.ts"), "utf8");
    assert.doesNotMatch(runtimeSource, /export class (HashMap|Collections|Arrays|BufferedInputStream|DataInputStream|Class|Integer|Character|JavaString)\b/);
    assert.doesNotMatch(
        runtimeSource,
        /Reflect\.(?:get|set)\([^)]*seed|JAVA_RANDOM_MULTIPLIER|seedUniquifier/,
        "Random must not depend on slick2d-ts private state."
    );
    assert.match(runtimeSource, /import\s+\{\s*JavaRandom,\s*type\s+JavaRandomState\s*\}\s+from\s+["']slick2d-ts["']/);
    assert.match(runtimeSource, /export class Random extends JavaRandom/);
    assert.doesNotMatch(runtimeSource, /private nextBits\(bits: number\): number/, "Jackal must use slick2d-ts's supported JavaRandom implementation.");

    assert.deepEqual(
        oneArgumentRemovals.sort(),
        [
            "CutsceneSequence.modes.removeAt(main.random.nextInt(CutsceneSequence.modes.size()))",
            "list.removeAt(j)",
            "list.removeAt(j)",
            "this.bullets.removeAt(i)",
            "this.enemies.removeValue(enemy)",
            "this.mines.removeValue(enemy)",
            "this.shipGuns.removeValue(bossShipGun)",
            "this.solids.removeValue(enemy)"
        ].sort()
    );
});
