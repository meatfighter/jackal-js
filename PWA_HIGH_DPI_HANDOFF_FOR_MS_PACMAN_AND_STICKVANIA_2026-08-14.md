# PWA High-DPI Handoff for Ms. Pac-Man 2010 and Stickvania

Date: 2026-08-14

This is a documentation-only handoff. No code changes were made in `C:\js-projects\ms-pac-man-2010-js` or `C:\js-projects\stickvania-js`.

The hybrid Continue handoff does not cover high-DPI rendering. This file describes the high-DPI work separately.

## Purpose

Jackal now opts into the newer `slick2d-ts` high-DPI canvas path explicitly. The same approach should be reviewed for:

```text
C:\js-projects\ms-pac-man-2010-js
C:\js-projects\stickvania-js
```

The goal is sharper browser rendering on high-DPI displays while preserving Slick-style logical coordinates, game logic dimensions, input behavior, aspect-fit scaling, fullscreen behavior, and black bars.

This is intentionally a browser/PWA concern. It is not a Java Slick2D parity feature. Java/LWJGL desktop display pixels and browser canvas backing pixels are not the same abstraction.

## Engine Support Required

The dependent projects need a `slick2d-ts` build that includes the high-DPI canvas changes described in:

```text
C:\js-projects\slick2d-ts\SLICK2D_TS_DPI_AWARE_CANVAS_DEPENDENT_PROJECT_HANDOFF_2026-08-14.md
```

Current `slick2d-ts` support includes these browser helper APIs on `AppGameContainer`:

```ts
setHighDpiEnabled(enabled: boolean): void;
isHighDpiEnabled(): boolean;
setMaxDevicePixelRatio(maxDevicePixelRatio: number): void;
getDevicePixelRatio(): number;
getBackingWidth(): number;
getBackingHeight(): number;
```

The important engine behavior is:

1. Public Slick coordinates remain logical CSS pixels.
2. Canvas CSS size remains the logical game display size.
3. Canvas `width` and `height` become backing-store pixels.
4. WebGL viewport uses backing-store pixels.
5. WebGL projection remains based on logical size.
6. Input stays in logical coordinates.
7. `Display.getWidth()`, `Display.getHeight()`, `GameContainer.getWidth()`, and `GameContainer.getHeight()` stay logical.

Default engine behavior is currently:

```text
highDpiEnabled = true
maxDevicePixelRatio = 2
```

Even though those are defaults, dependent projects should set them explicitly so their PWA shell documents the intended policy and remains stable if engine defaults change later.

## Jackal Implementation

Jackal defines:

```ts
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;
```

In `src\app\JackalWebApp.ts`, after constructing the `AppGameContainer` and before starting/resizing it, Jackal does:

```ts
const appContainer = new AppGameContainer(scalableGame, displayMode.width, displayMode.height, false);
appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
```

The display mode passed to `AppGameContainer` is still logical CSS pixels:

```ts
const displayMode = this.getResponsiveWindowedDisplayMode();
```

Jackal did not change gameplay dimensions:

```ts
const scalableGame = new ScalableGame(mainGame as any, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT, true);
```

Jackal did not multiply any input coordinate by `window.devicePixelRatio`.

Jackal did not change `Main.DISPLAY_WIDTH`, `Main.DISPLAY_HEIGHT`, collision math, drawing coordinates, sprite sizes, map coordinates, or integer gameplay logic.

## Responsive Sizing Model

The PWA shell should continue to compute logical display sizes from the browser layout.

Jackal uses:

```ts
host.getBoundingClientRect();
host.clientWidth;
host.clientHeight;
window.visualViewport;
window.innerWidth;
window.innerHeight;
document.documentElement.clientWidth;
document.documentElement.clientHeight;
```

Those are CSS-pixel/layout measurements. They are correct inputs to `setDisplayMode(...)`.

Do not replace them with:

```ts
canvas.width;
canvas.height;
window.screen.width * window.devicePixelRatio;
window.screen.height * window.devicePixelRatio;
```

Those would mix backing pixels into logical layout math and break parity.

Jackal's aspect-fit helper remains purely logical:

```ts
function getAspectFitDisplayMode(width: number, height: number): { width: number; height: number } {
    const displayMode = normalizeDisplayMode(width, height);
    const gameAspectRatio = Main.DISPLAY_WIDTH / Main.DISPLAY_HEIGHT;
    const displayAspectRatio = displayMode.width / displayMode.height;
    if (displayAspectRatio > gameAspectRatio) {
        return normalizeDisplayMode(displayMode.height * gameAspectRatio, displayMode.height);
    }
    return normalizeDisplayMode(displayMode.width, displayMode.width / gameAspectRatio);
}

function normalizeDisplayMode(width: number, height: number): { width: number; height: number } {
    return {
        width: Math.max(1, Math.trunc(width)),
        height: Math.max(1, Math.trunc(height))
    };
}
```

