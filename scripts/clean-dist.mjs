import { cleanProductionDistDirectory, distDir } from "./build-utils.mjs";

cleanProductionDistDirectory(distDir);
console.log("Cleaned dist");
