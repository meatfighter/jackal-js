import { DeploymentStorageEntry } from "../../app/DeploymentStorage.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, shouldPreserveUnsupportedGameStateSnapshot } from "./GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";

const gameStateStorage = new DeploymentStorageEntry(GAME_STATE_STORAGE_KEY, "Jackal saved game state");

export type StoredGameStateInspection =
    { readonly status: "unavailable" | "missing" | "invalid" | "preserved" } | { readonly status: "current"; readonly snapshot: JackalGameStateSnapshot };

/** Reads the current schema, discarding malformed or obsolete data while preserving future versions. */
export function inspectStoredGameState(): StoredGameStateInspection {
    const stored = gameStateStorage.read();
    if (!stored.available) {
        return { status: "unavailable" };
    }
    if (stored.value === null) {
        return { status: "missing" };
    }

    let snapshot: unknown;
    try {
        snapshot = JSON.parse(stored.value);
    } catch {
        gameStateStorage.remove();
        return { status: "invalid" };
    }

    if (isSupportedGameStateSnapshot(snapshot)) {
        return { status: "current", snapshot };
    }
    if (shouldPreserveUnsupportedGameStateSnapshot(snapshot)) {
        return { status: "preserved" };
    }

    gameStateStorage.remove();
    return { status: "invalid" };
}

export function hasCurrentStoredGameState(): boolean {
    return inspectStoredGameState().status === "current";
}

export function writeStoredGameState(snapshot: JackalGameStateSnapshot): boolean {
    const stored = inspectStoredGameState();
    if (stored.status === "preserved" || stored.status === "unavailable") {
        return false;
    }

    try {
        return gameStateStorage.write(JSON.stringify(snapshot));
    } catch (error) {
        console.warn("Unable to encode Jackal saved game state.", error);
        return false;
    }
}

export function clearStoredGameState(): boolean {
    return gameStateStorage.remove();
}
