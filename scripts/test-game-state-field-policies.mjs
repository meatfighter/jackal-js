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
    const typeRegistry = await server.ssrLoadModule("/src/jackal/persistence/GameElementTypeRegistry.ts");
    const stateFields = await server.ssrLoadModule("/src/jackal/persistence/GameStateFields.ts");
    const { GAME_STATE_VERSION } = await server.ssrLoadModule("/src/jackal/persistence/GameStateSchema.ts");
    const { JackalGameStateSerializer } = await server.ssrLoadModule("/src/jackal/persistence/JackalGameStateSerializer.ts");
    const { ArrayList } = await server.ssrLoadModule("/src/java/JavaRuntime.ts");

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

        const impossibleAngle = { ...valid, angle: 1 };
        assert.equal(policy.isPlayerDurableFields(impossibleAngle), false, "logical Player angles must stay on 45-degree steps");

        const impossibleTarget = { ...valid, targetAngle: 360 };
        assert.equal(policy.isPlayerDurableFields(impossibleTarget), false);

        const impossiblePowCounts = { ...valid, pows: 1, releaseablePows: 2 };
        assert.equal(policy.isPlayerDurableFields(impossiblePowCounts), false);
    });

    test("snapshot discovery preserves detached cyclic durable references exactly once", () => {
        const tank = Object.create(typeRegistry.GAME_ELEMENT_TYPES.BossSuperTank.prototype);
        const fire = Object.create(typeRegistry.GAME_ELEMENT_TYPES.SuperFire.prototype);
        tank.superFire = fire;
        fire.bossSuperTank = tank;

        const layers = Array.from({ length: 8 }, () => new ArrayList());
        layers[3].add(tank);
        const gameMode = { elements: layers };
        const serializer = new JackalGameStateSerializer();
        const context = serializer.createGameStateEncodeContext({}, gameMode, {});

        assert.deepEqual(context.entities, [tank, fire]);
        assert.equal(context.ids.get(tank), 0);
        assert.equal(context.ids.get(fire), 1);
    });

    test("GameMode restore preflight matches mutable maps to the loaded stage resource", () => {
        const serializer = new JackalGameStateSerializer();
        const stage = createStageResource(40, 40);
        const snapshot = createGameModeSnapshot(
            GAME_STATE_VERSION,
            stateFields,
            policy,
            stage
        );

        assert.equal(serializer.isSupportedSnapshot(snapshot), true);
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, snapshot), true);

        const triggerMutated = structuredClone(snapshot);
        triggerMutated.gameMode.fields.tileMap.items[1].items[1] = 2;
        triggerMutated.gameMode.fields.typesMap.items[1].items[1] = 2;
        triggerMutated.gameMode.fields.triggedGroups.items[0] = true;
        assert.equal(
            serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, triggerMutated),
            true,
            "values supplied by a shipped trigger group remain valid mutable stage state"
        );

        const wrongWidth = structuredClone(snapshot);
        wrongWidth.gameMode.fields.tileMap.items = wrongWidth.gameMode.fields.tileMap.items.map((row) => ({
            ...row,
            items: row.items.slice(0, 39)
        }));
        wrongWidth.gameMode.fields.typesMap.items = wrongWidth.gameMode.fields.typesMap.items.map((row) => ({
            ...row,
            items: row.items.slice(0, 39)
        }));
        assert.equal(serializer.isSupportedSnapshot(wrongWidth), true, "rectangular wrong-width maps are structurally valid");
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, wrongWidth), false);

        const unknownTile = structuredClone(snapshot);
        unknownTile.gameMode.fields.tileMap.items[0].items[0] = 999;
        assert.equal(serializer.isSupportedSnapshot(unknownTile), true);
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, unknownTile), false);

        const unknownType = structuredClone(snapshot);
        unknownType.gameMode.fields.typesMap.items[0].items[0] = 5;
        assert.equal(serializer.isSupportedSnapshot(unknownType), true);
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, unknownType), false);

        const wrongTriggerCount = structuredClone(snapshot);
        wrongTriggerCount.gameMode.fields.triggedGroups.items = [];
        assert.equal(serializer.isSupportedSnapshot(wrongTriggerCount), true);
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, wrongTriggerCount), false);

        const impossibleCamera = structuredClone(snapshot);
        impossibleCamera.gameMode.fields.maxCameraX = 257;
        assert.equal(serializer.isSupportedSnapshot(impossibleCamera), true);
        assert.equal(serializer.isSupportedSnapshotForLoadedResources({ stages: [stage] }, impossibleCamera), false);
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
        const invalidLayer = structuredClone(bomb);
        invalidLayer.layer = 8;
        assert.equal(policy.isEntityDurableFields("Bomb", invalidLayer, new Map()), false);

        const invalidStateDescriptor = policy.getEntityDurableFieldDescriptor("BossSuperTank");
        const invalidState = encodedRecordForDescriptor(invalidStateDescriptor, new Map());
        invalidState.state = 99;
        assert.equal(policy.isEntityDurableFields("BossSuperTank", invalidState, new Map()), false);

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

