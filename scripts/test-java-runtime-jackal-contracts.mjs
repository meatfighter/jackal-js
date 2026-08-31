import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const gameplayRoot = join(rootDir, "pwa", "src", "jackal");

async function loadJavaRuntime() {
    const runtimePath = join(rootDir, "pwa", "src", "java", "JavaRuntime.ts");
    const source = readFileSync(runtimePath, "utf8").replace(/^import\s+\{[^\n]+\}\s+from\s+["']slick2d-ts["'];\s*$/m, "");
    const testStubs = `
class BinaryReader {
    constructor(stream) {
        this.stream = stream;
    }
}
class JavaRandom {}
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
    assert.equal(runtime.javaShort(65535), -1);
    assert.equal(runtime.javaChar(-1), 65535);
    assert.equal(runtime.javaFloat(1 / 3), Math.fround(1 / 3));
    assert.equal(runtime.javaLong((1n << 63n) + 5n), -(1n << 63n) + 5n);
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
    assert.deepEqual(list.toArray(), ["B"]);

    const map = new runtime.HashMap();
    assert.equal(map.put("sound", 10), undefined);
    assert.equal(map.put("sound", 20), 10);
    assert.equal(map.get("sound"), 20);
});

test("Jackal uses JavaRuntime only within the lightweight contracts tested above", () => {
    const arraycopyCalls = [];
    const sortCalls = [];
    const putCalls = [];
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
            if (receiver === "Arrays" && name === "sort") {
                sortCalls.push({ node });
            }
            if (name === "put") {
                putCalls.push({ node, path });
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

    assert.equal(sortCalls.length, 1, "Jackal should have exactly one Java Arrays.sort call.");
    assert.equal(sortCalls[0].node.arguments.length, 2, "The Jackal sort must retain its explicit numeric comparator.");

    assert.equal(putCalls.length, 2, "Jackal should use HashMap.put only for sound throttling.");
    for (const { node, path } of putCalls) {
        assert.equal(path, join(gameplayRoot, "Main.ts"));
        assert.ok(ts.isExpressionStatement(node.parent), "Jackal must not rely on HashMap.put's returned previous value.");
    }

    assert.equal(soundGets.length, 2);
    assert.equal(missingMapEntryChecks.length, 2, "The two sound-throttle lookups explicitly recognize a missing JS Map entry.");

    assert.deepEqual(
        oneArgumentRemovals.sort(),
        [
            "CutsceneSequence.modes.removeAt(Main.mainInstance.random.nextInt(CutsceneSequence.modes.size()))",
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
