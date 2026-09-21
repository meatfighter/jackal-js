import { DeploymentStorageEntry } from "../../app/DeploymentStorage.js";
import { getDeploymentStorageKey } from "../../app/DeploymentStorageKeys.js";
import { writeCurrentSnapshot, removePreference, type SnapshotWriteResult } from "../../app/BrowserPersistence.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, MAX_GAME_STATE_TEXT_LENGTH } from "./GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";

const gameStateStorage = new DeploymentStorageEntry(GAME_STATE_STORAGE_KEY, "Jackal saved game state");
export type StoredGameStateInspection =
    | { readonly status: "read-failed" }
    | { readonly status: "missing" }
    | { readonly status: "invalid" }
    | { readonly status: "current"; readonly snapshot: JackalGameStateSnapshot };
export type GameStateWriteResult = SnapshotWriteResult;

/** Inspection has no mutation capability. */
export function inspectStoredGameState(): StoredGameStateInspection {
    const stored = gameStateStorage.read();
    if (!stored.available) return { status: "read-failed" };
    if (stored.value === null) return { status: "missing" };
    if (stored.value.length > MAX_GAME_STATE_TEXT_LENGTH) return { status: "invalid" };
    try {
        const snapshot: unknown = JSON.parse(stored.value);
        return isSupportedGameStateSnapshot(snapshot) ? { status: "current", snapshot } : { status: "invalid" };
    } catch {
        return { status: "invalid" };
    }
}
export function hasCurrentStoredGameState(): boolean {
    return inspectStoredGameState().status === "current";
}
export function writeStoredGameState(snapshot: JackalGameStateSnapshot, isAuthorized: () => boolean): GameStateWriteResult {
    return writeCurrentSnapshot("Jackal game state", getDeploymentStorageKey(GAME_STATE_STORAGE_KEY), snapshot,
        isSupportedGameStateSnapshot, MAX_GAME_STATE_TEXT_LENGTH, isAuthorized);
}
export function clearStoredGameState(isAuthorized: () => boolean): boolean {
    return removePreference("Jackal game state", getDeploymentStorageKey(GAME_STATE_STORAGE_KEY), isAuthorized);
}