function createStageResource(width, height) {
    const tileMap = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
    const typesMap = Array.from({ length: height }, () => Array.from({ length: width }, () => 1));
    return {
        mapWidth: width,
        mapHeight: height,
        tileMap,
        typesMap,
        groups: [[[1, 1, 2, 2]]]
    };
}

function createGameModeSnapshot(version, fields, policy, stage) {
    const matrix = (rows) => ({
        kind: "array",
        items: rows.map((row) => ({ kind: "array", items: [...row] }))
    });
    const mainFields = Object.fromEntries(fields.MAIN_FIELD_NAMES.map((name) => [name, 0]));
    Object.assign(mainFields, {
        fading: false,
        fadeIndex: 0,
        fadeOut: false,
        extraLives: 0,
        score: 0,
        stageIndex: 0,
        hasMissiles: false,
        missilePower: 0,
        friendlySoldiersPickedUp: 0,
        hardMode: false,
        continued: false
    });

    const maxCameraX = (stage.mapWidth - 32) * 32;
    const maxCameraY = (stage.mapHeight - 31) * 32;
    const gameModeFields = Object.fromEntries(fields.GAME_MODE_FIELD_NAMES.map((name) => [name, 0]));
    Object.assign(gameModeFields, {
        tileMap: matrix(stage.tileMap),
        typesMap: matrix(stage.typesMap),
        triggedGroups: { kind: "array", items: [false] },
        waterAlphaIndex: 0,
        conveyorOffset: 0,
        conveyorLastIndex: 0,
        conveyorDelta: 0,
        cameraX: 0,
        cameraY: maxCameraY,
        maxCameraX,
        maxCameraY,
        paused: false,
        triggerY: stage.mapHeight,
        bossCameraPan: false,
        endingCameraPan: false,
        playing: true,
        cameraPanListener: null,
        stageIndex: 0,
        stageCompletedFlag: false,
        stageCompletedDelay: 228
    });

    return {
        version,
        appVersion: "resource-preflight-test",
        savedAt: "2026-09-20T00:00:00.000Z",
        kind: "game",
        mainFields,
        konamiCodeFields: null,
        random: { seed0: 1, seed1: 2, seed2: 3 },
        friendlySoldierCount: 0,
        requestedSongId: null,
        currentSongState: null,
        audioState: { sounds: [], cooldowns: [] },
        gameMode: {
            fields: gameModeFields,
            elements: [[], [], [], [], [], [], [], []],
            entities: []
        },
        playerFields: encodedRecordForDescriptor(policy.PLAYER_DURABLE_FIELD_DESCRIPTOR, new Map())
    };
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
                result[name] = field.allowedValues?.[0] ?? field.min ?? 0;
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
