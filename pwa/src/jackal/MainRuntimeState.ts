import type { GameMode } from "./GameMode.js";
import type { Main } from "./Main.js";
export const MainRuntimeState: {
    mainInstance: Main | null;
    gameMode: GameMode | null;
} = {
    mainInstance: null,
    gameMode: null
};
