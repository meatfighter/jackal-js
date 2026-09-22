import "./styles.css";
import "./fullscreen.css";
import "./session-ownership.css";
import { GameSessionOwnership } from "./app/GameSessionOwnership.js";
import { JackalWebApp } from "./app/JackalWebApp.js";

const bootstrap = Reflect.get(window, "__jackalBootstrap") as { claim(): boolean } | undefined;
if (bootstrap === undefined || bootstrap.claim()) {
    try {
        startApplication();
    } catch (error) {
        console.error("Application startup failed.", error);
        const root = document.getElementById("app");
        if (root !== null) {
            root.innerHTML =
                '<main role="alert" class="boot-screen boot-failed"><section class="load-error-panel"><p>Unable to start. Reload this tab.</p><a href="">Reload</a></section></main>';
            if (document.hasFocus()) root.querySelector<HTMLAnchorElement>("a")?.focus();
        }
    }
}

function startApplication(): void {
    const root = document.getElementById("app");
    if (!(root instanceof HTMLElement)) {
        throw new Error("Jackal application root is missing.");
    }

    const app = new JackalWebApp(root, () => ownership);
    const ownership = new GameSessionOwnership(
        root,
        () => {
            app.showMenu();
        },
        () => app.releaseSession()
    );
    ownership.start();
}
