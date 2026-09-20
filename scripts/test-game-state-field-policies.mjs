import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";
import { createServer } from "vite";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pwaRoot = join(rootDir, "pwa");
const jackalRoot = join(pwaRoot, "src", "jackal");

const server = await createServer({
    root: pwaRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});

try {
    const policy = await server.ssrLoadModule("/src/jackal/persistence/GameStateFieldPolicies.ts");
    const typeIds = await server.ssrLoadModule("/src/jackal/persistence/GameElementTypeIds.ts");
    const stateFields = await server.ssrLoadModule("/src/jackal/persistence/GameStateFields.ts");

    test("durable entity descriptors exactly cover declared persistent fields", () => {
        const model = buildClassModel();
        for (const type of typeIds.GAME_ELEMENT_TYPE_IDS) {
            const expected = [...fieldsForClass(model, type)].filter((name) => !stateFields.SKIPPED_INSTANCE_FIELDS.has(name)).sort();
            const actual = [...policy.getEntityDurableFieldNames(type)].sort();
            assert.deepEqual(actual, expected, `${type} durable fields drifted from its class hierarchy`);
        }

        const expectedPlayer = [...fieldsForClass(model, "Player")].filter((name) => !stateFields.SKIPPED_INSTANCE_FIELDS.has(name)).sort();
        const actualPlayer = [...policy.getPlayerDurableFieldNames()].sort();
        assert.deepEqual(actualPlayer, expectedPlayer, "Player durable fields drifted from its class declaration");
    });

    test("every entity descriptor can validate a type-correct exact field bag", () => {
        for (const type of typeIds.GAME_ELEMENT_TYPE_IDS) {
            const entityTypes = new Map();
            const valid = encodedRecordForDescriptor(policy.getEntityDurableFieldDescriptor(type), entityTypes);
            assert.equal(policy.isEntityDurableFields(type, valid, entityTypes), true, type);

            const extra = { ...valid, update: 1 };
            assert.equal(policy.isEntityDurableFields(type, extra, entityTypes), false, `${type} must reject method/extra-field shadowing`);

            const names = Object.keys(policy.getEntityDurableFieldDescriptor(type));
            if (names.length > 0) {
                const missing = { ...valid };
                delete missing[names[0]];
                assert.equal(policy.isEntityDurableFields(type, missing, entityTypes), false, `${type} must reject missing durable fields`);
            }
        }
    });

    test("Player durable fields are exact and reject runtime latches", () => {
        const descriptor = policy.PLAYER_DURABLE_FIELD_DESCRIPTOR;
        const valid = encodedRecordForDescriptor(descriptor, new Map());
        assert.equal(policy.isPlayerDurableFields(valid), true);

        assert.equal(policy.isPlayerDurableFields({ ...valid, fireReleased: false }), false);
        assert.equal(policy.isPlayerDurableFields({ ...valid, shootReleased: false }), false);
        assert.equal(policy.isPlayerDurableFields({ ...valid, update: 0 }), false);

        const fractional = { ...valid, angleSteps: 0.5 };
        assert.equal(policy.isPlayerDurableFields(fractional), false, "Java int fields must reject fractional values");
    });

    test("typed references, unique lists, arrays and matrices reject malformed values", () => {
        const bossBlueDescriptor = policy.getEntityDurableFieldDescriptor("BossBlueTank");
        const bossBlueTypes = new Map([[7, "BossBlueTanksManager"]]);
        const bossBlue = encodedRecordForDescriptor(bossBlueDescriptor, bossBlueTypes);
        bossBlue.bossBlueTanksManager = { kind: "entityRef", id: 7 };
        assert.equal(policy.isEntityDurableFields("BossBlueTank", bossBlue, bossBlueTypes), true);

        const wrongTargetTypes = new Map([[7, "Bomb"]]);
        assert.equal(policy.isEntityDurableFields("BossBlueTank", bossBlue, wrongTargetTypes), false);

        const garageDescriptor = policy.getEntityDurableFieldDescriptor("BossGarageManager");
        const garageTypes = new Map();
        const garageManager = encodedRecordForDescriptor(garageDescriptor, garageTypes);
        assert.equal(policy.isEntityDurableFields("BossGarageManager", garageManager, garageTypes), true);
        const duplicateGarages = structuredClone(garageManager);
        duplicateGarages.garages.items[1] = duplicateGarages.garages.items[0];
        assert.equal(policy.isEntityDurableFields("BossGarageManager", duplicateGarages, garageTypes), false);

        const bombDescriptor = policy.getEntityDurableFieldDescriptor("Bomb");
        const bomb = encodedRecordForDescriptor(bombDescriptor, new Map());
        const fractionalInt = structuredClone(bomb);
        fractionalInt.t = 0.5;
        assert.equal(policy.isEntityDurableFields("Bomb", fractionalInt, new Map()), false);
        const fractionalFloat = structuredClone(bomb);
        fractionalFloat.vx = 0.5;
        assert.equal(policy.isEntityDurableFields("Bomb", fractionalFloat, new Map()), true);
        const badBoolean = structuredClone(bomb);
        badBoolean.airplane = 0;
        assert.equal(policy.isEntityDurableFields("Bomb", badBoolean, new Map()), false);
        const shortTrail = structuredClone(bomb);
        shortTrail.trail.items.pop();
        assert.equal(policy.isEntityDurableFields("Bomb", shortTrail, new Map()), false);
        const infiniteVelocity = structuredClone(bomb);
        infiniteVelocity.vx = Number.POSITIVE_INFINITY;
        assert.equal(policy.isEntityDurableFields("Bomb", infiniteVelocity, new Map()), false);

        const elephantDescriptor = policy.getEntityDurableFieldDescriptor("ElephantGun");
        const elephant = encodedRecordForDescriptor(elephantDescriptor, new Map());
        const malformedAsters = structuredClone(elephant);
        malformedAsters.asters.items.pop();
        assert.equal(policy.isEntityDurableFields("ElephantGun", malformedAsters, new Map()), false);
    });
} finally {
    await server.close();
}

