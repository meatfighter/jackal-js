# slick2d-ts DPI-Aware Canvas Fix

Date: 2026-08-14

Project needing the engine fix: `C:\js-projects\slick2d-ts`

Consumer that exposed the issue: `C:\js-projects\jackal-js`

## Purpose

The current browser port scales Jackal correctly into the available browser area, including black bars and aspect-fit behavior, but it does not render the WebGL canvas at high-DPI backing resolution. On displays where `window.devicePixelRatio > 1`, the canvas drawing buffer is the same size as the CSS layout box. The browser then upscales that lower-resolution buffer to the physical display pixels.

The result is functionally correct but softer than it should be on high-DPI desktop monitors, high-DPI laptop displays, and mobile screens.

This is an engine-level issue in `slick2d-ts`, not a Jackal game-logic issue. The correct repair should make `slick2d-ts` separate CSS/logical display size from canvas backing-store size.

## Current Evidence

In Jackal:

- `src/app/JackalWebApp.ts` measures the browser layout in CSS pixels.
- `getResponsiveWindowedDisplayMode()` uses `host.clientWidth`, `host.clientHeight`, and `getBoundingClientRect()`.
- `getResponsiveFullscreenDisplayMode()` uses `visualViewport`, `window.innerWidth`, and `window.innerHeight`.
- `getAspectFitDisplayMode()` preserves Jackal's logical aspect ratio.
- `src/styles.css` centers the canvas in a black `.game-shell` / `.game-host`, so black bars are handled by layout.

In `slick2d-ts`:

- `src/slick/AppGameContainer.ts` sets `canvas.width`, `canvas.height`, `canvas.style.width`, and `canvas.style.height` to the same values in `start()`.
- `src/slick/AppGameContainer.ts` also sets the same backing and CSS sizes in `applySizedCanvas()`.
- `src/slick/rendering/WebGLRenderer.ts` uses one pair of `width` / `height` fields for both:
  - WebGL viewport size.
  - Conversion from Slick logical coordinates to clip-space coordinates.
- `src/slick/Input.ts` pointer coordinates are already collected from `PointerEvent.clientX/clientY` relative to `getBoundingClientRect()`, which means mouse coordinates are currently in CSS pixels.
- `src/slick/ScalableGame.ts` uses `GameContainer.getWidth()` and `getHeight()` to compute logical scaling and input offsets.

This means the current model has only one size concept. For high-DPI rendering, the engine needs at least two:

1. Logical size in CSS pixels, visible to Slick games.
2. Backing size in physical/device pixels, used by the WebGL default framebuffer.

## Why The Naive Fix Is Wrong

Do not only multiply `canvas.width` and `canvas.height` by `window.devicePixelRatio`.

That breaks because `WebGLRenderer` currently treats its `width` and `height` as both viewport dimensions and logical projection dimensions. If the canvas backing size is doubled and the renderer also uses the doubled size for coordinate projection, Slick coordinates will cover only part of the screen. For example, on DPR 2, drawing from logical `0..1024` into a renderer whose projection width is `2048` would make Jackal render at half width.

Do not make `GameContainer.getWidth()` / `getHeight()` return the backing-pixel size.

That would leak browser backing pixels into game logic. Existing Slick2D ports use container size for layout, scaling, input transforms, and sometimes gameplay. In Jackal specifically, `ScalableGame` depends on container width/height representing the logical browser display area, not the backing buffer.

Do not multiply `Input` pointer coordinates by DPR.

Pointer events deliver CSS-pixel coordinates. Since game/container dimensions should remain CSS/logical pixels, input should stay in CSS/logical coordinates too. Multiplying mouse coordinates by DPR would make mouse interaction inaccurate.

## Desired Model

Keep the browser-facing game API stable:

- `GameContainer.getWidth()` returns logical CSS-pixel width.
- `GameContainer.getHeight()` returns logical CSS-pixel height.
- `Display.getWidth()` and `Display.getHeight()` should also remain logical CSS-pixel values for the active browser display mode.
- `Input.getMouseX()` / `getMouseY()` stay logical CSS-pixel coordinates after existing Slick scaling and offsets.
- `ScalableGame` continues to operate in logical CSS pixels.

