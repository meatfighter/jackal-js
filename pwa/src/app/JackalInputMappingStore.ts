import { Input } from "slick2d-ts";
import { ButtonMapping } from "../jackal/ButtonMapping.js";
import { DeploymentStorageEntry } from "./DeploymentStorage.js";
const NO_BINDING = -1;
const MAX_CONTROLLER_BUTTON_INDEX = 63;

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
            if (this.hasProtectedStoredSnapshot()) {
                return false;
            }
            const snapshot = {
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
            } satisfies JackalInputMappingSnapshot;
            if (!this.isSupportedSnapshot(snapshot)) {
                return false;
            }
            return this.storage.write(JSON.stringify(snapshot));
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

        let snapshot: unknown;
        try {
            snapshot = JSON.parse(stored.value);
        } catch {
            this.clear();
            return null;
        }

        if (!this.isSupportedSnapshot(snapshot)) {
            if (!this.shouldPreserveUnsupportedSnapshot(snapshot)) {
                this.clear();
            }
            return null;
        }

        return snapshot;
    }

    private hasProtectedStoredSnapshot(): boolean {
        const stored = this.storage.read();
        if (!stored.available) {
            return true;
        }
        if (stored.value === null) {
            return false;
        }

        try {
            return this.shouldPreserveUnsupportedSnapshot(JSON.parse(stored.value) as unknown);
        } catch {
            return false;
        }
    }

    private isSupportedSnapshot(snapshot: unknown): snapshot is JackalInputMappingSnapshot {
        const expectedFields = [
            "version",
            "keyUp",
            "keyDown",
            "keyLeft",
            "keyRight",
            "keyGrenade",
            "keyGun",
            "keyStart",
            "controllerUp",
            "controllerDown",
            "controllerLeft",
            "controllerRight",
            "controllerGrenade",
            "controllerGun",
            "controllerStart"
        ] as const;
        return (
            this.isRecord(snapshot) &&
            Object.keys(snapshot).length === expectedFields.length &&
            expectedFields.every((key) => Object.hasOwn(snapshot, key)) &&
            snapshot.version === JackalInputMappingStore.SNAPSHOT_VERSION &&
            this.isKeyBinding(snapshot.keyUp) &&
            this.isKeyBinding(snapshot.keyDown) &&
            this.isKeyBinding(snapshot.keyLeft) &&
            this.isKeyBinding(snapshot.keyRight) &&
            this.isKeyBinding(snapshot.keyGrenade) &&
            this.isKeyBinding(snapshot.keyGun) &&
            this.isKeyBinding(snapshot.keyStart) &&
            this.isControllerBinding(snapshot.controllerUp) &&
            this.isControllerBinding(snapshot.controllerDown) &&
            this.isControllerBinding(snapshot.controllerLeft) &&
            this.isControllerBinding(snapshot.controllerRight) &&
            this.isControllerActionBinding(snapshot.controllerGrenade) &&
            this.isControllerActionBinding(snapshot.controllerGun) &&
            this.isControllerActionBinding(snapshot.controllerStart) &&
            this.hasUniqueNonBindingValues([
                snapshot.keyUp,
                snapshot.keyDown,
                snapshot.keyLeft,
                snapshot.keyRight,
                snapshot.keyGrenade,
                snapshot.keyGun,
                snapshot.keyStart
            ]) &&
            this.hasUniqueNonBindingValues([
                snapshot.controllerUp,
                snapshot.controllerDown,
                snapshot.controllerLeft,
                snapshot.controllerRight,
                snapshot.controllerGrenade,
                snapshot.controllerGun,
                snapshot.controllerStart
            ])
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

    private isKeyBinding(value: unknown): value is number {
        return (
            value === NO_BINDING ||
            (typeof value === "number" &&
                Number.isInteger(value) &&
                Input.isBrowserKeyCodeSupported(value) &&
                !ButtonMapping.isReservedKey(value))
        );
    }

    private isControllerBinding(value: unknown): value is number {
        return (
            value === NO_BINDING ||
            (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_CONTROLLER_BUTTON_INDEX)
        );
    }

    private isControllerActionBinding(value: unknown): value is number {
        return this.isControllerBinding(value) && (value === NO_BINDING || value < ButtonMapping.DEFAULT_CONTROLLER_UP || value > ButtonMapping.DEFAULT_CONTROLLER_RIGHT);
    }

    private hasUniqueNonBindingValues(values: readonly number[]): boolean {
        const assigned = values.filter((value) => value !== NO_BINDING);
        return new Set(assigned).size === assigned.length;
    }
}
