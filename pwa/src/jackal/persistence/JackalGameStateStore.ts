import type { GameContainer } from "slick2d-ts";
import type { Main } from "../Main.js";
import { clearStoredGameState, inspectStoredGameState, writeStoredGameState, type GameStateWriteResult } from "./GameStateStorage.js";
import { JackalGameStateSerializer } from "./JackalGameStateSerializer.js";

export class JackalGameStateStore {
    private readonly serializer = new JackalGameStateSerializer();

    public constructor(private readonly appVersion: string) {}

    public save(main: Main, isAuthorized: () => boolean): GameStateWriteResult {
        if (!main.isStateSaveReady()) {
            return { saved: false, reason: "invalid-snapshot" };
        }
        try {
            return writeStoredGameState(this.serializer.createSnapshot(main, this.appVersion), isAuthorized);
        } catch (error) {
            console.warn("Unable to save Jackal game state.", error);
            return { saved: false, reason: "encode-failed" };
        }
    }

    public restore(main: Main, gc: GameContainer): boolean {
        try {
            const stored = inspectStoredGameState();
            if (stored.status !== "current") {
                return false;
            }
            this.serializer.restoreSnapshot(main, gc, stored.snapshot);
            return true;
        } catch (error) {
            console.warn("Unable to restore Jackal game state.", error);
            return false;
        }
    }

    public hasValidSave(): boolean {
        return inspectStoredGameState().status === "current";
    }

    public clear(isAuthorized: () => boolean): boolean {
        return clearStoredGameState(isAuthorized);
    }
}