Add backing-store awareness internally:

- Canvas CSS size: logical width/height.
- Canvas backing size: logical width/height multiplied by an effective device pixel ratio.
- WebGL viewport: backing width/height.
- Renderer projection: logical width/height.
- Default-framebuffer scissor/read/copy operations: convert logical coordinates into backing coordinates.

Example:

```text
Logical CSS display size: 1024 x 960
Device pixel ratio:       2
Canvas style size:        1024px x 960px
Canvas backing size:      2048 x 1920
WebGL viewport:           2048 x 1920
Slick coordinate space:   0..1024, 0..960
Input coordinate space:   0..1024, 0..960
```

## Recommended API Additions

Add browser-only DPI configuration to `AppGameContainer` or `GameContainer`.

Recommended fields:

```ts
protected highDpiEnabled = true;
protected maxDevicePixelRatio = 2;
protected displayPixelRatio = 1;
protected backingWidth = 0;
protected backingHeight = 0;
```

Recommended methods:

```ts
public setHighDpiEnabled(enabled: boolean): void;
public isHighDpiEnabled(): boolean;
public setMaxDevicePixelRatio(maxDevicePixelRatio: number): void;
public getDevicePixelRatio(): number;
public getBackingWidth(): number;
public getBackingHeight(): number;
```

The exact method names can vary, but the concepts should be explicit. This is a browser extension, so it does not need to mimic Java Slick2D exactly.

Default recommendation:

- Enable high-DPI rendering by default in browser builds.
- Cap the effective DPR at `2` by default for performance and GPU memory safety.
- Allow applications to opt out with `setHighDpiEnabled(false)`.
- Allow applications to raise/lower the cap with `setMaxDevicePixelRatio(...)`.

This does break strict Java display-pixel parity in favor of browser rendering quality. That is acceptable here if documented, because Java Slick2D did not have CSS pixels versus device pixels.

## Effective DPR Calculation

Compute DPR only when sizing changes or browser DPR may have changed. Do not recompute per draw call.

Recommended helper:

```ts
private resolveDisplayPixelRatio(logicalWidth: number, logicalHeight: number): number {
    if (!this.highDpiEnabled || typeof window === "undefined") {
        return 1;
    }

    const raw = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const configured = Math.max(1, this.maxDevicePixelRatio);
    return Math.max(1, Math.min(raw || 1, configured));
}
```

Potential enhancement:

- Also clamp to WebGL limits if needed, such as `gl.MAX_VIEWPORT_DIMS` or practical framebuffer limits.
- If `logicalWidth * dpr` or `logicalHeight * dpr` exceeds WebGL limits, lower DPR automatically.

## AppGameContainer Changes

The main sizing helper should separate logical and backing sizes.

Current behavior:

```ts
this.setDimensions(normalizedWidth, normalizedHeight);
this.canvas.width = normalizedWidth;
this.canvas.height = normalizedHeight;
this.canvas.style.width = styleWidth;
this.canvas.style.height = styleHeight;
Renderer.getBackend().initDisplay(normalizedWidth, normalizedHeight);
```

Recommended behavior:

```ts
const logicalWidth = Math.max(1, Math.trunc(width));
const logicalHeight = Math.max(1, Math.trunc(height));
const dpr = this.resolveDisplayPixelRatio(logicalWidth, logicalHeight);
const backingWidth = Math.max(1, Math.round(logicalWidth * dpr));
const backingHeight = Math.max(1, Math.round(logicalHeight * dpr));

this.setDimensions(logicalWidth, logicalHeight);
this.displayPixelRatio = dpr;
this.backingWidth = backingWidth;
this.backingHeight = backingHeight;

this.canvas.width = backingWidth;
this.canvas.height = backingHeight;
this.canvas.style.width = styleWidth;
this.canvas.style.height = styleHeight;

Renderer.getBackend().initDisplay(logicalWidth, logicalHeight, backingWidth, backingHeight);
```

