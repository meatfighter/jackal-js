import { clearStoredGameState } from "../jackal/persistence/GameStateStorage.js";
import { clearPreferences, writeScalingPreference, writeVolume, type JackalScalingPreference } from "./AppPreferences.js";
import type { JackalInputMappingStore } from "./JackalInputMappingStore.js";
import type { PersistenceWarningController } from "./PersistenceWarningController.js";

export function persistVolumePreference(value: number, warnings: PersistenceWarningController): void {
    if (!writeVolume(value)) {
        warnings.report("Volume setting could not be saved.");
    }
}

export function persistScalingPreference(value: JackalScalingPreference, warnings: PersistenceWarningController): void {
    if (!writeScalingPreference(value)) {
        warnings.report("Scaling setting could not be saved.");
    }
}

export function clearPersistedPwaState(inputMappings: JackalInputMappingStore, warnings: PersistenceWarningController): void {
    const preferencesCleared = clearPreferences();
    const gameStateCleared = clearStoredGameState();
    const inputMappingCleared = inputMappings.clear();
    if (!preferencesCleared || !gameStateCleared || !inputMappingCleared) {
        warnings.report("Some saved Jackal settings could not be cleared.");
    }
}
