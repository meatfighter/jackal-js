import { createEndingVerification } from "./EndingPersistenceVerification.js";
const fixture = await createEndingVerification();
Reflect.set(window, "endingReload", fixture);
