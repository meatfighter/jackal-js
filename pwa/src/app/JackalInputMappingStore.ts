import type { ButtonMapping } from "../jackal/ButtonMapping.js";
import { DeploymentStorageEntry } from "./DeploymentStorage.js";
const NO_BINDING = -1;

interface JackalInputMappingSnapshot {
    version: number;
    keyUp: number;
    keyDown: number;
    keyLeft: number;
    keyRight: number;
    keyGrenade: number;
    keyGun: number;
    keyStart: number;
    controllerUp: number;
    controllerDown: number;
    controllerLeft: number;
    controllerRight: number;
    controllerGrenade: number;
    controllerGun: number;
    controllerStart: number;
}

export class JackalInputMappingStore {
    private static readonly SNAPSHOT_VERSION = 2;
    private static readonly FIRST_PUBLIC_SNAPSHOT_VERSION = 2;
    private readonly storage = new DeploymentStorageEntry("jackal.input-mapping", "Jackal input mapping");

    public save(buttonMapping: ButtonMapping): boolean {
        try {
            return this.storage.write(
                JSON.stringify({
                    version: JackalInputMappingStore.SNAPSHOT_VERSION,
                    keyUp: buttonMapping.keyUp,
                    keyDown: buttonMapping.keyDown,
                    keyLeft: buttonMapping.keyLeft,
                    keyRight: buttonMapping.keyRight,
                    keyGrenade: buttonMapping.keyGrenade,
                    keyGun: buttonMapping.keyGun,
                    keyStart: buttonMapping.keyStart,
                    controllerUp: buttonMapping.controllerUp,
                    controllerDown: buttonMapping.controllerDown,
                    controllerLeft: buttonMapping.controllerLeft,
                    controllerRight: buttonMapping.controllerRight,
                    controllerGrenade: buttonMapping.controllerGrenade,
                    controllerGun: buttonMapping.controllerGun,
                    controllerStart: buttonMapping.controllerStart
                } satisfies JackalInputMappingSnapshot)
            );
        } catch (error) {
            console.warn("Unable to encode Jackal input mapping.", error);
            return false;
        }
    }

    public restore(buttonMapping: ButtonMapping): boolean {
        try {
            const snapshot = this.readSnapshot();
            if (snapshot === null) {
                return false;
            }
            buttonMapping.keyUp = snapshot.keyUp;
            buttonMapping.keyDown = snapshot.keyDown;
            buttonMapping.keyLeft = snapshot.keyLeft;
            buttonMapping.keyRight = snapshot.keyRight;
            buttonMapping.keyGrenade = snapshot.keyGrenade;
            buttonMapping.keyGun = snapshot.keyGun;
            buttonMapping.keyStart = snapshot.keyStart;
            buttonMapping.controllerUp = snapshot.controllerUp;
            buttonMapping.controllerDown = snapshot.controllerDown;
            buttonMapping.controllerLeft = snapshot.controllerLeft;
            buttonMapping.controllerRight = snapshot.controllerRight;
            buttonMapping.controllerGrenade = snapshot.controllerGrenade;
            buttonMapping.controllerGun = snapshot.controllerGun;
            buttonMapping.controllerStart = snapshot.controllerStart;
            return true;
        } catch (error) {
            console.warn("Unable to restore Jackal input mapping.", error);
            this.clear();
            return false;
        }
    }

    public clear(): boolean {
        return this.storage.remove();
    }

    private readSnapshot(): JackalInputMappingSnapshot | null {
        const stored = this.storage.read();
        if (!stored.available || stored.value === null) {
            return null;
        }

        const snapshot: unknown = JSON.parse(stored.value);
        if (!this.isSupportedSnapshot(snapshot)) {
            if (!this.shouldPreserveUnsupportedSnapshot(snapshot)) {
                this.clear();
            }
            return null;
        }

        return snapshot;
    }

    private isSupportedSnapshot(snapshot: unknown): snapshot is JackalInputMappingSnapshot {
        return (
            this.isRecord(snapshot) &&
            snapshot.version === JackalInputMappingStore.SNAPSHOT_VERSION &&
            this.isBinding(snapshot.keyUp) &&
            this.isBinding(snapshot.keyDown) &&
            this.isBinding(snapshot.keyLeft) &&
            this.isBinding(snapshot.keyRight) &&
            this.isBinding(snapshot.keyGrenade) &&
            this.isBinding(snapshot.keyGun) &&
            this.isBinding(snapshot.keyStart) &&
            this.isBinding(snapshot.controllerUp) &&
            this.isBinding(snapshot.controllerDown) &&
            this.isBinding(snapshot.controllerLeft) &&
            this.isBinding(snapshot.controllerRight) &&
            this.isBinding(snapshot.controllerGrenade) &&
            this.isBinding(snapshot.controllerGun) &&
            this.isBinding(snapshot.controllerStart)
        );
    }

    private shouldPreserveUnsupportedSnapshot(snapshot: unknown): boolean {
        if (!this.isRecord(snapshot)) {
            return false;
        }
        const version = snapshot.version;
        return (
            typeof version === "number" &&
            Number.isInteger(version) &&
            version >= JackalInputMappingStore.FIRST_PUBLIC_SNAPSHOT_VERSION &&
            version !== JackalInputMappingStore.SNAPSHOT_VERSION
        );
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    private isInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0;
    }

    private isBinding(value: unknown): value is number {
        return value === NO_BINDING || this.isInteger(value);
    }
}
