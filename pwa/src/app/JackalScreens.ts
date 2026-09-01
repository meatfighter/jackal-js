export function renderLoadingScreen(root: HTMLElement, progress: number): void {
    const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
    const progressShell = root.querySelector<HTMLElement>("[data-loading-progress='true']");
    const progressBar = root.querySelector<HTMLElement>(".progress-bar");
    if (progressShell !== null && progressBar !== null) {
        progressShell.setAttribute("aria-valuenow", String(percent));
        progressBar.style.setProperty("--progress", `${percent}%`);
        return;
    }
    root.innerHTML = `
        <main class="boot-screen" role="status" aria-label="Loading">
            <section class="boot-progress" aria-live="polite">
                <div class="progress-shell" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" data-loading-progress="true">
                    <div class="progress-bar" style="--progress: ${percent}%"></div>
                </div>
            </section>
        </main>
    `;
}

export function renderLoadErrorScreen(root: HTMLElement, title: string, message: string): HTMLButtonElement | null {
    root.innerHTML = `
        <main class="boot-screen boot-failed" role="alert">
            <section class="load-error-panel" aria-label="${escapeHtml(title)}">
                <div class="failure-icon" aria-hidden="true">&#x1F480;</div>
                <div class="boot-title">${escapeHtml(title)}</div>
                <p class="boot-error">${escapeHtml(message)}</p>
                <button id="retry-button" class="retry-button" type="button">Retry</button>
            </section>
        </main>
    `;
    return root.querySelector<HTMLButtonElement>("#retry-button");
}

export function volumeIconSvg(value: number): string {
    const waves =
        Math.round(value * 100) === 0
            ? `<path d="M18 9l5 5m0-5l-5 5"></path>`
            : value < 0.33
              ? `<path d="M17 10a4 4 0 0 1 0 4"></path>`
              : value < 0.66
                ? `<path d="M17 8a6 6 0 0 1 0 8"></path><path d="M20 6a9 9 0 0 1 0 12"></path>`
                : `<path d="M17 8a6 6 0 0 1 0 8"></path><path d="M20 6a9 9 0 0 1 0 12"></path><path d="M23 4a12 12 0 0 1 0 16"></path>`;

    return `
        <svg viewBox="0 0 26 24" focusable="false" aria-hidden="true">
            <path d="M3 9v6h5l6 5V4L8 9H3z"></path>
            ${waves}
        </svg>`;
}

export function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
