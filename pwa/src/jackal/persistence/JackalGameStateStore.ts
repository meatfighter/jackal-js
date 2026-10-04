import { retainRejectedSave, type RejectedSaveStage } from "./RejectedSaveDebug.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";
import { isSupportedSnapshotForLoadedResources } from "./GameStateResourcePreflight.js";
import type { JackalGameStateSnapshot } from "./GameStateSnapshot.js";
import { snapshotWriteFailure } from "../../app/BrowserPersistence.js";
import type { GameContainer } from "slick2d-ts";
import type { Main } from "../Main.js";
import { clearStoredGameState, inspectStoredGameState, writeStoredGameState, type GameStateWriteResult } from "./GameStateStorage.js";
import { JackalGameStateSerializer } from "./JackalGameStateSerializer.js";

export class JackalGameStateStore {
    private readonly serializer = new JackalGameStateSerializer();

    public constructor(private readonly appVersion: string) {}

    public save(main: Main, isAuthorized: () => boolean): GameStateWriteResult {
        if (!main.isStateSaveReady()) return { saved: false, reason: "invalid-snapshot" };
        let snapshot: ReturnType<JackalGameStateSerializer["createSnapshot"]>;
        try {
            snapshot = this.serializer.createSnapshot(main, this.appVersion);
        } catch (error) {
            return snapshotWriteFailure("Jackal game state", "capture-failed", error);
        }
        return writeStoredGameState(snapshot, isAuthorized, (value) => this.validateOutgoingSnapshot(main, value, isAuthorized));
    }

    private validateOutgoingSnapshot(main: Main, snapshot: JackalGameStateSnapshot, isAuthorized: () => boolean): boolean {
        const checks: ReadonlyArray<readonly [RejectedSaveStage, () => boolean]> = [
            ["structure-and-graph", () => isSupportedGameStateSnapshot(snapshot)],
            ["loaded-resources", () => isSupportedSnapshotForLoadedResources(main, snapshot)]
        ];
        for (const [stage, check] of checks) {
            let valid: boolean;
            try {
                valid = check();
            } catch (error) {
                retainRejectedSave(snapshot, this.appVersion, { stage, kind: "threw", error }, isAuthorized);
                throw error;
            }
            if (!valid) {
                retainRejectedSave(snapshot, this.appVersion, { stage, kind: "returned-false" }, isAuthorized);
                return false;
            }
        }
        return true;
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
