import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const tsRoot = join(rootDir, "pwa", "src", "jackal");

function read(path) {
    return readFileSync(join(rootDir, path), "utf8");
}

function walkTypeScriptFiles(directory) {
    const files = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkTypeScriptFiles(path));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
            files.push(path);
        }
    }
    return files;
}

const signatureMap = JSON.parse(read("scripts/java-ts-signature-map.json"));
const parityExceptions = JSON.parse(read("scripts/java-ts-parity-exceptions.json"));
const floatMetadata = read("scripts/java-float-parity/java-float-metadata.jsonl").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const javaClasses = new Map(floatMetadata.filter((entry) => entry.fullName === entry.name).map((entry) => [entry.name, entry]));

test("browser gameplay Pause keeps application audio policy out of GameMode", () => {
    const java = read("desktop/src/jackal/GameMode.java");
    const browser = read("pwa/src/jackal/GameMode.ts");
    const reason = parityExceptions.behaviorExceptions["GameMode.browserPauseMusicTransport"];

    assert.match(java, /gc\.setMusicOn\(false\)/);
    assert.match(java, /gc\.setMusicOn\(true\)/);
    assert.doesNotMatch(browser, /setMusicOn\s*\(/);
    assert.match(browser, /currentSong\?\.pause\(\)/);
    assert.match(browser, /currentSong\?\.resume\(\)/);
    assert.match(reason, /application-wide Music policy/i);
    assert.match(reason, /exact active Song Music transport/i);
});

test("GameElement preserves Java's derived-object initialization order", () => {
    const source = read("pwa/src/jackal/GameElement.ts");
    const defaults = source.indexOf("this.__initializeJavaSubclassDefaults();");
    const init = source.indexOf("this.init();", defaults);
    const add = source.indexOf("this.gameMode.addGameElement(this);", init);

    assert.ok(defaults >= 0, "GameElement must initialize Java subclass defaults.");
    assert.ok(defaults < init, "Java defaults must exist before the virtual init() call.");
    assert.ok(init < add, "The entity must be added only after init(), matching Java.");
    assert.match(source, /use no-emit `declare` fields/i);
});

test("Java field hiding remains represented by separate JavaScript properties", () => {
    for (const className of ["Fire", "Explosion"]) {
        const javaSource = read(`desktop/src/jackal/${className}.java`);
        const tsSource = read(`pwa/src/jackal/${className}.ts`);
        assert.match(javaSource, /public\s+Enemy\s+enemy\s*;/);
        assert.match(tsSource, /sourceEnemy:\s*Enemy\s*\|\s*null/);
        assert.doesNotMatch(tsSource, /\b(?:declare\s+)?public\s+enemy:\s*Enemy/);
    }

    const baseSource = read("pwa/src/jackal/GameElement.ts");
    assert.match(baseSource, /public\s+enemy:\s*boolean\s*=\s*false/);

    const serializer = read("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");
    const codec = read("pwa/src/jackal/persistence/GameStateCodec.ts");
    const policies = read("pwa/src/jackal/persistence/GameStateFieldPolicies.ts");
    assert.match(serializer, /const fields = encodeNamedFields\(entity, getEntityDurableFieldNames\(type\), context\);/);
    assert.match(serializer, /decodeNamedFieldsInto\([\s\S]*getEntityDurableFieldNames\(entitySnapshot\.type\)/);
    assert.match(policies, /Explosion:\s*\{ sourceEnemy: ENEMY_ENTITY_TYPES \}/);
    assert.match(policies, /Fire:\s*\{ sourceEnemy: ENEMY_ENTITY_TYPES \}/);
    assert.match(codec, /throw new Error\("Unregistered object reference in durable Jackal game state\."\)/);
    assert.doesNotMatch(codec, /encodeObjectFields|Object\.keys\(source\)/);
    assert.doesNotMatch(serializer, /record\.enemy\s*=|delete record\.sourceEnemy|normalizeTranslatedEntityFields/);
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

test("Java overload cleanup uses fixed-arity methods and explicit constructor factories", () => {
    for (const entry of readdirSync(tsRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".ts")) {
            continue;
        }
        const source = readFileSync(join(tsRoot, entry.name), "utf8");
        assert.doesNotMatch(source, /\barguments\.length\b/, `${entry.name} must not dispatch from runtime arity.`);
        assert.doesNotMatch(source, /__overload\d+|__construct_/, `${entry.name} must not retain generated overload scaffolding.`);
        assert.doesNotMatch(source, /No Java (?:method|constructor) overload matched/, `${entry.name} must not retain impossible dispatcher errors.`);

        const sourceFile = ts.createSourceFile(entry.name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        for (const statement of sourceFile.statements) {
            if (!ts.isClassDeclaration(statement)) {
                continue;
            }
            for (const member of statement.members) {
                if (!ts.isConstructorDeclaration(member) && !ts.isMethodDeclaration(member)) {
                    continue;
                }
                for (const parameter of member.parameters) {
                    assert.equal(parameter.questionToken, undefined, `${entry.name} must not use optional parameters to simulate Java overloads.`);
                    if (parameter.dotDotDotToken !== undefined) {
                        const memberName = ts.isConstructorDeclaration(member) ? "constructor" : ts.isIdentifier(member.name) ? member.name.text : "";
                        assert.ok(
                            new Set(["Menu.constructor", "Main.loadExtraLargeImage"]).has(`${statement.name?.text}.${memberName}`),
                            "Only real Java varargs declarations may use a TypeScript rest parameter."
                        );
                    }
                }
                const nonNullableParameters = new Set(
                    member.parameters
                        .filter(
                            (parameter) =>
                                ts.isIdentifier(parameter.name) &&
                                parameter.questionToken === undefined &&
                                parameter.initializer === undefined &&
                                !/\b(?:null|undefined)\b/.test(parameter.type?.getText(sourceFile) ?? "")
                        )
                        .map((parameter) => parameter.name.text)
                );
                function rejectRedundantParameterAssertion(node) {
                    if (ts.isNonNullExpression(node) && ts.isIdentifier(node.expression) && nonNullableParameters.has(node.expression.text)) {
                        assert.fail(`${entry.name} must not retain generated non-null assertion ${node.getText(sourceFile)} on a non-null parameter.`);
                    }
                    ts.forEachChild(node, rejectRedundantParameterAssertion);
                }
                if (member.body !== undefined) {
                    rejectRedundantParameterAssertion(member.body);
                }
            }
        }
    }

    const factoryNamesByClass = new Map();
    for (const key of Object.keys(signatureMap.constructorFactories)) {
        const [className, factoryName] = key.split(".");
        if (!factoryNamesByClass.has(className)) {
            factoryNamesByClass.set(className, []);
        }
        factoryNamesByClass.get(className).push(factoryName);
    }

    for (const [className, javaClass] of javaClasses) {
        const constructors = javaClass.methods.filter((method) => method.name === "<init>");
        if (constructors.length <= 1) {
            continue;
        }

        const tsPath = join(tsRoot, `${className}.ts`);
        const source = readFileSync(tsPath, "utf8");
        const sourceFile = ts.createSourceFile(tsPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const declaration = sourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === className);
        assert.ok(declaration, `Missing TypeScript class ${className}.`);

        const implementationConstructors = declaration.members.filter((member) => ts.isConstructorDeclaration(member) && member.body !== undefined);
        assert.equal(implementationConstructors.length, 1, `${className} must have one canonical implementation constructor.`);
        assert.equal(implementationConstructors[0].parameters.length, 0, `${className}'s canonical constructor must be fixed zero-arity.`);
        assert.ok(
            implementationConstructors[0].modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword),
            `${className}'s canonical constructor must be private so callers select an explicit Java signature factory.`
        );

        const factories = new Set(factoryNamesByClass.get(className) ?? []);
        assert.equal(factories.size, constructors.length, `${className} must expose one factory per Java constructor signature.`);
        for (const factoryName of factories) {
            const member = declaration.members.find(
                (candidate) => ts.isMethodDeclaration(candidate) && ts.isIdentifier(candidate.name) && candidate.name.text === factoryName
            );
            assert.ok(member?.body, `Missing constructor factory ${className}.${factoryName}.`);
            assert.ok(
                member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword),
                `${className}.${factoryName} must be static.`
            );
        }
    }

    const overloadedClassNames = new Set(factoryNamesByClass.keys());
    for (const path of walkTypeScriptFiles(join(rootDir, "pwa", "src"))) {
        const source = readFileSync(path, "utf8");
        const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        function rejectDirectConstruction(node) {
            if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && overloadedClassNames.has(node.expression.text)) {
                const className = node.expression.text;
                let parent = node.parent;
                while (parent !== undefined && !ts.isMethodDeclaration(parent) && !ts.isConstructorDeclaration(parent)) {
                    parent = parent.parent;
                }
                assert.ok(ts.isMethodDeclaration(parent), `${className} must be created through an explicit constructor factory.`);
                const containingClass = parent.parent;
                assert.ok(
                    ts.isClassDeclaration(containingClass) && containingClass.name?.text === className,
                    `${className} must not be directly constructed outside its own factory methods.`
                );
                const methodName = ts.isIdentifier(parent.name) ? parent.name.text : "";
                assert.ok(
                    new Set(factoryNamesByClass.get(className)).has(methodName) &&
                        parent.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword),
                    `Direct construction of ${className} is allowed only inside one of its mapped static factories.`
                );
            }
            ts.forEachChild(node, rejectDirectConstruction);
        }
        rejectDirectConstruction(sourceFile);
    }
});

