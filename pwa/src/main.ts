import "./styles.css";
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

new JackalWebApp(root).showMenu();
window.__jackalBooted = true;
