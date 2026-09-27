import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const jackalRoot = join(rootDir, "pwa", "src", "jackal");
const serializerPath = join(jackalRoot, "persistence", "JackalGameStateSerializer.ts");
const serializerSource = readFileSync(serializerPath, "utf8");
const fieldsPath = join(jackalRoot, "persistence", "GameStateFields.ts");
const fieldsSource = readFileSync(fieldsPath, "utf8");
const fieldsFile = ts.createSourceFile(fieldsPath, fieldsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const codecSource = readFileSync(join(jackalRoot, "persistence", "GameStateCodec.ts"), "utf8");
const fieldPolicySource = readFileSync(join(jackalRoot, "persistence", "GameStateFieldPolicies.ts"), "utf8");
const validatorSource = readFileSync(join(jackalRoot, "persistence", "GameStateSnapshotValidator.ts"), "utf8");
const runtimePath = join(jackalRoot, "persistence", "EntityRuntimePersistence.ts");
const runtimeSource = readFileSync(runtimePath, "utf8");
const runtimeFile = ts.createSourceFile(runtimePath, runtimeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const typeIdsPath = join(jackalRoot, "persistence", "GameElementTypeIds.ts");
const typeIdsSource = readFileSync(typeIdsPath, "utf8");
const typeIdsFile = ts.createSourceFile(typeIdsPath, typeIdsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

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
            model.set(statement.name.text, { fields, base, path });
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

function stringElements(initializer, sourceFile, label) {
    let expression = initializer;
    while (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) {
        expression = expression.expression;
    }
    if (ts.isNewExpression(expression) && expression.expression.getText(sourceFile) === "Set") {
        assert.equal(expression.arguments?.length, 1, `${label} must initialize Set with one array.`);
        expression = expression.arguments[0];
    }
    if (ts.isCallExpression(expression)) {
        return expression.arguments.map((element) => {
            assert.ok(ts.isStringLiteral(element), `${label} must contain only string literals.`);
            return element.text;
        });
    }
    assert.ok(ts.isArrayLiteralExpression(expression), `${label} must be a literal string array.`);
    return expression.elements.map((element) => {
        assert.ok(ts.isStringLiteral(element), `${label} must contain only string literals.`);
        return element.text;
    });
}

function persistenceConstant(name) {
    for (const statement of fieldsFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                assert.ok(declaration.initializer, `${name} must have an initializer.`);
                return stringElements(declaration.initializer, fieldsFile, name);
            }
        }
    }
    throw new Error(`Missing persistence constant ${name}.`);
}

function variableInitializer(sourceFile, name) {
    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) {
            continue;
        }
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                assert.ok(declaration.initializer, `${name} must have an initializer.`);
                return declaration.initializer;
            }
        }
    }
    throw new Error(`Missing variable ${name}.`);
}

function runtimePointerMap() {
    let initializer = variableInitializer(runtimeFile, "ENTITY_RUNTIME_POINTERS");
    while (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer) || ts.isParenthesizedExpression(initializer)) {
        initializer = initializer.expression;
    }
    assert.ok(ts.isObjectLiteralExpression(initializer), "ENTITY_RUNTIME_POINTERS must be an object literal.");

    const result = new Map();
    for (const property of initializer.properties) {
        assert.ok(ts.isPropertyAssignment(property), "ENTITY_RUNTIME_POINTERS must use explicit property assignments.");
        assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name), "Runtime pointer keys must be stable entity IDs.");
        result.set(property.name.text, new Set(stringElements(property.initializer, runtimeFile, `ENTITY_RUNTIME_POINTERS.${property.name.text}`)));
    }
    return result;
}

const fieldLists = new Map([
    ["MAIN_FIELD_NAMES", ["Main"]],
    ["GAME_MODE_FIELD_NAMES", ["GameMode"]],
    ["MENU_FIELD_NAMES", ["Menu"]],
    ["KONAMI_CODE_FIELD_NAMES", ["KonamiCode"]],
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

test("named persistence fields are unique and correspond to declared runtime state", () => {
    const model = buildClassModel();
    for (const [constantName, classNames] of fieldLists) {
        const names = persistenceConstant(constantName);
        assert.equal(new Set(names).size, names.length, `${constantName} contains duplicate field names.`);
        for (const className of classNames) {
            const classFields = fieldsForClass(model, className);
            for (const name of names) {
                assert.ok(classFields.has(name), `${constantName} names ${className}.${name}, but that field is not declared in the class hierarchy.`);
            }
        }
    }
});

test("global Player input-release skips do not collide with other runtime classes", () => {
    const model = buildClassModel();
    for (const field of ["fireReleased", "shootReleased"]) {
        const owners = [];
        for (const [className, entry] of model.entries()) {
            if (entry.fields.has(field)) {
                owners.push(className);
            }
        }
        assert.deepEqual(owners.sort(), ["Player"], `${field} must remain a Player-only transient field`);
    }
});

test("Main save fields exclude loader/runtime caches and derived display strings", () => {
    const mainFields = persistenceConstant("MAIN_FIELD_NAMES");
    for (const field of [
        "loadIndex",
        "soundCooldownClock",
        "nextFrameTime",
        "extraLivesStr",
        "scoreStr",
        "closeRequestedFlag",
        "controllerGrenadePressed",
        "controllerGunPressed",
        "unitVector"
    ]) {
        assert.ok(!mainFields.includes(field), `${field} must remain runtime/reconstructed rather than durable Main state`);
    }
});

test("durable entity and Player persistence is descriptor-driven and excludes runtime-only state", () => {
    const skipped = persistenceConstant("SKIPPED_INSTANCE_FIELDS");
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
        "player",
        "fireReleased",
        "shootReleased"
    ]) {
        assert.ok(skipped.includes(field), `${field} must remain reconstructed or runtime-only rather than durable state.`);
    }

    assert.doesNotMatch(codecSource, /encodeObjectFields|Object\.keys\(source\)/);
    assert.match(codecSource, /throw new Error\("Unregistered object reference in durable Jackal game state\."\)/);
    assert.match(serializerSource, /getPlayerDurableFieldNames\(\)/);
    assert.match(serializerSource, /getEntityDurableFieldNames\(type\)/);
    assert.match(serializerSource, /getDurableEntityReferences\(type, entity\)/);
    assert.match(validatorSource, /isPlayerDurableFields\(snapshot\.playerFields\)/);
    assert.match(validatorSource, /isEntityDurableFields\(entitySnapshot\.type, entitySnapshot\.fields, entityTypes\)/);
    assert.match(fieldPolicySource, /Unclassified durable Jackal field/);
});