Important:

- `setDimensions()` should keep logical width/height.
- `lastWindowedDisplayMode` should keep logical width/height.
- `Display.markResized(...)` should report logical width/height.
- Change detection must include backing width, backing height, and effective DPR. A DPR change with unchanged CSS size must still resize the canvas backing buffer and renderer viewport.

`start()` should avoid directly setting canvas backing size to logical size. It should route through the same DPI-aware sizing path before or immediately after WebGL initialization.

If `Renderer.initialize()` currently calls `initDisplay(canvas.width, canvas.height)`, update its signature or call sequence so it can receive both logical and backing dimensions. A temporary initialization using backing dimensions as logical dimensions can cause one-frame bad projection or incorrect initial state.

## WebGLRenderer Changes

Split renderer dimensions into logical and backing fields.

Recommended fields:

```ts
private logicalWidth = 1;
private logicalHeight = 1;
private backingWidth = 1;
private backingHeight = 1;
private backingScaleX = 1;
private backingScaleY = 1;
```

Recommended `initDisplay` / frame API:

```ts
public initDisplay(logicalWidth: number, logicalHeight: number, backingWidth?: number, backingHeight?: number): void;

public beginFrame(
    logicalWidth: number,
    logicalHeight: number,
    backingWidth: number,
    backingHeight: number,
    background: Color
): void;
```

For backward compatibility, `backingWidth` and `backingHeight` can default to `logicalWidth` and `logicalHeight`.

In the default framebuffer:

- `gl.viewport(0, 0, backingWidth, backingHeight)`.
- Vertex projection uses `logicalWidth` and `logicalHeight`.
- `writeTextureVertex(...)` and `writeSolidVertex(...)` should divide transformed logical coordinates by logical dimensions, not backing dimensions.

The core projection should remain:

```ts
clipX = transformedLogicalX / logicalWidth * 2 - 1;
clipY = 1 - transformedLogicalY / logicalHeight * 2;
```

The viewport maps those logical clip coordinates onto the larger backing buffer.

## Clip And Scissor Handling

WebGL scissor rectangles are in framebuffer pixels. Slick clip rectangles are logical pixels. Convert before calling `gl.scissor`.

Recommended conversion for the default framebuffer:

```ts
const scaleX = backingWidth / logicalWidth;
const scaleY = backingHeight / logicalHeight;

const x0 = Math.floor(clip.x * scaleX);
const x1 = Math.ceil((clip.x + clip.width) * scaleX);
const y0 = Math.floor((logicalHeight - clip.y - clip.height) * scaleY);
const y1 = Math.ceil((logicalHeight - clip.y) * scaleY);

gl.scissor(
    x0,
    y0,
    Math.max(0, x1 - x0),
    Math.max(0, y1 - y0)
);
```

Use floor for minimum edges and ceil for maximum edges so fractional DPR values such as `1.25`, `1.5`, and `1.75` do not cut off edge pixels.

When rendering to a `WebGLRenderTarget`, do not apply browser DPR by default. Render targets are texture/image pixel buffers, not CSS boxes. For render targets:

- logical width = target width.
- logical height = target height.
- backing width = target width.
- backing height = target height.
- backing scale = 1.

## Readback And Copy Operations

Audit every default-framebuffer operation that uses pixel coordinates directly.

Known current methods needing attention:

- `WebGLRenderer.copyAreaToRenderTarget(...)`
- `WebGLRenderer.readPixels(...)`
- Any method using `this.height - y - height` for framebuffer Y conversion.
- Any method using `gl.scissor(...)`.
- Any future screenshot or cursor capture helpers.

These APIs are more complex than normal draw calls because WebGL read/copy coordinates are device pixels.

The desired public Slick behavior should be decided explicitly:

1. If `readPixels(x, y, width, height, target)` is a logical API, convert the source rectangle from logical pixels to backing pixels, then downsample or otherwise resolve into the requested logical-size output buffer. This is the most API-friendly behavior but requires more implementation work.
2. If `readPixels(...)` is treated as a raw framebuffer API, document that it uses backing pixels when high-DPI is enabled. This is simpler but leaks browser implementation details and is less Slick-like.

