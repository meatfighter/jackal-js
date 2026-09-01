import { DeploymentStorageEntry } from "../../app/DeploymentStorage.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, isFutureGameStateSnapshot } from "./GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";

const gameStateStorage = new DeploymentStorageEntry(GAME_STATE_STORAGE_KEY, "Jackal saved game state");

export type StoredGameStateInspection =
    { readonly status: "unavailable" | "missing" | "invalid" | "future" } | { readonly status: "current"; readonly snapshot: JackalGameStateSnapshot };

/** Reads and validates the one current schema. Malformed and obsolete saves are discarded; future saves are preserved. */
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
    if (isFutureGameStateSnapshot(snapshot)) {
        return { status: "future" };
    }

    gameStateStorage.remove();
    return { status: "invalid" };
}

export function hasCurrentStoredGameState(): boolean {
    return inspectStoredGameState().status === "current";
}

export function writeStoredGameState(snapshot: JackalGameStateSnapshot): boolean {
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