test("current save snapshots preserve translated hidden fields without legacy aliases", () => {
    const schema = readFileSync(join(jackalRoot, "persistence", "GameStateSchema.ts"), "utf8");

    assert.match(schema, /GAME_STATE_VERSION\s*=\s*20/);
    assert.doesNotMatch(schema, /MIN_SUPPORTED_GAME_STATE_VERSION|SUPPORTED_GAME_STATE_VERSIONS/);
    assert.match(serializerSource, /const fields = encodeNamedFields\(entity, getEntityDurableFieldNames\(type\), context\)/);
    assert.match(serializerSource, /decodeNamedFieldsInto\([\s\S]*getEntityDurableFieldNames\(entitySnapshot\.type\)/);
    assert.doesNotMatch(serializerSource, /record\.enemy =|delete record\.sourceEnemy|removeFlag alias|normalizeLegacy|normalizeTranslated/);
    assert.doesNotMatch(codecSource, /return id === undefined \? \{ kind: "nullRef" \}/);
});

test("runtime-only entity descriptors are required exact current-format data", () => {
    const snapshotSource = readFileSync(join(jackalRoot, "persistence", "GameStateSnapshot.ts"), "utf8");
    const runtimeFieldsSource = readFileSync(join(jackalRoot, "persistence", "EntityRuntimeFields.ts"), "utf8");

    assert.match(serializerSource, /captureEntityRuntimeFields\(entity, context\.main, context\.gameMode\)/);
    assert.match(serializerSource, /runtimeFields\s*\n?\s*\}/);
    assert.match(snapshotSource, /runtimeFields: EncodedRecord \| null/);
    assert.match(validatorSource, /isEntityRuntimeFields\(entitySnapshot\.type, entitySnapshot\.runtimeFields\)/);
    assert.match(runtimeFieldsSource, /default:\s*return value === null/);
    assert.doesNotMatch(runtimeSource, /LEGACY_|clearLegacyRuntimeFields|runtimeValue\(/);
    assert.doesNotMatch(runtimeFieldsSource, /version:/);
});

test("every skipped entity collection/player pointer is reconstructed from GameMode", () => {
    const model = buildClassModel();
    const typeIds = stringElements(variableInitializer(typeIdsFile, "GAME_ELEMENT_TYPE_IDS"), typeIdsFile, "GAME_ELEMENT_TYPE_IDS");
    const configured = runtimePointerMap();
    const pointerNames = new Set(["solids", "enemies", "mines", "player"]);

    for (const typeId of typeIds) {
        const expected = new Set([...fieldsForClass(model, typeId)].filter((field) => pointerNames.has(field)));
        const actual = configured.get(typeId) ?? new Set();
        assert.deepEqual([...actual].sort(), [...expected].sort(), `${typeId} runtime pointers must exactly match skipped class fields.`);
    }

    for (const typeId of configured.keys()) {
        assert.ok(typeIds.includes(typeId), `ENTITY_RUNTIME_POINTERS contains unregistered entity ID ${typeId}.`);
    }
});

test("the optimized direction cache is derived from Stage and never persisted as authoritative state", () => {
    const gameModeFields = persistenceConstant("GAME_MODE_FIELD_NAMES");
    const skipped = persistenceConstant("SKIPPED_INSTANCE_FIELDS");
    assert.ok(!gameModeFields.includes("directionsDecoded"));
    assert.ok(skipped.includes("directionsDecoded"));
    assert.match(serializerSource, /gameMode\.setStage\s*\(/);

    const gameModeSource = readFileSync(join(jackalRoot, "GameMode.ts"), "utf8");
    assert.match(gameModeSource, /this\.directionsDecoded\s*=\s*stage\.directionsDecoded/);
});
