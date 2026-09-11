import "./styles.css";
import "./session-ownership.css";
import { GameSessionOwnership } from "./app/GameSessionOwnership.js";
import { JackalWebApp } from "./app/JackalWebApp.js";
declare global {
    interface Window {
        __jackalBooted?: boolean;
    }
}

const root = document.getElementById("app");
if (!(root instanceof HTMLElement)) {
    throw new Error("Jackal application root is missing.");
}

const app = new JackalWebApp(root, () => ownership);
const ownership = new GameSessionOwnership(
    root,
    () => {
        app.showMenu();
        window.__jackalBooted = true;
    },
    () => app.releaseSession()
);
ownership.start();
