import { ButtonMapping } from "../jackal/ButtonMapping.js";

interface JackalInputMappingSnapshot {
    version: number;
    keyUp: number;
    keyDown: number;
    keyLeft: number;
    keyRight: number;
    keyGrenade: number;
    keyGun: number;
    keyStart: number;
    controller: boolean;
    controllerIndex: number;
    controllerUp: number;
    controllerDown: number;
    controllerLeft: number;
    controllerRight: number;
    controllerGrenade: number;
    controllerGun: number;
    controllerStart: number;
    gunKeyMapped: boolean;
}

export class JackalInputMappingStore {
    private static readonly STORAGE_KEY = "jackal.input-mapping";
    private static readonly SNAPSHOT_VERSION = 1;

    public save(buttonMapping: ButtonMapping): boolean {
        try {
            localStorage.setItem(JackalInputMappingStore.STORAGE_KEY, JSON.stringify({
                version: JackalInputMappingStore.SNAPSHOT_VERSION,
                keyUp: buttonMapping.keyUp,
                keyDown: buttonMapping.keyDown,
                keyLeft: buttonMapping.keyLeft,
                keyRight: buttonMapping.keyRight,
                keyGrenade: buttonMapping.keyGrenade,
                keyGun: buttonMapping.keyGun,
                keyStart: buttonMapping.keyStart,
                controller: buttonMapping.controller,
                controllerIndex: buttonMapping.controllerIndex,
                controllerUp: buttonMapping.controllerUp,
                controllerDown: buttonMapping.controllerDown,
                controllerLeft: buttonMapping.controllerLeft,
                controllerRight: buttonMapping.controllerRight,
                controllerGrenade: buttonMapping.controllerGrenade,
                controllerGun: buttonMapping.controllerGun,
                controllerStart: buttonMapping.controllerStart,
                gunKeyMapped: buttonMapping.gunKeyMapped
            } satisfies JackalInputMappingSnapshot));
            return true;
        } catch (error) {
            console.warn("Unable to save Jackal input mapping.", error);
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
            buttonMapping.controller = snapshot.controller;
            buttonMapping.controllerIndex = snapshot.controllerIndex;
            buttonMapping.controllerUp = snapshot.controllerUp;
            buttonMapping.controllerDown = snapshot.controllerDown;
            buttonMapping.controllerLeft = snapshot.controllerLeft;
            buttonMapping.controllerRight = snapshot.controllerRight;
            buttonMapping.controllerGrenade = snapshot.controllerGrenade;
            buttonMapping.controllerGun = snapshot.controllerGun;
            buttonMapping.controllerStart = snapshot.controllerStart;
            buttonMapping.gunKeyMapped = snapshot.gunKeyMapped;
            return true;
        } catch (error) {
            console.warn("Unable to restore Jackal input mapping.", error);
            this.clear();
            return false;
        }
    }

    public clear(): void {
        try {
            localStorage.removeItem(JackalInputMappingStore.STORAGE_KEY);
        } catch {
            // Storage can be disabled in hardened/private browser contexts.
        }
    }

    private readSnapshot(): JackalInputMappingSnapshot | null {
        const text = localStorage.getItem(JackalInputMappingStore.STORAGE_KEY);
        if (text === null) {
            return null;
        }

        const snapshot = JSON.parse(text) as JackalInputMappingSnapshot;
        if (!this.isSupportedSnapshot(snapshot)) {
            this.clear();
            return null;
        }

        return snapshot;
    }

    private isSupportedSnapshot(snapshot: JackalInputMappingSnapshot): boolean {
        return snapshot !== null
            && typeof snapshot === "object"
            && snapshot.version === JackalInputMappingStore.SNAPSHOT_VERSION
            && this.isInteger(snapshot.keyUp)
            && this.isInteger(snapshot.keyDown)
            && this.isInteger(snapshot.keyLeft)
            && this.isInteger(snapshot.keyRight)
            && this.isInteger(snapshot.keyGrenade)
            && this.isInteger(snapshot.keyGun)
            && this.isInteger(snapshot.keyStart)
            && typeof snapshot.controller === "boolean"
            && this.isInteger(snapshot.controllerIndex)
            && this.isInteger(snapshot.controllerUp)
            && this.isInteger(snapshot.controllerDown)
            && this.isInteger(snapshot.controllerLeft)
            && this.isInteger(snapshot.controllerRight)
            && this.isInteger(snapshot.controllerGrenade)
            && this.isInteger(snapshot.controllerGun)
            && this.isInteger(snapshot.controllerStart)
            && typeof snapshot.gunKeyMapped === "boolean";
    }

    private isInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0;
    }
}
