import { createGameModePersistenceVerification } from "./GameModePersistenceVerification.js";
Reflect.set(window, "gameModePersistence", await createGameModePersistenceVerification());