The high-DPI backing-store multiplication happens inside `slick2d-ts`, not in the project shell.

## Applying to Ms. Pac-Man 2010

Target shell:

```text
C:\js-projects\ms-pac-man-2010-js\pwa\src\app\main.ts
```

Target style:

```text
C:\js-projects\ms-pac-man-2010-js\pwa\src\app\styles.css
```

Current relevant PWA behavior:

1. The shell dynamically imports `slick2d-ts`.
2. It constructs:

```ts
const scalableGame = new ScalableGame2(mainGame, 800, 600, true);
const appContainer = new AppGameContainer(scalableGame);
```

3. It then computes a logical responsive size:

```ts
const displayMode = getResponsiveWindowedDisplayMode();
await container.setDisplayMode(displayMode.width, displayMode.height, false);
```

4. It already uses `ResizeObserver`, `window.resize`, and `fullscreenchange` to call the responsive sizing path.
5. Its CSS already has `image-rendering: pixelated` for the game canvas.

Recommended project change:

1. Add constants near the other PWA constants:

```ts
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;
```

2. If the local `RuntimeContainer` type is used to call these APIs later, add:

```ts
setHighDpiEnabled(enabled: boolean): void;
setMaxDevicePixelRatio(maxDevicePixelRatio: number): void;
getDevicePixelRatio?(): number;
getBackingWidth?(): number;
getBackingHeight?(): number;
```

The getters are optional unless the project wants diagnostics. The setters are the important part.

3. Immediately after constructing `appContainer`, call:

```ts
appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
```

4. Keep `getResponsiveWindowedDisplayMode()` logical. Do not multiply its width/height by DPR.
5. Keep `ScalableGame2(mainGame, 800, 600, true)` unchanged.
6. Keep the existing canvas CSS sizing and `image-rendering: pixelated`.
7. Do not change `HumanInput`, `ScalableGame2`, or game mode coordinate math for high-DPI.

Ms. Pac-Man's current `getResponsiveWindowedDisplayMode()` returns the full host/browser logical size. That is compatible with high-DPI because `ScalableGame2` handles the game's logical scaling and the engine handles backing pixels.

## Applying to Stickvania

Target shell:

```text
C:\js-projects\stickvania-js\pwa\src\main.ts
```

Target style:

```text
C:\js-projects\stickvania-js\pwa\src\styles.css
```

Current relevant PWA behavior:

1. The shell statically imports `AppGameContainer` from `slick2d-ts`.
2. It defines game dimensions:

```ts
const GAME_WIDTH = 640;
const GAME_HEIGHT = 480;
const GAME_VIEWPORT_WIDTH = 512;
const GAME_VIEWPORT_HEIGHT = 416;
```

3. It constructs:

```ts
const scalableGame = new ScalableGame2(mainGame, GAME_WIDTH, GAME_HEIGHT, true);
const displayMode = getResponsiveWindowedDisplayMode();
const appContainer = new AppGameContainer(scalableGame, displayMode.width, displayMode.height, false);
```

4. It already uses aspect-fit sizing:

```ts
const gameAspectRatio = GAME_VIEWPORT_WIDTH / GAME_VIEWPORT_HEIGHT;
```

5. It already uses `ResizeObserver`, `window.resize`, and `fullscreenchange`.
6. Its CSS already has `image-rendering: pixelated` for the game canvas.

Recommended project change:

1. Add constants near the other PWA constants:

```ts
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;
```

2. Immediately after constructing `appContainer`, call:

```ts
appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
```

3. Keep `getResponsiveWindowedDisplayMode()`, `getResponsiveFullscreenDisplayMode()`, `getAspectFitDisplayMode()`, and `normalizeDisplayMode()` logical.
4. Keep `GAME_WIDTH`, `GAME_HEIGHT`, `GAME_VIEWPORT_WIDTH`, and `GAME_VIEWPORT_HEIGHT` unchanged.
5. Do not multiply keyboard, gamepad, mouse, pointer, or `Input` coordinates by DPR.
6. Do not change the game-side stage/camera/sprite coordinate system.
7. Keep `image-rendering: pixelated`.

Stickvania's aspect-fit logic is already the right place to preserve black bars and viewport shape. High-DPI should only make the backing store sharper after the logical display size has been chosen.

