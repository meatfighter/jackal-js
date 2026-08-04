import { defineConfig } from "vite";
import versionInfo from "./version.json";

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(versionInfo.version),
        __BUILD_STAMP__: JSON.stringify(versionInfo.buildStamp)
    },
    server: {
        host: "127.0.0.1",
        port: 5173
    }
});
