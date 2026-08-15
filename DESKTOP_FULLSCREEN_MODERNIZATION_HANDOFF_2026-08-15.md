# Desktop Fullscreen Modernization Handoff

Date: 2026-08-15

## Purpose

Jackal's desktop Java build had a long delay when pressing Space to enter fullscreen. On the test machine, fullscreen eventually worked, but the transition could take 20-30 seconds. The fix modernizes only the desktop Java presentation/container path. It does not change game logic, frame timing, input mapping semantics, graphics assets, audio behavior, or the PWA.

This handoff is intended for other AIs applying the same idea to the desktop Java versions of `ms-pac-man-2010-js` and `stickvania-js`.

## Important Constraint

Do not modify `slick.jar`. It is a third-party library.

Also avoid editing vendored Slick source under `org/newdawn/slick` unless a project has explicitly chosen to own that copy. The Jackal fix was implemented from `desktop/src/jackal`, using a Jackal-owned subclass/wrapper around the Slick container.

## Root Cause

The delay was not caused by slow keyboard detection.

In Jackal, Space is checked from `Main.fullScreenToggleCheck(...)` during the fixed update loop. The old code called:

```java
gc.setFullscreen(true);
```

That delegated to Slick/LWJGL 2 fullscreen behavior. The container ultimately performed a display mode change and fullscreen switch through LWJGL:

```java
Display.setDisplayMode(targetDisplayMode);
Display.setFullscreen(true);
```

Because the game window is logically `1024x960`, old Slick fullscreen could negotiate an awkward exclusive fullscreen display mode instead of using the monitor's native desktop mode. On modern Windows 11, high-DPI displays, multi-monitor setups, and modern GPU drivers, that kind of exclusive display-mode switch can block for many seconds.

## Jackal Fix Summary

The fix avoids the bare `gc.setFullscreen(true)` path and makes Jackal choose the fullscreen mode itself.

Files changed:

- `desktop/src/jackal/Main.java`
- `desktop/src/jackal/JackalAppGameContainer.java`

No changes were made to:

- `desktop/lib/slick.jar`
- `desktop/src/org/newdawn/slick/*`

## New Jackal-Owned Container Helper

Added:

```text
desktop/src/jackal/JackalAppGameContainer.java
```

This class extends the Slick application container used by Jackal:

```java
public class JackalAppGameContainer extends ApplicationGameContainer
```

It adds one project-owned API:

```java
public void setNativeFullscreenDisplayMode(DisplayMode displayMode)
```

That method:

1. Requires a non-null `DisplayMode`.
2. Returns immediately if already fullscreen at the same mode.
3. Preserves the current Slick graphics background color.
4. Updates the inherited container mode fields:

```java
targetDisplayMode = displayMode;
width = displayMode.getWidth();
height = displayMode.getHeight();
```

5. Enters fullscreen with LWJGL's atomic native fullscreen API:

```java
Display.setDisplayModeAndFullscreen(displayMode);
```

6. Reinitializes Slick's GL state if the display already exists:

```java
initGL();
onResize();
```

7. Restores the old graphics background.
8. Preserves Slick's 16-bit texture mode behavior.
9. Calls `getDelta()` after the transition, matching Slick container behavior.

Using `Display.setDisplayModeAndFullscreen(...)` is preferable to separately calling `Display.setDisplayMode(...)` and `Display.setFullscreen(true)`, because LWJGL can perform the native display-mode/fullscreen transition as one operation.

## Main.java Changes

Jackal now stores the concrete container and scalable wrapper:

```java
public JackalAppGameContainer appGameContainer;
public ScalableGame scalableGame;
```

The desktop bootstrap changed from constructing an anonymous `ScalableGame` inside an `ApplicationGameContainer` to storing both objects:

```java
main.scalableGame = new ScalableGame(
    main, DISPLAY_WIDTH, DISPLAY_HEIGHT, true);
main.appGameContainer = new JackalAppGameContainer(
    main.scalableGame, DISPLAY_WIDTH, DISPLAY_HEIGHT, false);
```

This lets `Main` resize the outer desktop container and then tell the scalable wrapper to recompute its scale.

## Native Display Mode Detection

Jackal now records:

```java
public DisplayMode nativeDisplayMode;
public int fullscreenWidth = DISPLAY_WIDTH;
public int fullscreenHeight = DISPLAY_HEIGHT;
```

