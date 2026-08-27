import "./styles.css";
import { JackalWebApp } from "./app/JackalWebApp.js";
declare global {
    interface Window {
        __jackalBooted?: boolean;
    }
}

new JackalWebApp(document.getElementById("app") as HTMLElement).showMenu();
window.__jackalBooted = true;