For `copyAreaToRenderTarget(target, x, y)`, the most Slick-like behavior is:

- Source rectangle is logical.
- Target image dimensions are logical texture pixels.
- The copied result should match what the user sees in the logical rectangle.

With DPR greater than 1, `gl.copyTexSubImage2D` alone cannot copy a `target.width x target.height` logical texture from a larger `target.width * dpr x target.height * dpr` source rectangle without resampling. A full solution may need:

- `gl.blitFramebuffer(...)` in WebGL2 with scaling, or
- A temporary high-DPI texture followed by a draw into the logical target texture.

Jackal probably does not depend on these copy/readback paths, but `slick2d-ts` should not call the DPI feature complete until they are audited and either fixed or documented.

## Input Handling

Do not change `Input` to use backing pixels.

Current pointer mapping is the right basis:

- DOM events provide `clientX` / `clientY` in CSS pixels.
- `getBoundingClientRect()` returns CSS-pixel bounds.
- `Input` computes absolute mouse coordinates in CSS pixels.
- `ScalableGame` applies logical scale/offset.

The DPI-aware renderer should keep `GameContainer` and `Input` in logical CSS pixels. No DPR multiplication should be applied to keyboard, controller, or pointer state.

Regression tests should verify that clicking/tapping the visual center of the canvas still maps to the logical center after enabling DPR.

## Resize And DPR Change Handling

High-DPI state can change without a normal layout size change:

- Browser window moved between monitors.
- Browser zoom changed.
- OS display scale changed.
- Mobile browser changes visual viewport behavior.

`AppGameContainer` should re-evaluate DPR when:

- `setDisplayMode(...)` runs.
- `applySizedCanvas(...)` runs.
- `window.resize` fires.
- `fullscreenchange` fires.
- `visualViewport.resize` fires, if `visualViewport` exists.

Optional robust monitor:

- Install a `matchMedia("(resolution: Xdppx)")` listener for the current DPR and recreate it when it fires.
- Or cheaply compare current effective DPR against stored `displayPixelRatio` during existing resize/fullscreen scheduling.

Avoid polling every frame unless there is no practical alternative.

## Performance Concerns

High-DPI rendering increases fill rate and framebuffer memory:

- DPR 2 uses 4x the pixels.
- DPR 3 uses 9x the pixels.
- Fullscreen on large monitors can become very expensive.

This matters for arcade/game ports because they redraw continuously during gameplay.

Recommended mitigations:

- Default `maxDevicePixelRatio` to `2`.
- Allow apps to opt out or lower the cap.
- Do not allocate objects or arrays per frame for DPI math.
- Store logical/backing dimensions and scale factors as numeric fields.
- Recompute backing dimensions only during resize/display-mode changes.
- Avoid recreating the WebGL context when only backing size changes.
- Only call `canvas.width = ...` / `canvas.height = ...` when the backing size actually changed, because assigning those resets default framebuffer state.

## Parity Concerns

Java Slick2D did not distinguish CSS pixels from device pixels. A browser engine must choose which concept is exposed through Java-style APIs.

The best browser behavior is:

- Public Java-style display APIs expose logical CSS pixels.
- Internal WebGL default framebuffer uses device pixels.

This is technically a parity break from Java display-pixel semantics, but it preserves practical game behavior better than exposing backing pixels. Existing game ports expect `GameContainer.getWidth()`, `Display.getWidth()`, `Input.getMouseX()`, and `ScalableGame` calculations to operate in the same coordinate space. That shared coordinate space should be logical CSS pixels.

If a future port needs exact Java desktop pixel semantics, add an opt-out or compatibility mode rather than making high-DPI behavior impossible.

## Texture Filtering Concern

Increasing backing resolution only fixes the canvas framebuffer softness. It does not by itself decide whether scaled sprites use nearest-neighbor or linear filtering.

