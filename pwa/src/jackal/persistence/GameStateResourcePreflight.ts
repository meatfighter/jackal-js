import { TILE_DEBRIS_SPRITE_TILE_FIELD } from "./EntityRuntimeFields.js";
import type { Main } from "../Main.js";
import type { EncodedValue, JackalGameStateSnapshot } from "./GameStateSnapshot.js";

export function isSupportedSnapshotForLoadedResources(main: Main, snapshot: JackalGameStateSnapshot): boolean {
    if (snapshot.kind !== "game") {
        return true;
    }
    const stageIndex = snapshot.mainFields.stageIndex;
    if (typeof stageIndex !== "number" || !Number.isInteger(stageIndex)) {
        return false;
    }
    const stage = main.stages[stageIndex];
    if (
        stage === undefined ||
        !Array.isArray(stage.tileMap) ||
        !Array.isArray(stage.typesMap) ||
        !Array.isArray(stage.groups) ||
        stage.tileMap.length === 0 ||
        stage.typesMap.length !== stage.tileMap.length ||
        stage.mapWidth <= 0 ||
        stage.mapHeight !== stage.tileMap.length
    ) {
        return false;
    }

    const fields = snapshot.gameMode.fields;
    const tileRows = encodedMatrixRows(fields.tileMap);
    const typeRows = encodedMatrixRows(fields.typesMap);
    const triggered = encodedArrayValues(fields.triggedGroups);
    if (
        tileRows === null ||
        typeRows === null ||
        triggered === null ||
        tileRows.length !== stage.tileMap.length ||
        typeRows.length !== stage.typesMap.length ||
        triggered.length !== stage.groups.length
    ) {
        return false;
    }

    const allowedTiles = new Set<number>();
    const allowedTypes = new Set<number>();
    for (const row of stage.tileMap) {
        for (const value of row) {
            allowedTiles.add(value);
        }
    }
    for (const row of stage.typesMap) {
        for (const value of row) {
            allowedTypes.add(value);
        }
    }
    for (const group of stage.groups) {
        for (const entry of group) {
            const tile = entry[2];
            const type = entry[3];
            if (typeof tile !== "number" || typeof type !== "number") {
                return false;
            }
            allowedTiles.add(tile);
            allowedTypes.add(type);
        }
    }

    for (let y = 0; y < stage.tileMap.length; y++) {
        const tileRow = tileRows[y];
        const typeRow = typeRows[y];
        if (tileRow === undefined || typeRow === undefined || tileRow.length !== stage.mapWidth || typeRow.length !== stage.mapWidth) {
            return false;
        }
        for (let x = 0; x < stage.mapWidth; x++) {
            const tile = tileRow[x];
            const type = typeRow[x];
            if (
                typeof tile !== "number" ||
                !Number.isInteger(tile) ||
                !allowedTiles.has(tile) ||
                typeof type !== "number" ||
                !Number.isInteger(type) ||
                !allowedTypes.has(type)
            ) {
                return false;
            }
        }
    }
    if (!triggered.every((value) => typeof value === "boolean")) {
        return false;
    }

    const initialMaxCameraX = (stage.mapWidth - 32) * 32;
    const initialMaxCameraY = (stage.mapHeight - 31) * 32;
    const numeric = (value: EncodedValue | undefined): value is number => typeof value === "number" && Number.isFinite(value);
    if (
        !numeric(fields.cameraX) ||
        !numeric(fields.cameraY) ||
        !numeric(fields.maxCameraX) ||
        !numeric(fields.maxCameraY) ||
        !numeric(fields.triggerY) ||
        fields.cameraX < 0 ||
        fields.cameraX > initialMaxCameraX ||
        fields.cameraY < 0 ||
        fields.cameraY > initialMaxCameraY ||
        fields.maxCameraX < 0 ||
        fields.maxCameraX > initialMaxCameraX ||
        fields.maxCameraY < 0 ||
        fields.maxCameraY > initialMaxCameraY ||
        fields.triggerY < 0 ||
        fields.triggerY > stage.mapHeight
    ) {
        return false;
    }

    for (const entity of snapshot.gameMode.entities) {
        if (entity.type !== "TileDebris") continue;
        const tile = entity.runtimeFields?.[TILE_DEBRIS_SPRITE_TILE_FIELD];
        if (typeof tile !== "number" || !Number.isInteger(tile) || tile < 0 || tile >= stage.tiles.length) return false;
        const image = stageIndex === 5 && tile < 16 ? main.conveyors[tile] : stage.tiles[tile];
        if (image === undefined || image === null) return false;
    }
    if (stageIndex === 5) {
        const frame = fields.conveyorLastIndex;
        if (
            typeof frame !== "number" ||
            !Number.isInteger(frame) ||
            frame < 0 ||
            frame >= 16 ||
            main.conveyors[frame] === null ||
            main.conveyors[frame] === undefined
        )
            return false;
    }

    // Conveyor animation fields are dormant outside stage 6. Their scalar
    // contracts have already been checked; historical zero is not required.
    return true;
}

function encodedArrayValues(value: EncodedValue | undefined): readonly EncodedValue[] | null {
    return value !== null && typeof value === "object" && !Array.isArray(value) && value.kind === "array" && Array.isArray(value.items) ? value.items : null;
}

function encodedMatrixRows(value: EncodedValue | undefined): readonly (readonly EncodedValue[])[] | null {
    const rows = encodedArrayValues(value);
    if (rows === null) {
        return null;
    }
    const result: EncodedValue[][] = [];
    for (const row of rows) {
        const values = encodedArrayValues(row);
        if (values === null) {
            return null;
        }
        result.push([...values]);
    }
    return result;
}