The preferred path is:

```java
Display.getDesktopDisplayMode()
```

If that is unavailable or unusable, Jackal falls back to scanning:

```java
Display.getAvailableDisplayModes()
```

The fallback chooses the largest valid mode, using color depth as a tiebreaker.

This is intentionally different from fullscreening the game's logical dimensions. The game still renders logically at `DISPLAY_WIDTH x DISPLAY_HEIGHT`; only the outer native desktop container changes size.

## Fullscreen Toggle Flow

Old behavior:

```java
if (gc.isFullscreen()) {
    gc.setFullscreen(false);
} else {
    gc.setFullscreen(true);
}
```

New behavior:

```java
if (isFullscreenDisplayActive(gc)) {
    restoreWindowedDisplayMode(gc);
} else if (!isEscape) {
    enterFullScreenDisplayMode(gc);
}
```

The active test includes both real exclusive fullscreen and the fallback window mode:

```java
return gc.isFullscreen() || fullscreenFallbackActive;
```

This is important because ESC/Space must leave fullscreen-like presentation even when the fallback path is not technically LWJGL fullscreen.

## Entering Fullscreen

The preferred path:

1. Hide the mouse cursor.
2. Use the recorded native desktop display mode.
3. Call:

```java
appGameContainer.setNativeFullscreenDisplayMode(nativeDisplayMode);
```

4. Recalculate the `ScalableGame` transform:

```java
scalableGame.recalculateScale();
```

5. Log if the native fullscreen call takes more than 1 second.

The timing log matters because a synchronous native fullscreen call cannot be cancelled safely once it is blocking. If another project still sees a long stall, use the fallback-first strategy described below.

## Restoring Windowed Mode

Windowed restore:

1. Show the mouse cursor.
2. Clear `fullscreenFallbackActive`.
3. Restore the logical game window size:

```java
appGameContainer.setDisplayMode(DISPLAY_WIDTH, DISPLAY_HEIGHT, false);
```

4. Recalculate the scalable wrapper.

For Jackal, the logical size is `1024x960`.

## Fallback Window Mode

If native fullscreen throws, Jackal falls back to a desktop-sized window:

```java
appGameContainer.setDisplayMode(DISPLAY_WIDTH, DISPLAY_HEIGHT, false);
Display.setLocation(0, 0);
appGameContainer.setDisplayMode(fullscreenWidth, fullscreenHeight, false);
fullscreenFallbackActive = true;
recalculateScale();
```

This is not true borderless fullscreen. LWJGL 2's public `Display` API does not provide a clean runtime borderless toggle. However, this fallback avoids the dangerous exclusive fullscreen path and still gives a fullscreen-like large presentation.

If a machine still blocks for many seconds on native exclusive fullscreen, change that project to use this fallback path first instead of trying exclusive fullscreen first.

## Cursor Improvement

The old Jackal code created a blank native cursor every time fullscreen was entered:

```java
ByteBuffer buffer = BufferUtils.createByteBuffer(32 * 32 * 4);
Cursor cursor = CursorLoader.get().getCursor(buffer, 0, 0, 32, 32);
Mouse.setNativeCursor(cursor);
```

The new code caches the hidden cursor:

```java
private Cursor hiddenCursor;
private boolean mouseCursorHidden;
```

It only creates the blank cursor once and only restores the native cursor when it was actually hidden.

This was probably not the 20-30 second delay, but it removes avoidable work from fullscreen toggles.

## How To Apply To Ms. Pac-Man 2010

Project: `C:\js-projects\ms-pac-man-2010-js`

Current useful pieces already exist:

- `Main` has native display fields such as `maxWidth`, `maxHeight`, and `nativeDisplayMode`.
- `Main` already has `fullscreenFallbackActive`.
- `Main` already has `ScalableGame2`.
- `ScalableGame2` exposes `containerSizeChanged(GameContainer container)`.
- The logical desktop size is `800x600`.

Recommended adaptation:

1. Add a project-owned helper class, for example:

```text
desktop/src/mspacman/MsPacManAppGameContainer.java
```

2. Extend the Slick container currently used by the desktop project, likely:

```java
public class MsPacManAppGameContainer extends AppGameContainer
```

3. Add the same `setNativeFullscreenDisplayMode(DisplayMode displayMode)` method from Jackal, adjusted for the base class name.
4. Change `Main.appGameContainer` to the new helper type.
5. Instantiate the helper in `main(...)`.
6. In the fullscreen enter path, replace:

