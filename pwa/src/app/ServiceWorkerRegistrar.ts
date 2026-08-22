export function registerServiceWorker(buildStamp: string): void {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    if (import.meta.env.DEV) {
        void clearDevelopmentServiceWorkers().catch((error: unknown) => {
            console.warn("Unable to clear Jackal development service workers.", error);
        });
        return;
    }
    window.addEventListener("load", () => {
        const serviceWorkerUrl = new URL(`./sw.js?v=${encodeURIComponent(buildStamp)}`, window.location.href);
        void navigator.serviceWorker
            .register(serviceWorkerUrl, { scope: "./" })
            .then((registration) => {
                void registration.update();
            })
            .catch((error: unknown) => {
                console.warn("Unable to register Jackal service worker.", error);
            });
    });
}

async function clearDevelopmentServiceWorkers(): Promise<void> {
    const appScope = new URL("./", window.location.href).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => registration.scope === appScope).map((registration) => registration.unregister()));
    if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("jackal|") || key.startsWith("jackal-")).map((key) => caches.delete(key)));
    }
}
