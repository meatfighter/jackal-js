import { DeploymentStorageEntry } from "../../app/DeploymentStorage.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, MAX_GAME_STATE_TEXT_LENGTH } from "./GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";

const gameStateStorage = new DeploymentStorageEntry(GAME_STATE_STORAGE_KEY, "Jackal saved game state");

export type StoredGameStateInspection =
    { readonly status: "unavailable" | "missing" | "invalid" } | { readonly status: "current"; readonly snapshot: JackalGameStateSnapshot };

/** Read only this development epoch; old epochs use different deployment-scoped keys. */
export function inspectStoredGameState(): StoredGameStateInspection {
    const stored = gameStateStorage.read();
    if (!stored.available) {
        return { status: "unavailable" };
    }
    if (stored.value === null) {
        return { status: "missing" };
    }
    if (stored.value.length > MAX_GAME_STATE_TEXT_LENGTH) {
        gameStateStorage.remove();
        return { status: "invalid" };
    }
    let snapshot: unknown;
    try {
        snapshot = JSON.parse(stored.value) as unknown;
    } catch {
        gameStateStorage.remove();
        return { status: "invalid" };
    }
    if (isSupportedGameStateSnapshot(snapshot)) {
        return { status: "current", snapshot };
    }
    gameStateStorage.remove();
    return { status: "invalid" };
}

export function hasCurrentStoredGameState(): boolean {
    return inspectStoredGameState().status === "current";
}

/** A failed validation or write leaves the last successfully written snapshot intact. */
export function writeStoredGameState(snapshot: JackalGameStateSnapshot): boolean {
    try {
        if (!isSupportedGameStateSnapshot(snapshot)) {
            return false;
        }
        const text = JSON.stringify(snapshot);
        if (text.length > MAX_GAME_STATE_TEXT_LENGTH) {
            console.warn("Unable to save Jackal game state because the snapshot is unexpectedly large.");
            return false;
        }
        return gameStateStorage.write(text);
    } catch (error) {
        console.warn("Unable to encode Jackal saved game state.", error);
        return false;
    }
}

export function clearStoredGameState(): boolean {
    return gameStateStorage.remove();
}
