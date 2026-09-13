export async function disableFullscreenPreference(page) {
    const fullscreenSwitch = page.locator("#fullscreen-switch-button").first();
    await fullscreenSwitch.waitFor({ state: "visible" });

    if (!(await fullscreenSwitch.isEnabled())) {
        return;
    }
    if ((await fullscreenSwitch.getAttribute("aria-pressed")) === "true") {
        await fullscreenSwitch.click();
    }
    if ((await fullscreenSwitch.getAttribute("aria-pressed")) !== "false") {
        throw new Error("Unable to disable the Fullscreen preference for a windowed browser qualification.");
    }
}
