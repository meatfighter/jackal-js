import type { GameContainer } from "slick2d-ts";
import { getDeploymentStorageKey } from "../../app/DeploymentStorageKeys.js";
import type { Main } from "../Main.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY, GAME_STATE_VERSION } from "./GameStateSchema.js";
import { JackalGameStateSerializer } from "./JackalGameStateSerializer.js";

export class JackalGameStateStore {
    private readonly serializer = new JackalGameStateSerializer();

    public constructor(private readonly appVersion: string) {}

    public save(main: Main): boolean {
        if (!main.isStateSaveReady()) {
            return false;
        }

        try {
            const snapshot = this.serializer.createSnapshot(main, this.appVersion);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(snapshot));
            return true;
        } catch (error) {
            console.warn("Unable to save Jackal game state.", error);
            return false;
        }
    }

    public restore(main: Main, gc: GameContainer): boolean {
        try {
            const snapshot = this.readSnapshot();
            if (snapshot === null) {
                return false;
            }

            this.serializer.restoreSnapshot(main, gc, snapshot);
            return true;
        } catch (error) {
            console.warn("Unable to restore Jackal game state.", error);
            return false;
        }
    }

    public hasValidSave(): boolean {
        try {
            return this.readSnapshot() !== null;
        } catch (error) {
            console.warn("Unable to inspect Jackal game state.", error);
            return false;
        }
    }

    public clear(): void {
        try {
            localStorage.removeItem(this.getStorageKey());
        } catch {}
    }

    private readSnapshot(): JackalGameStateSnapshot | null {
        const text = localStorage.getItem(this.getStorageKey());
        if (text === null) {
            return null;
        }

        let snapshot: unknown;
        try {
            snapshot = JSON.parse(text) as unknown;
        } catch {
            this.clear();
            return null;
        }

        if (!this.serializer.isSupportedSnapshot(snapshot)) {
            if (!isFutureGameStateSnapshot(snapshot)) {
                this.clear();
            }
            return null;
        }

        return snapshot;
    }

    private getStorageKey(): string {
        return getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    }
}

function isFutureGameStateSnapshot(snapshot: unknown): boolean {
    return isRecord(snapshot) && Number.isInteger(snapshot.version) && (snapshot.version as number) > GAME_STATE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
