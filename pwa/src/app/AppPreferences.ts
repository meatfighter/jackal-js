import { DeploymentStorageEntry } from "./DeploymentStorage.js";

export const VOLUME_STORAGE_KEY = "jackal-volume";
export const SCALING_STORAGE_KEY = "jackal-scaling";
export const FULLSCREEN_STORAGE_KEY = "jackal-fullscreen";
export const DIFFICULTY_STORAGE_KEY = "jackal-difficulty";
export const DEFAULT_VOLUME = 0.1;
export const DEFAULT_SCALING_PREFERENCE: JackalScalingPreference = "smooth";
export const DEFAULT_FULLSCREEN_PREFERENCE = true;
export const DEFAULT_HARD_MODE = false;

export const SCALING_MODE_DEFINITIONS = [
    { value: "smooth", label: "Smooth" },
    { value: "crisp", label: "Crisp" },
    { value: "pixel-perfect", label: "Pixel Perfect" }
] as const;

export type ScalingModeDefinition = (typeof SCALING_MODE_DEFINITIONS)[number];
export type JackalScalingPreference = ScalingModeDefinition["value"];

const volumeStorage = new DeploymentStorageEntry(VOLUME_STORAGE_KEY, "Jackal volume preference");
const scalingStorage = new DeploymentStorageEntry(SCALING_STORAGE_KEY, "Jackal scaling preference");
const fullscreenStorage = new DeploymentStorageEntry(FULLSCREEN_STORAGE_KEY, "Jackal fullscreen preference");
const difficultyStorage = new DeploymentStorageEntry(DIFFICULTY_STORAGE_KEY, "Jackal difficulty preference");

export function readVolume(): number {
    const result = volumeStorage.read();
    if (!result.available || result.value === null) {
        return DEFAULT_VOLUME;
    }
    const percent = Number.parseInt(result.value, 10);
    return Number.isFinite(percent) ? Math.max(0, Math.min(1, percent / 100)) : DEFAULT_VOLUME;
}

export function writeVolume(value: number): boolean {
    return volumeStorage.write(String(Math.round(value * 100)));
}

function clearVolume(): boolean {
    return volumeStorage.remove();
}

export function readScalingPreference(): JackalScalingPreference {
    const result = scalingStorage.read();
    if (!result.available || result.value === null) {
        return DEFAULT_SCALING_PREFERENCE;
    }
    if (isScalingPreference(result.value)) {
        return result.value;
    }
    return DEFAULT_SCALING_PREFERENCE;
}

export function writeScalingPreference(value: JackalScalingPreference): boolean {
    return scalingStorage.write(value);
}

function clearScalingPreference(): boolean {
    return scalingStorage.remove();
}

export function readFullscreenPreference(): boolean {
    const result = fullscreenStorage.read();
    if (!result.available || result.value === null) {
        return DEFAULT_FULLSCREEN_PREFERENCE;
    }
    if (result.value === "true") {
        return true;
    }
    if (result.value === "false") {
        return false;
    }
    return DEFAULT_FULLSCREEN_PREFERENCE;
}

export function writeFullscreenPreference(value: boolean): boolean {
    return fullscreenStorage.write(String(value));
}

function clearFullscreenPreference(): boolean {
    return fullscreenStorage.remove();
}

export function readDifficultyPreference(): boolean {
    const result = difficultyStorage.read();
    if (!result.available || result.value === null) {
        return DEFAULT_HARD_MODE;
    }
    if (result.value === "hard") {
        return true;
    }
    if (result.value === "normal") {
        return false;
    }
    return DEFAULT_HARD_MODE;
}

export function writeDifficultyPreference(hardMode: boolean): boolean {
    return difficultyStorage.write(hardMode ? "hard" : "normal");
}

function clearDifficultyPreference(): boolean {
    return difficultyStorage.remove();
}

export function clearPreferences(): boolean {
    const volumeCleared = clearVolume();
    const scalingCleared = clearScalingPreference();
    const fullscreenCleared = clearFullscreenPreference();
    const difficultyCleared = clearDifficultyPreference();
    return volumeCleared && scalingCleared && fullscreenCleared && difficultyCleared;
}

export function isScalingPreference(value: unknown): value is JackalScalingPreference {
    return typeof value === "string" && SCALING_MODE_DEFINITIONS.some((definition) => definition.value === value);
}

export function getScalingDefinition(value: JackalScalingPreference): ScalingModeDefinition {
    return SCALING_MODE_DEFINITIONS.find((definition) => definition.value === value) ?? SCALING_MODE_DEFINITIONS[0];
}

export function clampVolume(value: number, fallback: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
