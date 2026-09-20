import { DeploymentStorageEntry } from "../../app/DeploymentStorage.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, GAME_STATE_VERSION, MAX_GAME_STATE_TEXT_LENGTH } from "./GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";

const gameStateStorage = new DeploymentStorageEntry(GAME_STATE_STORAGE_KEY, "Jackal saved game state");

export type StoredGameStateInspection =
    | { readonly status: "read-failed" }
    | { readonly status: "missing" }
    | { readonly status: "invalid" }
    | { readonly status: "unsupported-future"; readonly version: number }
    | { readonly status: "current"; readonly snapshot: JackalGameStateSnapshot };

export type GameStateWriteResult =
    | { readonly saved: true }
    | {
          readonly saved: false;
          readonly reason:
              | "not-authorized"
              | "invalid-snapshot"
              | "read-failed"
              | "invalid-existing"
              | "unsupported-future"
              | "encode-failed"
              | "too-large"
              | "write-failed";
      };

/** Read-only inspection. Incompatible data is retained until an explicitly owned clear/reset. */
export function inspectStoredGameState(): StoredGameStateInspection {
    const stored = gameStateStorage.read();
    if (!stored.available) {
        return { status: "read-failed" };
    }
    if (stored.value === null) {
        return { status: "missing" };
    }
    if (stored.value.length > MAX_GAME_STATE_TEXT_LENGTH) {
        return { status: "invalid" };
    }

    let snapshot: unknown;
    try {
        snapshot = JSON.parse(stored.value) as unknown;
    } catch {
        return { status: "invalid" };
    }

    if (isSupportedGameStateSnapshot(snapshot)) {
        return { status: "current", snapshot };
    }
    if (
        snapshot !== null &&
        typeof snapshot === "object" &&
        !Array.isArray(snapshot) &&
        Object.hasOwn(snapshot, "version")
    ) {
        const version = Reflect.get(snapshot, "version");
        if (typeof version === "number" && Number.isInteger(version) && version > GAME_STATE_VERSION) {
            return { status: "unsupported-future", version };
        }
    }
    return { status: "invalid" };
}

export function hasCurrentStoredGameState(): boolean {
    return inspectStoredGameState().status === "current";
}

/**
 * Automatic writes preserve unknown/corrupt/future data and require live write
 * authority at the actual storage boundary. Explicit New Game/Reset clears first.
 */
export function writeStoredGameState(snapshot: JackalGameStateSnapshot, isAuthorized: () => boolean): GameStateWriteResult {
    try {
        if (!isSupportedGameStateSnapshot(snapshot)) {
            return { saved: false, reason: "invalid-snapshot" };
        }

        const existing = inspectStoredGameState();
        switch (existing.status) {
            case "read-failed":
                return { saved: false, reason: "read-failed" };
            case "invalid":
                return { saved: false, reason: "invalid-existing" };
            case "unsupported-future":
                return { saved: false, reason: "unsupported-future" };
            case "missing":
            case "current":
                break;
        }

        let text: string;
        try {
            text = JSON.stringify(snapshot);
        } catch {
            return { saved: false, reason: "encode-failed" };
        }
        if (text.length > MAX_GAME_STATE_TEXT_LENGTH) {
            console.warn("Unable to save Jackal game state because the snapshot is unexpectedly large.");
            return { saved: false, reason: "too-large" };
        }

        if (!isAuthorized()) {
            return { saved: false, reason: "not-authorized" };
        }
        return gameStateStorage.write(text) ? { saved: true } : { saved: false, reason: "write-failed" };
    } catch (error) {
        console.warn("Unable to encode Jackal saved game state.", error);
        return { saved: false, reason: "encode-failed" };
    }
}

export function clearStoredGameState(): boolean {
    return gameStateStorage.remove();
}
