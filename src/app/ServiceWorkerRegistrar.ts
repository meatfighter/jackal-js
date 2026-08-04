export function registerServiceWorker(buildStamp: string): void {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    if (import.meta.env.DEV) {
        void clearDevelopmentServiceWorkers();
        return;
    }
    window.addEventListener("load", () => {
        void navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(buildStamp)}`).then((registration) => {
            void registration.update();
        });
    });
}

async function clearDevelopmentServiceWorkers(): Promise<void> {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("jackal-")).map((key) => caches.delete(key)));
    }
}
