# Static PWA Boot Fallback Timeout Handoff

Date: 2026-08-14

## Purpose

This note documents a PWA static boot-screen issue found in `jackal-js` and the fix applied here. It is intended for follow-up work in related browser ports such as `ms-pac-man-2010-js` and `stickvania-js`.

## Problem

The static HTML boot screen existed before the JavaScript app module loaded. It displayed animated dots, then used a fixed timer to switch to an "Unable to start" fallback page if the app had not replaced the boot screen quickly enough.

That fixed timer created a false failure on slow networks. During browser testing with throttling set to 3G, the user saw:

1. Static animated dots.
2. Static "Unable to start" page.
3. The real PWA menu after the JavaScript module finally downloaded and executed.

The failure page appeared even though the app was still downloading successfully. The timeout guessed that a slow download was a failed download.

## Root Cause

The static fallback had no knowledge of actual network progress. It only checked whether the static boot DOM node was still connected after a timeout.

That is not a reliable failure signal:

- A slow network can legitimately need more than 10 seconds, 60 seconds, or any chosen fixed threshold.
- The browser may still be downloading the module script successfully while the timeout fires.
- The PWA's real dynamic loading layer has its own resource failure handling after JavaScript starts, so the static page should not preempt that layer.

## Correct Behavior

The static boot screen should show failure only when there is an actual static app-shell load failure.

For slow-but-working downloads:

- Keep showing the animated dots indefinitely.
- Do not show an error just because a fixed amount of time elapsed.

For true module-script load failures:

- Show the static "Unable to start" fallback immediately.
- Keep the Retry button/link so the user can reload.

If JavaScript loads successfully:

- The app module replaces the static boot screen with the PWA menu or the app's dynamic loading UI.
- Any later resource/download failures should be handled by the app's dynamic error page, not the static HTML timeout.

## Jackal Implementation

In `jackal-js/index.html`, the fixed timeout was removed.

The app module script has a stable id:

```html
<script id="app-module-script" type="module" src="/src/main.ts?v=..."></script>
```

The static boot script listens for a captured resource error on that exact script element:

```js
window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.id === "app-module-script") {
        showStaticBootFailure();
    }
}, true);
```

The `true` capture parameter matters because script/link resource load errors do not behave like normal bubbling JavaScript exceptions.

The failure helper still checks whether the static boot node is connected before mutating it:

```js
function showStaticBootFailure() {
    if (!boot.isConnected) {
        return;
    }
    boot.classList.add("static-boot-failed");
}
```

That guard prevents stale static logic from changing the page after the app has already taken over.

## Version And Cache Update

Because this changed the PWA app shell, Jackal's app version/cache stamp was bumped:

- Version: `0.1.11`
- Build stamp: `20260814T063000Z`

The same principle should be followed in the other PWAs when their static shell changes: update any app version, service worker cache name, manifest URL query string, and module/resource query parameters used for cache busting.

## Guidance For Other PWAs

For `ms-pac-man-2010-js` and `stickvania-js`, look for static boot fallback logic in the root HTML or PWA shell. If there is a fixed `setTimeout(...)` that changes animated loading dots into a static error page, remove that timeout.

Replace it with an actual module-script error signal:

1. Give the root module script a stable id, for example `app-module-script`.
2. Add a capturing `window.addEventListener("error", ..., true)` listener.
3. In the listener, check `event.target.id === "app-module-script"`.
4. Show the static fallback only for that actual module load failure.
5. Keep the existing dynamic app-level loading failure page for failures after JavaScript has started.

Do not use a fixed timeout as a proxy for failure. Any chosen timeout can be wrong on a slow connection.

## Testing Checklist

Test the updated static shell with:

- Normal network: dots should be replaced quickly by the PWA menu/app.
- Slow 3G throttling: dots should remain until the app module loads; the static failure page should not appear just because loading is slow.
- Offline/no module available with no useful service worker cache: the script load error should show the static failure page.
- Cached PWA shell: if the module is served from cache, the app should start normally.
- Dynamic resource failure after app startup: the app's dynamic error UI should handle it, not the static shell.

## Concern

Removing the timeout means a browser/network stack that neither completes nor fails the module request could leave animated dots visible forever. That is preferable to a false error during slow-but-successful downloads, and real failed script loads should normally produce the captured `error` event.
