import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function compileModule(source) {
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

function source(relativePath) {
    return readFileSync(new URL(`../pwa/src/jackal/persistence/${relativePath}`, import.meta.url), "utf8");
}

async function loadPersistenceValidation() {
    const schemaUrl = compileModule(source("GameStateSchema.ts"));
    const idsUrl = compileModule(source("GameElementTypeIds.ts"));
    const fieldsUrl = compileModule(source("GameStateFields.ts"));
    const runtimeFieldsUrl = compileModule(
        source("EntityRuntimeFields.ts")
            .replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`)
            .replace(`from "./GameStateSchema.js"`, `from "${schemaUrl}"`)
    );
    const validatorUrl = compileModule(
        source("GameStateSnapshotValidator.ts")
            .replace(`from "./GameStateSchema.js"`, `from "${schemaUrl}"`)
            .replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`)
            .replace(`from "./EntityRuntimeFields.js"`, `from "${runtimeFieldsUrl}"`)
            .replace(`from "./GameStateFields.js"`, `from "${fieldsUrl}"`)
    );

    const [schema, ids, fields, runtimeFields, validator] = await Promise.all([
        import(schemaUrl),
        import(idsUrl),
        import(fieldsUrl),
        import(runtimeFieldsUrl),
        import(validatorUrl)
    ]);
    return { schema, ids, fields, runtimeFields, validator };
}

function encodedFields(names, overrides = {}) {
    const result = {};
    for (const name of names) {
        result[name] = 0;
    }
    return Object.assign(result, overrides);
}

function baseSnapshot(fields, version) {
    return {
        version,
        appVersion: "test",
        savedAt: "2026-08-31T00:00:00.000Z",
        kind: "mode",
        mainFields: encodedFields(fields.MAIN_FIELD_NAMES, {
            loadIndex: 42,
            stageIndex: 0,
            hardMode: false
        }),
        konamiCodeFields: null,
        random: { seed0: 1, seed1: 2, seed2: 3 },
        friendlySoldierCount: 0,
        currentSongId: null,
        requestedSongId: null,
        currentSongState: null,
        audioState: { musicOn: true, soundOn: true }
    };
}

function modeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "INTRO_MAP",
        modeFields: encodedFields(fields.INTRO_MAP_MODE_FIELD_NAMES)
    };
}

function gameSnapshot(fields, version, entity) {
    return {
        ...baseSnapshot(fields, version),
        kind: "game",
        gameMode: {
            fields: encodedFields(fields.GAME_MODE_FIELD_NAMES),
            elements: [[entity.id], [], [], [], [], [], [], []],
            entities: [entity]
        },
        playerFields: {}
    };
}

test("save-state validator accepts v4 migration input and canonical v5 snapshots", async () => {
    const { fields, validator } = await loadPersistenceValidation();

    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 4)), true);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 5)), true);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 6)), false);

    const invalidSeed = modeSnapshot(fields, 5);
    invalidSeed.random.seed2 = 65536;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidSeed), false);
});

test("v5 entity runtime descriptors are exact and v4 remains descriptor-free", async () => {
    const { fields, validator } = await loadPersistenceValidation();
    const v5EnemyBullet = {
        id: 0,
        type: "EnemyBullet",
        fields: {},
        runtimeFields: { enemyBulletSprite: "yellow" }
    };

    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 5, v5EnemyBullet)), true);
    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 5, { id: 0, type: "EnemyBullet", fields: {} })), false);
    assert.equal(
        validator.isSupportedGameStateSnapshot(
            gameSnapshot(fields, 5, {
                id: 0,
                type: "EnemyBullet",
                fields: {},
                runtimeFields: { enemyBulletSprite: "yellow", extra: true }
            })
        ),
        false
    );
    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 4, { id: 0, type: "EnemyBullet", fields: {} })), true);
    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 4, v5EnemyBullet)), false);
});

test("runtime descriptor validators cover every browser-only entity asset choice", async () => {
    const { runtimeFields } = await loadPersistenceValidation();

    assert.equal(runtimeFields.isEntityRuntimeFields("EnemyBullet", { enemyBulletSprite: "cannonball" }, 5), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("EnemyBullet", { enemyBulletSprite: "other" }, 5), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("FloorGun", { floorGunPlain: false }, 5), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("FloorGun", { floorGunPlain: 0 }, 5), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("TileDebris", { tileDebrisSpriteTile: 17 }, 5), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("TileDebris", { tileDebrisSpriteTile: -1 }, 5), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("Bomb", undefined, 5), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("Bomb", {}, 5), false);
});
