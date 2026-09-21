import { clearStoredGameState } from "../jackal/persistence/GameStateStorage.js";
import { clearPreferences } from "./AppPreferences.js";
import type { JackalInputMappingStore } from "./JackalInputMappingStore.js";

export function clearPersistedPwaState(inputMappings: JackalInputMappingStore, isAuthorized: () => boolean): boolean {
    if (!isAuthorized()) return false;
    const preferencesCleared = clearPreferences(isAuthorized);
    if (!isAuthorized()) return false;
    const gameStateCleared = clearStoredGameState(isAuthorized);
    if (!isAuthorized()) return false;
    const inputMappingCleared = inputMappings.clear(isAuthorized);
    return preferencesCleared && gameStateCleared && inputMappingCleared;
}