test("Java-shaped shared representations avoid JavaScript coercion and duplicated state", () => {
    const looseEqualitySites = [];
    for (const path of walkTypeScriptFiles(join(rootDir, "pwa", "src"))) {
        const source = readFileSync(path, "utf8");
        const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        function visit(node) {
            if (
                ts.isBinaryExpression(node) &&
                (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken || node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)
            ) {
                const location = sourceFile.getLineAndCharacterOfPosition(node.operatorToken.getStart(sourceFile));
                looseEqualitySites.push(`${path}:${location.line + 1}`);
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    assert.deepEqual(looseEqualitySites, [], "Translated code must not rely on JavaScript coercive equality.");

    const main = read("pwa/src/jackal/Main.ts");
    assert.match(main, /public fonts: Image\[\]\[\] = java2DArray\(4, 256, null!\);/);
    assert.match(main, /font\[string\.charCodeAt\(i\)\]/);
    assert.match(main, /this\.fonts\[i\]\[character\.charCodeAt\(0\)\] = image;/);
    assert.doesNotMatch(main, /Record<string, Image>/);

    assert.match(main, /public static get mainInstance\(\): Main \{\s*return requireMainRuntime\(\);/);
    assert.match(
        main,
        /public static set mainInstance\(mainInstance: Main\) \{\s*mainInstance\.browserRuntimeActive = true;\s*installMainRuntime\(mainInstance\);/
    );
    assert.match(main, /public static get gameMode\(\): GameMode \{\s*return requireMainRuntimeGameMode\(\);/);
    assert.match(main, /public static set gameMode\(gameMode: GameMode \| null\) \{\s*setMainRuntimeGameMode\(gameMode\);/);
    assert.match(main, /public disposeBrowserRuntime\(\): void \{[\s\S]*?clearMainRuntime\(this\);/);
    assert.doesNotMatch(main, /public static (?:mainInstance|gameMode):/);

    for (const constant of [
        "DISPLAY_WIDTH",
        "DISPLAY_HEIGHT",
        "FONT_WHITE",
        "FONT_GRAY",
        "FONT_ORANGE",
        "FONT_ORANGE_GRAY",
        "MINIMUM_SOUND_TIME",
        "CHARS",
        "TILES"
    ]) {
        assert.match(main, new RegExp(String.raw`public static readonly ${constant}:[^=]+=[\s\S]*?MainConstants\.${constant}`));
    }

    const math = read("pwa/src/jackal/JackalMath.ts");
    assert.match(math, /export function rotatePointLikeJava/);
    assert.match(math, /const cos = javaFloat\(Math\.cos\(angle\)\)/);
    assert.match(math, /const sin = javaFloat\(Math\.sin\(angle\)\)/);
    assert.match(main, /return rotatePointLikeJava\(x, y, angle\);/);
    assert.match(read("pwa/src/jackal/Player.ts"), /rotatePointLikeJava/);
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
    assert.match(schema, /GAME_STATE_VERSION\s*=\s*23/);
    assert.doesNotMatch(schema, /MIN_SUPPORTED_GAME_STATE_VERSION|SUPPORTED_GAME_STATE_VERSIONS/);
});
