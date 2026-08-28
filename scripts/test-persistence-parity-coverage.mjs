import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const jackalRoot = join(rootDir, "pwa", "src", "jackal");
const serializerPath = join(jackalRoot, "persistence", "JackalGameStateSerializer.ts");
const serializerSource = readFileSync(serializerPath, "utf8");
const serializerFile = ts.createSourceFile(serializerPath, serializerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const fieldLists = new Map([
    ["MAIN_FIELD_NAMES", ["Main"]],
    ["GAME_MODE_FIELD_NAMES", ["GameMode"]],
    ["MENU_FIELD_NAMES", ["Menu"]],
    ["BUTTON_MAPPING_FIELD_NAMES", ["ButtonMapping"]],
    ["INTRO_MODE_FIELD_NAMES", ["IntroMode"]],
    ["SIMPLE_MENU_MODE_FIELD_NAMES", ["ContinueMode", "DifficultyMode", "OptionsMode"]],
    ["INPUT_MODE_FIELD_NAMES", ["InputMode"]],
    ["INTRO_MAP_MODE_FIELD_NAMES", ["IntroMapMode"]],
    ["MAP_MODE_FIELD_NAMES", ["MapMode"]],
    ["JEEP_HERE_MODE_FIELD_NAMES", ["JeepHereMode"]],
    ["JEEP_YEAH_MODE_FIELD_NAMES", ["JeepYeahMode"]],
    ["JEEP_YEAH_PLANE_FIELD_NAMES", ["JeepYeahPlane"]],
    ["JEEP_YEAH_EXPLOSION_FIELD_NAMES", ["JeepYeahExplosion"]],
    ["JEEP_YEAH_FIRE_FIELD_NAMES", ["JeepYeahFireLeft", "JeepYeahFireRight"]],
    ["JEEP_YEAH_BULLET_FIELD_NAMES", ["JeepYeahBullet"]],
    ["SUNSET_MODE_FIELD_NAMES", ["SunsetMode"]],
    ["HARD_ENDING_MODE_FIELD_NAMES", ["HardEndingMode"]]
]);

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

function propertyName(member) {
    if (!member.name) {
        return null;
    }
    if (ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name)) {
        return member.name.text;
    }
    return null;
}

function buildClassModel() {
    const model = new Map();
    for (const path of collectTypeScriptFiles(jackalRoot)) {
        const source = readFileSync(path, "utf8");
        const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

        for (const statement of sourceFile.statements) {
            if (!ts.isClassDeclaration(statement) || !statement.name) {
                continue;
            }

            const fields = new Set();
            for (const member of statement.members) {
                if (ts.isPropertyDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
                    const name = propertyName(member);
                    if (name !== null) {
                        fields.add(name);
                    }
                }
            }

            const heritage = statement.heritageClauses?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword);
            const base = heritage?.types[0]?.expression.getText(sourceFile) ?? null;
            model.set(statement.name.text, { fields, base });
        }
    }
    return model;
}

function fieldsForClass(model, className, seen = new Set()) {
    if (seen.has(className)) {
        throw new Error(`Circular TypeScript class hierarchy involving ${className}.`);
    }
    seen.add(className);

    const entry = model.get(className);
    assert.ok(entry, `Missing TypeScript class ${className}.`);

    const fields = new Set(entry.fields);
    if (entry.base && model.has(entry.base)) {
        for (const field of fieldsForClass(model, entry.base, seen)) {
            fields.add(field);
        }
    }
    return fields;
}

function stringElements(initializer, label) {
    let expression = initializer;
    if (ts.isNewExpression(expression) && expression.expression.getText(serializerFile) === "Set") {
        assert.equal(expression.arguments?.length, 1, `${label} must initialize Set with one array.`);
        expression = expression.arguments[0];
    }

    assert.ok(ts.isArrayLiteralExpression(expression), `${label} must be a literal string array.`);
    return expression.elements.map((element) => {
        assert.ok(ts.isStringLiteral(element), `${label} must contain only string literals.`);
        return element.text;
    });
}