function encodedRecordForDescriptor(descriptor, entityTypes) {
    let nextId = 10_000 + entityTypes.size * 100;
    const result = {};
    for (const [name, field] of Object.entries(descriptor)) {
        switch (field.kind) {
            case "boolean":
                result[name] = false;
                break;
            case "number":
                result[name] = 0;
                break;
            case "reference":
                result[name] = null;
                break;
            case "referenceList": {
                const items = [];
                for (let i = 0; i < field.minLength; i++) {
                    const id = nextId++;
                    entityTypes.set(id, field.targets[0]);
                    items.push({ kind: "entityRef", id });
                }
                result[name] = { kind: "arrayList", items };
                break;
            }
            case "numberArray":
                result[name] = { kind: "array", items: Array.from({ length: field.length }, () => 0) };
                break;
            case "numberMatrix":
                result[name] = {
                    kind: "array",
                    items: Array.from({ length: field.rows }, () => ({
                        kind: "array",
                        items: Array.from({ length: field.columns }, () => 0)
                    }))
                };
                break;
            case "booleanArray":
                result[name] = { kind: "array", items: Array.from({ length: field.length }, () => false) };
                break;
            default:
                assert.fail(`Unsupported test field policy ${field.kind}`);
        }
    }
    return result;
}

function collectTypeScriptFiles(directory) {
    const result = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "persistence") {
                result.push(...collectTypeScriptFiles(path));
            }
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

function hasStaticModifier(member) {
    return member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) === true;
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
                if (ts.isPropertyDeclaration(member) && !hasStaticModifier(member)) {
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
    assert.ok(!seen.has(className), `Circular TypeScript class hierarchy involving ${className}`);
    const nextSeen = new Set(seen);
    nextSeen.add(className);
    const entry = model.get(className);
    assert.ok(entry, `Missing TypeScript class ${className}`);
    const fields = new Set(entry.base && model.has(entry.base) ? fieldsForClass(model, entry.base, nextSeen) : []);
    for (const field of entry.fields) {
        fields.add(field);
    }
    return fields;
}
