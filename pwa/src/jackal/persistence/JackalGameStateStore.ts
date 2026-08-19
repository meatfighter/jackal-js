import type { GameContainer } from "slick2d-ts";
import type { Main } from "../Main.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { GAME_STATE_STORAGE_KEY } from "./GameStateSchema.js";
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
            localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(snapshot));
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
            this.clear();
            return false;
        }
    }

    public hasValidSave(): boolean {
        try {
            return this.readSnapshot() !== null;
        } catch {
            this.clear();
            return false;
        }
    }

    public clear(): void {
        try {
            localStorage.removeItem(GAME_STATE_STORAGE_KEY);
        } catch {}
    }

    private readSnapshot(): JackalGameStateSnapshot | null {
        const text = localStorage.getItem(GAME_STATE_STORAGE_KEY);
        if (text === null) {
            return null;
        }

        const snapshot = JSON.parse(text) as unknown;
        if (!this.serializer.isSupportedSnapshot(snapshot)) {
            this.clear();
            return null;
        }

        return snapshot;
    }
}