```java
appGameContainer.setDisplayMode(width, height, true);
```

with:

```java
appGameContainer.setNativeFullscreenDisplayMode(nativeDisplayMode);
```

7. Keep the existing fallback behavior, but make sure it sets `fullscreenFallbackActive = true`.
8. After every display change, keep calling:

```java
scalableGame.containerSizeChanged(gc);
```

9. Restore windowed mode to `800x600`.
10. Keep ESC/Space using `gc.isFullscreen() || fullscreenFallbackActive`.

If Ms. Pac-Man already has hidden cursor caching, keep it. If not, apply the same cursor caching pattern.

## How To Apply To Stickvania

Project: `C:\js-projects\stickvania-js`

Current useful pieces already exist:

- `Main` has native display fields such as `maxWidth`, `maxHeight`, and `nativeDisplayMode`.
- `Main` already has `ScalableGame2`.
- `ScalableGame2` exposes `containerSizeChanged(GameContainer container)`.
- The logical desktop size is `640x480`.

Recommended adaptation:

1. Add a project-owned helper class, for example:

```text
desktop/src/stickvania/StickvaniaAppGameContainer.java
```

2. Extend the Slick container currently used by the desktop project, likely:

```java
public class StickvaniaAppGameContainer extends AppGameContainer
```

3. Add the same `setNativeFullscreenDisplayMode(DisplayMode displayMode)` method from Jackal, adjusted for the base class name.
4. Change `Main.appGameContainer` to the new helper type.
5. Instantiate the helper in `main(...)`.
6. In the fullscreen enter path, replace:

```java
appGameContainer.setDisplayMode(maxWidth, maxHeight, true);
```

with:

```java
appGameContainer.setNativeFullscreenDisplayMode(nativeDisplayMode);
```

7. Add `fullscreenFallbackActive` if Stickvania does not already have it.
8. Treat fullscreen as active when:

```java
gc.isFullscreen() || fullscreenFallbackActive
```

9. Add a desktop-sized fallback window path:

```java
appGameContainer.setDisplayMode(640, 480, false);
Display.setLocation(0, 0);
appGameContainer.setDisplayMode(maxWidth, maxHeight, false);
fullscreenFallbackActive = true;
scalableGame.containerSizeChanged(gc);
```

10. Restore windowed mode to `640x480`.
11. After every display change, keep calling:

```java
scalableGame.containerSizeChanged(gc);
```

12. Cache the hidden cursor if Stickvania recreates it during each fullscreen toggle.

## Fallback-First Option

For the best user experience on machines where LWJGL 2 exclusive fullscreen blocks, use the fallback window path as the default instead of trying native exclusive fullscreen first.

The tradeoff:

- Native exclusive fullscreen is closer to old Java/Slick behavior.
- Fallback-first is smoother and more modern, but may show window decorations or taskbar depending on OS/window-manager behavior because LWJGL 2 does not expose a clean borderless toggle through the public `Display` API.

Do not try to run native exclusive fullscreen asynchronously to avoid a stall. OpenGL/LWJGL display calls must remain on the render/game thread, and a blocked native display call cannot be safely cancelled from another thread.

## Verification Checklist

For each desktop project:

1. Confirm `slick.jar` is unchanged.
2. Confirm no vendored `org/newdawn/slick` source was changed unless explicitly intended.
3. Build the desktop Java artifact.
4. Start the desktop game.
5. Press Space on the title screen.
6. Confirm fullscreen transition is quick.
7. Confirm the game is scaled with correct aspect ratio and black bars where appropriate.
8. Confirm input coordinates still work after resizing.
9. Press Escape and confirm windowed mode returns to the original logical size.
10. Press Space again from gameplay and confirm the same behavior.
11. Confirm the cursor hides in fullscreen and returns in windowed mode.
12. Check logs for a message like `Native fullscreen display mode took ... ms`.
13. If that warning reports multi-second delays, switch that project to fallback-first mode.

## Jackal Verification Performed

Commands run:

```powershell
npm.cmd run build:desktop
git diff --check -- desktop\src\jackal\Main.java desktop\src\jackal\JackalAppGameContainer.java
```

Both passed.

The user also tested the desktop fullscreen toggle and confirmed that the new behavior works well.
