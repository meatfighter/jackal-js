import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const javaRoot = join(rootDir, "desktop", "src", "jackal");
const tsRoot = join(rootDir, "pwa", "src", "jackal");

function read(path) {
    return readFileSync(join(rootDir, path), "utf8");
}

function publicJavaConstructorCount(source, className) {
    const pattern = new RegExp(`\\bpublic\\s+${className}\\s*\\(`, "g");
    return source.match(pattern)?.length ?? 0;
}

function typescriptConstructorOverloadCount(source, fileName, className) {
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const classDeclaration = sourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === className);
    assert.ok(classDeclaration, `Missing TypeScript class ${className}.`);
    return classDeclaration.members.filter((member) => ts.isConstructorDeclaration(member) && member.body === undefined).length;
}

test("GameElement preserves Java's derived-object initialization order", () => {
    const source = read("pwa/src/jackal/GameElement.ts");
    const defaults = source.indexOf("this.__initializeJavaSubclassDefaults();");
    const init = source.indexOf("this.init();", defaults);
    const add = source.indexOf("this.gameMode.add(this);", init);

    assert.ok(defaults >= 0, "GameElement must initialize Java subclass defaults.");
    assert.ok(defaults < init, "Java defaults must exist before the virtual init() call.");
    assert.ok(init < add, "The entity must be added only after init(), matching Java.");
    assert.match(source, /use no-emit `declare` fields/i);
});

test("Java field hiding remains represented by separate JavaScript properties", () => {
    const serializer = read("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");

    for (const className of ["Fire", "Explosion"]) {
        const javaSource = read(`desktop/src/jackal/${className}.java`);
        const tsSource = read(`pwa/src/jackal/${className}.ts`);
        assert.match(javaSource, /public\s+Enemy\s+enemy\s*;/);
        assert.match(tsSource, /sourceEnemy:\s*Enemy\s*\|\s*null/);
        assert.doesNotMatch(tsSource, /\b(?:declare\s+)?public\s+enemy:\s*Enemy/);
    }

    const baseSource = read("pwa/src/jackal/GameElement.ts");
    assert.match(baseSource, /public\s+enemy:\s*boolean\s*=\s*false/);
    assert.doesNotMatch(serializer, /record\.enemy\s*=\s*this\.encodeValue\(entity\.sourceEnemy/);
    assert.doesNotMatch(serializer, /normalizeTranslatedEntityFields/);
});

test("JeepYeah removal state follows the original Java field", () => {
    for (const className of ["JeepYeahBullet", "JeepYeahExplosion"]) {
        const javaSource = read(`desktop/src/jackal/${className}.java`);
        const tsSource = read(`pwa/src/jackal/${className}.ts`);
        assert.match(javaSource, /public\s+boolean\s+remove\s*;/);
        assert.match(tsSource, /public\s+remove:\s*boolean/);
        assert.match(tsSource, /this\.remove\s*=\s*true/);
        assert.doesNotMatch(tsSource, /this\.removeFlag\s*=/);
    }

    const modeSource = read("pwa/src/jackal/JeepYeahMode.ts");
    assert.match(modeSource, /\.remove\b/);
    assert.doesNotMatch(modeSource, /\.removeFlag\b/);

    const serializer = read("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");
    assert.doesNotMatch(serializer, /\bremoveFlag\b/);
});

test("Java boolean XOR translations remain boolean negations", () => {
    const pairs = [
        ["BossHelicopter", "tailIndexCounter"],
        ["FlashingSkull", "visible"],
        ["LandingPort", "blue"]
    ];

    for (const [className, field] of pairs) {
        const javaSource = read(`desktop/src/jackal/${className}.java`);
        const tsSource = read(`pwa/src/jackal/${className}.ts`);
        assert.match(javaSource, new RegExp(`${field}\\s*\\^=\\s*true`));
        assert.match(tsSource, new RegExp(`(?:this\\.)?${field}\\s*=\\s*!(?:this\\.)?${field}`));
        assert.doesNotMatch(tsSource, /\^=\s*true/);
    }
});

test("translated Java constructor overloads have erased TypeScript signatures", () => {
    for (const entry of readdirSync(javaRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".java")) {
            continue;
        }
        const className = basename(entry.name, ".java");
        const javaSource = readFileSync(join(javaRoot, entry.name), "utf8");
        const constructorCount = publicJavaConstructorCount(javaSource, className);
        if (constructorCount <= 1) {
            continue;
        }

        const tsPath = join(tsRoot, `${className}.ts`);
        const tsSource = readFileSync(tsPath, "utf8");
        assert.equal(
            typescriptConstructorOverloadCount(tsSource, tsPath, className),
            constructorCount,
            `${className} should expose one TypeScript overload signature per public Java constructor.`
        );
        assert.match(tsSource, new RegExp(`__construct_${className}\\b`));
    }
});

test("TypeScript policy strengthens checking without changing Java field semantics", () => {
    const tsconfig = JSON.parse(read("pwa/tsconfig.json"));
    const options = tsconfig.compilerOptions;

    assert.equal(options.useDefineForClassFields, false);
    assert.equal(options.strict, true);
    assert.equal(options.strictPropertyInitialization, false);
    assert.equal(options.noImplicitAny, true);
    assert.equal(options.noImplicitOverride, true);
    assert.equal(options.verbatimModuleSyntax, true);
    assert.equal(options.noImplicitReturns, true);
    assert.equal(options.noFallthroughCasesInSwitch, true);

    const schema = read("pwa/src/jackal/persistence/GameStateSchema.ts");
    assert.match(schema, /GAME_STATE_VERSION\s*=\s*4/);
});