`slick2d-ts` already has texture filtering concepts (`GL_NEAREST`, `GL_LINEAR`, and texture resource filter application). The DPI fix should not change image filtering semantics. However, after the DPI fix, test pixel-art ports visually:

- If images are meant to be crisp, their Slick filter state must still result in nearest-neighbor sampling.
- If a game intentionally uses smoothing, high-DPI should not disable it.

Do not force a global texture-filter change as part of the DPI fix.

## Proposed Implementation Order

1. Add logical/backing size fields to `AppGameContainer` and `WebGLRenderer`.
2. Add high-DPI configuration methods with safe defaults.
3. Update `AppGameContainer.start()` and `applySizedCanvas()` so canvas backing size is `logical * effectiveDpr`, while CSS size remains the requested display size.
4. Update `Renderer.initialize()` / `WebGLRenderer.initDisplay()` / `beginFrame()` so projection uses logical size and viewport uses backing size.
5. Update scissor clipping to convert logical clip rectangles to backing pixels.
6. Audit and repair or document readback/copy operations.
7. Ensure render targets remain DPR-neutral unless explicitly designed otherwise.
8. Add tests and browser checks for DPR 1, 1.25, 1.5, 2, and capped higher DPR.
9. Verify Jackal, Stickvania, and Ms. Pac-Man browser ports still scale, input, and fullscreen correctly.

## Definition Of Done

The fix is complete when all of the following are true:

- On DPR 1, behavior and screenshots match current behavior.
- On DPR 2, a canvas styled at `1024px x 960px` has backing dimensions `2048 x 1920`, or the configured capped equivalent.
- `GameContainer.getWidth()` and `getHeight()` still return `1024` and `960` for that example.
- `Display.getWidth()` and `getHeight()` still return logical values.
- WebGL viewport uses backing dimensions.
- Slick draw coordinates still fill the full visible canvas.
- `ScalableGame` still centers/aspect-fits correctly with black bars.
- Pointer coordinates are not doubled on high-DPI screens.
- Scissor clips still align with visible logical pixels.
- Render targets continue to render at their requested texture dimensions.
- Browser resizing, fullscreen entry/exit, and moving the window between monitors update the backing size without requiring a page reload.
- No per-frame object allocation is introduced for DPI math.
- The behavior is documented as browser-specific, including the default DPR cap and opt-out API.

## Suggested Tests

Automated browser tests, preferably with Playwright:

- Launch with `deviceScaleFactor: 1`.
- Launch with `deviceScaleFactor: 1.5`.
- Launch with `deviceScaleFactor: 2`.
- Assert `canvas.style.width` / `style.height` are logical CSS dimensions.
- Assert `canvas.width` / `canvas.height` are logical dimensions multiplied by effective DPR.
- Assert `GameContainer.getWidth()` / `getHeight()` stay logical.
- Draw a known full-screen rectangle and assert it fills the whole canvas.
- Draw a clipped rectangle and assert the clip boundary lands at the expected physical pixel.
- Click the CSS center of the canvas and assert `Input.getMouseX()` / `getMouseY()` report the logical center after scaling.
- Resize the host element and assert logical and backing dimensions both update.
- Simulate or manually test moving the browser between DPR 1 and DPR 2 monitors.

Manual Jackal tests:

- Windowed mode on a high-DPI monitor should look sharper than before.
- Fullscreen should still aspect-fit with black bars.
- Title menu navigation should be unchanged.
- Input mapping screen should be unchanged.
- Gameplay should not run faster or slower.
- Hamburger/menu behavior should be unchanged.
- No visual clipping should appear around the game area.

## Final Recommendation

Implement high-DPI support in `slick2d-ts` by keeping public Slick/container/input coordinates logical, while making only the canvas backing store and default WebGL viewport device-pixel aware.

This is the least disruptive model for existing ports and the most natural browser behavior. It intentionally bends Java Slick2D display-pixel parity, but it preserves gameplay behavior, input behavior, and layout behavior while making rendering sharp on modern displays.