## What Not To Change

Do not make these changes in either project:

1. Do not multiply `setDisplayMode(width, height, ...)` arguments by `window.devicePixelRatio`.
2. Do not multiply `ScalableGame` or `ScalableGame2` dimensions by DPR.
3. Do not multiply `Input.getMouseX()` or `Input.getMouseY()` by DPR.
4. Do not rewrite game logic dimensions to backing pixels.
5. Do not use `canvas.width` or `canvas.height` for CSS layout.
6. Do not replace aspect-fit math with physical-pixel math.
7. Do not force texture filtering changes as part of DPI.
8. Do not add DPR work to the per-frame update/render path.

The only intended project-level DPI work is declaring the policy and calling the engine helpers at container setup.

## Performance Concerns

High-DPI rendering increases framebuffer size and fill rate.

Examples:

```text
DPR 1:  1024 x 960 logical -> 1024 x 960 backing
DPR 2:  1024 x 960 logical -> 2048 x 1920 backing
DPR 3:  1024 x 960 logical -> 2048 x 1920 backing with max DPR 2
```

The cap matters. A DPR 3 or DPR 4 mobile/desktop display can make full-screen canvas rendering significantly more expensive if left uncapped.

Use:

```ts
const MAX_DEVICE_PIXEL_RATIO = 2;
```

as the default policy for these games. If a project shows performance problems on mobile or high-resolution monitors, prefer lowering the cap to `1.5` before disabling high-DPI entirely.

Do not read `window.devicePixelRatio` or allocate helper objects every frame. The engine resolves DPR during canvas sizing. Project shells should only respond to resize/fullscreen/layout events.

## Browser Zoom Testing

Browser zoom can be used as one test signal because it often changes `window.devicePixelRatio` in desktop browsers.

However, browser zoom is not a perfect substitute for a real high-DPI display:

1. Zoom changes CSS layout as well as effective DPR.
2. Different browsers report zoom and DPR differently.
3. The visual result can be affected by OS display scaling.

Recommended test approach:

1. Test at 100% zoom on a normal DPR 1 display.
2. Test at 125%, 150%, and 200% browser zoom.
3. Test on a real high-DPI monitor or laptop panel if available.
4. Test fullscreen separately from windowed mode.
5. Inspect the canvas in dev tools:
   - CSS size should match the logical display mode.
   - `canvas.width` / `canvas.height` should be approximately CSS size multiplied by effective DPR, capped at 2.

Example expected result on a DPR 2 display:

```text
CSS canvas size:      1024px x 960px
Canvas backing size:  2048 x 1920
Game coordinates:     still 0..1024 and 0..960
```

## Manual Verification Matrix

For each project:

1. Windowed mode at DPR 1:
   - Visual size matches old behavior.
   - Canvas backing size equals logical/CSS size.
   - Input still works.
2. Windowed mode at DPR greater than 1:
   - Visual size matches old behavior.
   - Backing size is larger than CSS size.
   - Pixel art looks sharper or at least no softer than before.
   - Input still maps to the same game locations.
3. Browser resize:
   - Aspect fit remains correct.
   - Black bars remain correct.
   - No stretching outside the intended aspect ratio.
4. Fullscreen:
   - Game fills the monitor using the existing aspect-fit policy.
   - Black bars remain correct.
   - Hamburger visibility behavior is unchanged.
5. PWA menu and loading/error screens:
   - CSS menus are unaffected.
   - Overlay or menu alignment is unchanged.
6. Canvas diagnostics:
   - `container.getWidth()` and `container.getHeight()` remain logical.
   - `appContainer.getBackingWidth()` and `getBackingHeight()` report backing pixels.
   - `appContainer.getDevicePixelRatio()` is capped by `MAX_DEVICE_PIXEL_RATIO`.
7. Performance:
   - No obvious GPU/CPU spike beyond expected high-DPI fill-rate cost.
   - No per-frame allocations are introduced in project code.

## Existing Jackal Policy To Mirror

Mirror this policy unless there is a project-specific reason not to:

```ts
const HIGH_DPI_ENABLED = true;
const MAX_DEVICE_PIXEL_RATIO = 2;
```

and:

```ts
appContainer.setHighDpiEnabled(HIGH_DPI_ENABLED);
appContainer.setMaxDevicePixelRatio(MAX_DEVICE_PIXEL_RATIO);
```

This gives high-DPI sharpness on modern browsers while keeping the game port's parity-sensitive behavior in logical Slick coordinates.