function serializerConstant(name) {
    for (const statement of serializerFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                assert.ok(declaration.initializer, `${name} must have an initializer.`);
                return stringElements(declaration.initializer, name);
            }
        }
    }
    throw new Error(`Missing serializer constant ${name}.`);
}

test("named persistence fields are unique and correspond to declared runtime state", () => {
    const model = buildClassModel();
    for (const [constantName, classNames] of fieldLists) {
        const names = serializerConstant(constantName);
        assert.equal(new Set(names).size, names.length, `${constantName} contains duplicate field names.`);

        for (const className of classNames) {
            const classFields = fieldsForClass(model, className);
            for (const name of names) {
                assert.ok(classFields.has(name), `${constantName} names ${className}.${name}, but that field is not declared in the class hierarchy.`);
            }
        }
    }
});

test("generic object serialization explicitly excludes reconstructed and runtime-only state", () => {
    const skipped = serializerConstant("SKIPPED_INSTANCE_FIELDS");
    assert.equal(new Set(skipped).size, skipped.length, "SKIPPED_INSTANCE_FIELDS contains duplicates.");

    for (const field of [
        "main",
        "gameMode",
        "gc",
        "input",
        "g",
        "stage",
        "directions",
        "directionsDecoded",
        "elements",
        "enemies",
        "solids",
        "mines",
        "player"
    ]) {
        assert.ok(skipped.includes(field), `${field} must remain reconstructed or runtime-only rather than generically persisted.`);
    }

    assert.match(serializerSource, /for\s*\(const key of Object\.keys\(source\)\)/);
    assert.match(serializerSource, /SKIPPED_INSTANCE_FIELDS\.has\(key\)/);
    assert.match(serializerSource, /typeof value === "function" \|\| typeof value === "undefined"/);
    assert.match(serializerSource, /record\[key\] = this\.encodeValue\(value, context\)/);
});

test("private-development save format stays on the current schema without legacy rollback aliases", () => {
    const schema = readFileSync(join(jackalRoot, "persistence", "GameStateSchema.ts"), "utf8");
    assert.match(schema, /GAME_STATE_VERSION\s*=\s*4/);

    assert.doesNotMatch(serializerSource, /normalizeTranslatedEntityFields/);
    assert.doesNotMatch(serializerSource, /normalizeLegacyJeepYeahRemoval/);
    assert.doesNotMatch(serializerSource, /record\.enemy\s*=\s*this\.encodeValue\(entity\.sourceEnemy/);
    assert.doesNotMatch(serializerSource, /delete record\.sourceEnemy/);
    assert.doesNotMatch(serializerSource, /mutableEntity\.sourceEnemy\s*=/);
    assert.doesNotMatch(serializerSource, /record\.removeFlag\s*=/);
    assert.doesNotMatch(serializerSource, /delete value\.removeFlag/);

    for (const className of ["Fire", "Explosion"]) {
        const source = readFileSync(join(jackalRoot, `${className}.ts`), "utf8");
        assert.match(source, /sourceEnemy:\s*Enemy\s*\|\s*null/);
        assert.doesNotMatch(source, /\b(?:declare\s+)?public\s+enemy:\s*Enemy/);
    }

    for (const className of ["JeepYeahBullet", "JeepYeahExplosion"]) {
        const source = readFileSync(join(jackalRoot, `${className}.ts`), "utf8");
        assert.match(source, /public\s+remove:\s*boolean/);
        assert.doesNotMatch(source, /\bremoveFlag\b/);
    }
});

test("the optimized direction cache is derived from Stage and never persisted as authoritative state", () => {
    const gameModeFields = serializerConstant("GAME_MODE_FIELD_NAMES");
    const skipped = serializerConstant("SKIPPED_INSTANCE_FIELDS");
    assert.ok(!gameModeFields.includes("directionsDecoded"));
    assert.ok(skipped.includes("directionsDecoded"));
    assert.match(serializerSource, /gameMode\.setStage\s*\(/);

    const gameModeSource = readFileSync(join(jackalRoot, "GameMode.ts"), "utf8");
    assert.match(gameModeSource, /this\.directionsDecoded\s*=\s*stage\.directionsDecoded/);
});
