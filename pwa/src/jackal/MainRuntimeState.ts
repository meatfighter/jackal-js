import type { GameMode } from "./GameMode.js";
import type { Main } from "./Main.js";

let activeMain: Main | null = null;
let activeGameMode: GameMode | null = null;

/** Installs a browser game session and clears any stale mode from the prior session. */
export function installMainRuntime(main: Main): void {
    activeMain = main;
    activeGameMode = null;
}

export function requireMainRuntime(): Main {
    if (activeMain === null) {
        throw new Error("Jackal Main runtime state is unavailable.");
    }
    return activeMain;
}

export function setMainRuntimeGameMode(gameMode: GameMode | null): void {
    if (activeMain === null) {
        throw new Error("Cannot install a Jackal game mode without an active Main instance.");
    }
    activeGameMode = gameMode;
}

export function requireMainRuntimeGameMode(): GameMode {
    if (activeGameMode === null) {
        throw new Error("Jackal GameMode runtime state is unavailable.");
    }
    return activeGameMode;
}

export function isMainRuntimeActive(main: Main): boolean {
    return activeMain === main;
}

/** Clears only the expected session so stale asynchronous work cannot dispose a newer game. */
export function clearMainRuntime(expectedMain: Main): boolean {
    if (activeMain !== expectedMain) {
        return false;
    }
    activeGameMode = null;
    activeMain = null;
    return true;
}
