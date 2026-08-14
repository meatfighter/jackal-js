# PWA Hybrid Continue Handoff for Ms. Pac-Man 2010 and Stickvania

Date: 2026-08-14

This is a documentation-only handoff. No code changes were made in `C:\js-projects\ms-pac-man-2010-js` or `C:\js-projects\stickvania-js`.

## Purpose

Jackal recently changed its PWA hamburger-menu behavior from "save, destroy the game, show the menu, and rebuild on Continue" to a hybrid model:

1. If the game is in a save-ready gameplay state, the hamburger opens the PWA menu as a live overlay above the still-mounted game.
2. The game runtime is browser-suspended underneath the overlay.
3. Active sound effects are stopped, but music is suspended through the music path instead of being stopped/destroyed.
4. Pressing Continue resumes the same in-memory game instance.
5. Pressing New Game still destroys the current runtime and clears the saved state.
6. If there is no live suspended runtime, Continue still uses the existing serialized local-storage restore path.

The goal is to keep the normal PWA Continue feature while avoiding unnecessary destruction when the user simply taps the hamburger during gameplay.

This matters because a destroy-and-restore Continue path is jarring for audio. It can restart music from the beginning, and it can also incorrectly resume music that was intentionally stopped by the game's own in-game pause state.

## Problems Fixed in Jackal

Before the hybrid change, the hamburger path did this:

1. Save game state.
2. Destroy the current `AppGameContainer`.
3. Render the PWA menu.
4. On Continue, create a new container/game.
5. Restore from the serialized snapshot.

That was acceptable for crash recovery or cold page reload, but it was not ideal for a same-page menu round trip.

The observed bugs were:

1. Music restarted from the beginning after hamburger -> Continue during gameplay.
2. If the game was internally paused with Enter, then hamburger -> Continue could resume music even though the in-game pause state should keep it silent.
3. One-shot sound effects could continue or decay after the game loop had been suspended, because stopping updates/rendering does not automatically stop active Web Audio `AudioBufferSourceNode` handles.
4. A black PWA menu visually replaces the game, so continuing to update or render the game underneath wastes CPU/GPU.

Jackal now treats the PWA menu as an additional browser-suspension reason instead of as a forced game teardown.

## Required Slick2D-TS Support

The hybrid method depends on two `slick2d-ts` capabilities.

### Loop Suspension

`AppGameContainer` / `GameContainer` must expose:

```ts
setLoopSuspended(suspended: boolean): void;
```

When suspended, the browser animation loop must not keep updating or repainting the game. This is important because the PWA menu is covering the canvas and the user may be using another app or menu UI.

### Stop Only Sound Effects

`GameContainer` now exposes:

```ts
stopSoundEffects(): void;
```

That delegates to `SoundStore.get().stopSoundEffects()`.

In `slick2d-ts`, the implementation is intentionally selective:

```ts
public stopSoundEffects(): void {
    const handles = Array.from(this.activeHandles);
    for (const handle of handles) {
        if (!this.musicHandles.has(handle)) {
            handle.stop();
        }
    }
}
```

The important behavior is:

1. Stop active sound-effect handles.
2. Do not stop music handles.
3. Do not clear decoded buffers.
4. Do not disable future sound playback.
5. Do not change music position/state.

This is a browser/PWA helper, not a Java Slick2D parity API. Java desktop apps do not need this exact method because OpenAL source management and browser tab suspension are different.

### Music Suspension Must Preserve Position

For this feature to feel smooth, `setMusicOn(false)` must suspend current music without resetting its position, and `setMusicOn(true)` must resume the same track from its suspended position when appropriate.

If a target project's current `setBrowserSuspended(true)` calls `Music.stop()` or a game-level `stopAllSounds()` that stops music, do not use that as the live menu suspend path. Use music-on/music-off suspension plus `stopSoundEffects()` instead.

## Sound Volume Note

Do not "fix" Slick2D sound effects by removing the double sound-volume application from `slick2d-ts`.

Java Slick2D applies sound volume twice for normal `Sound.play(...)` calls:

```text
perEffectVolume * soundVolume * soundVolume
```

The PWA-level master-volume compensation is:

```ts
SoundStore.get().setSoundVolume(Math.sqrt(masterVolume));
SoundStore.get().setMusicVolume(masterVolume);
container?.setSoundVolume(Math.sqrt(masterVolume));
container?.setMusicVolume(masterVolume);
```

Then normal sound effects become:

```text
perEffectVolume * sqrt(masterVolume) * sqrt(masterVolume)
= perEffectVolume * masterVolume
```

This is already the intended pattern in Jackal, Ms. Pac-Man 2010, and Stickvania. The hybrid Continue feature should not change this volume policy.

## Jackal Implementation Summary

The Jackal shell lives in:

```text
C:\js-projects\jackal-js\src\app\JackalWebApp.ts
```

The menu overlay style lives in:

```text
C:\js-projects\jackal-js\src\styles.css
```

Jackal added these fields:

```ts
private menuOverlay: HTMLElement | null = null;
private liveMenuOpen = false;
```

Jackal split menu rendering so the same menu DOM can be rendered either as the root PWA menu or as an overlay:

```ts
public showMenu(errorMessage: string | null = null): void {
    this.destroyGame();
    this.renderMenu(this.root, this.gameStateStore.hasValidSave(), errorMessage, false);
}

private renderMenu(parent: HTMLElement, canContinue: boolean, errorMessage: string | null, overlay: boolean): HTMLElement
```

When `overlay` is true, Jackal adds:

```text
menu-screen menu-overlay
```

and sets:

```text
data-live-menu="true"
```

The button binding now checks for a live suspended runtime before taking the serialized restore path:

```ts
if (this.hasLiveSuspendedGame()) {
    this.resumeLiveGameFromMenu();
    return;
}
void this.startGame(true);
```

The hamburger path now branches:

```ts
private returnToMenu(): void {
    if (this.game?.isLoadingScreenActive()) {
        return;
    }
    if (this.game !== null && this.container !== null
        && this.game.isStateSaveReady() && !this.game.isStateSaveInvalidatingMenuActive()) {
        this.showLiveMenuOverlay();
        return;
    }
    this.clearStoredGameState();
    this.showMenu();
}
```

The save-ready check is critical. Jackal only uses the live overlay when gameplay is far enough loaded that the state can be saved safely. Title, loading, options, input mapping, difficulty, and continue screens are not treated as saveable gameplay.

The live overlay suspend path does this:

```ts
this.liveMenuOpen = true;
this.game.setBrowserSuspended(true);
this.container.stopSoundEffects();
this.container.setLoopSuspended(true);
this.container.getInput().pause();
this.saveCurrentInputMapping();
this.saveCurrentGameState();
this.stopHamburgerVisibilityMonitor();
this.hideHamburgerButton();
this.stopGameCursorAutoHide();
this.menuOverlay = this.renderMenu(this.activeGameShell, true, null, true);
```

The ordering is deliberate:

1. Mark `liveMenuOpen` before lifecycle code can accidentally resume the game.
2. Browser-suspend the game first so game logic mutes music/sound according to its own state.
3. Stop one-shot SFX separately so no lingering effects play while the menu is open.
4. Suspend the loop so there is no hidden update/render work.
5. Pause Slick input so keyboard/gamepad state does not leak into the covered game.
6. Save state as a fallback for reload/crash, even though live Continue will not deserialize.
7. Stop hamburger/cursor behavior while the menu owns the UI.

The live Continue path does this:

```ts
this.removeMenuOverlay();
this.container.getInput().resume();
this.game.clearInputPressedRecords();
this.startGameCursorAutoHide(this.activeGameHost);
this.startHamburgerVisibilityMonitor();
this.setAudioVolume(this.volume);
this.scheduleResponsiveGameResize();
this.focusGameCanvas();
this.applyCurrentGameLifecycleSuspension();
```

The final `applyCurrentGameLifecycleSuspension()` is important. If the browser window is still blurred, or the document is still hidden, Continue must not resume the game behind the user's back.

Jackal also changed lifecycle suspension so the PWA menu is a suspension cause:

```ts
if (this.liveMenuOpen || this.suspendedByVisibilityLoss || this.suspendedByFocusLoss) {
    this.suspendCurrentGameForLifecycle();
    return;
}
```

and live-menu state blocks automatic resume:

```ts
if (this.liveMenuOpen || this.game === null || this.game.isLoadingScreenActive()) {
    return;
}
```

Jackal now stops active SFX on ordinary focus/visibility suspension too:

```ts
this.game.setBrowserSuspended(true);
this.container?.stopSoundEffects();
this.container?.setLoopSuspended(true);
this.saveCurrentGameState();
```

This keeps focus-loss behavior consistent with hamburger-menu behavior.

CSS added:

```css
.menu-overlay {
    z-index: 20;
}
```

The overlay can reuse the normal fixed-position menu-screen layout. It only needs a z-index higher than the game canvas and hamburger.

## Game-Side Suspension Hook

Jackal's game-level suspension hook is:

```text
src\jackal\Main.ts -> setBrowserSuspended(...)
```

Current behavior:

1. If the suspended flag is unchanged, return.
2. On suspend:
   - Store current `gc.isMusicOn()`.
   - Store current `gc.isSoundOn()`.
   - Set music off.
   - Set sound off.
   - Clear input pressed records.
3. On resume:
   - Restore the previous music-on and sound-on values.
   - Clear input pressed records.
   - Reset `nextFrameTime`.

This detail matters for the "paused game then PWA menu" bug. If the game was already internally paused and music was off, browser suspension remembers that music was off and restores it as off. It does not blindly force music back on.

Ms. Pac-Man and Stickvania should be checked for this nuance before adopting the hybrid menu exactly.

## Applying to Ms. Pac-Man 2010

Target shell:

```text
C:\js-projects\ms-pac-man-2010-js\pwa\src\app\main.ts
```

Target styles:

```text
C:\js-projects\ms-pac-man-2010-js\pwa\src\app\styles.css
```

Current relevant behavior:

1. `renderMenu()` calls `destroyGame()` unconditionally.
2. `returnToMenu()` calls `game?.setBrowserSuspended(true)`, saves state, then calls `renderMenu()`.
3. `renderMenu()` destroys the live container, so Continue always goes through `startGame(true)`.
4. Lifecycle handlers already use `setLoopSuspended(true)` on blur/pagehide/hidden.
5. The local `RuntimeContainer` type currently includes `setLoopSuspended(...)`, but it does not include `stopSoundEffects()`.

Recommended edits for the other AI:

1. Add module-level state:
   - `let menuOverlay: HTMLElement | null = null;`
   - `let liveMenuOpen = false;`
2. Extend `RuntimeContainer`:
   - `stopSoundEffects(): void;`
   - If using input pause/resume from the container, add `getInput()` with the needed methods, or cast the concrete container safely after `configureSlickRuntime()`.
3. Split `renderMenu()` into:
   - A destructive public/root menu entry point that calls `destroyGame()`.
   - A reusable menu renderer that can append the same menu UI over the game without clearing `#app`.
4. Change Continue handling:
   - If a live suspended game exists, remove the overlay and resume it.
   - Otherwise keep the existing `startGame(true)` behavior.
5. Change hamburger `returnToMenu()`:
   - Return immediately if loading.
   - If `game` and `container` exist and `game.isStateSaveReady()` is true, call the live overlay path.
   - Otherwise keep the current destructive menu behavior.
6. In the live overlay path:
   - Set `liveMenuOpen = true`.
   - Call `game.setBrowserSuspended(true)`.
   - Call `container.stopSoundEffects()`.
   - Call `container.setLoopSuspended(true)`.
   - Clear or pause input. Ms. Pac-Man has `game.input.clearKeyPressedRecord()` and Slick input records through `HumanInput`; use the least invasive existing hook. If `container.getInput().pause()` is available and acceptable in that project, prefer it while the HTML menu is open.
   - Save current game state as a fallback.
   - Stop hamburger visibility monitoring.
   - Hide the hamburger button.
   - Stop cursor auto-hide behavior.
   - Append the normal menu as an overlay.
7. In the live resume path:
   - Remove the overlay.
   - Resume or clear input.
   - Clear pressed records.
   - Restart cursor auto-hide.
   - Restart hamburger visibility monitoring.
   - Reapply current volume.
   - Resize/refocus the canvas.
   - Re-run lifecycle state. Do not blindly resume if the page is still blurred or hidden.
8. Update lifecycle suspension:
   - Treat `liveMenuOpen` as a suspension reason.
   - Do not auto-resume while `liveMenuOpen` is true.
   - Stop sound effects during suspend.

Ms. Pac-Man game-side concern:

```text
C:\js-projects\ms-pac-man-2010-js\pwa\src\mspacman\Main.ts -> setBrowserSuspended(...)
```

Current observed behavior:

```ts
if (suspended) {
    this.stopAllSoundEffects();
    this.appGameContainer?.setMusicOn(false);
} else {
    this.appGameContainer?.setMusicOn(!this.paused);
    this.resetNextFrameTime();
}
```

This already respects the internal `paused` flag on resume. That is good. The shell should still avoid destroying/recreating the game for same-page Continue, because reconstruction can restart music or re-enter startup playback paths even if the serialized gameplay state is otherwise correct.

## Applying to Stickvania

Target shell:

```text
C:\js-projects\stickvania-js\pwa\src\main.ts
```

Target styles:

```text
C:\js-projects\stickvania-js\pwa\src\styles.css
```

Current relevant behavior:

1. `showMenu()` calls `destroyGame()` unconditionally.
2. `returnToMenu()` calls `game?.setBrowserSuspended(true)`, saves state, then calls `showMenu()`.
3. `showMenu()` destroys the live container, so Continue always goes through `startGame(true)`.
4. Lifecycle suspension already tracks `suspendedByFocusLoss` and `suspendedByVisibilityLoss`.
5. Lifecycle suspension already calls `container?.setLoopSuspended(true)`.
6. `Main.isStateSaveReady()` and `Main.isStateSaveInvalidatingMenuActive()` already exist.

Recommended edits for the other AI:

1. Add module-level state:
   - `let menuOverlay: HTMLElement | null = null;`
   - `let liveMenuOpen = false;`
2. Split `showMenu()` so there is:
   - A destructive root menu entry point that calls `destroyGame()`.
   - A reusable renderer for the same menu DOM that can append to `activeGameShell` as an overlay.
3. Change the Continue button handler:
   - If `liveMenuOpen` and `game` and `container` are present, resume the live instance.
   - Otherwise keep `startGame(true)`.
4. Change `returnToMenu()`:
   - Return if loading.
   - If `game.isStateSaveReady()` and not `game.isStateSaveInvalidatingMenuActive()`, open the live overlay.
   - Otherwise clear invalid save state if appropriate and show the normal menu.
5. In the live overlay path:
   - Set `liveMenuOpen = true`.
   - Call `game.setBrowserSuspended(true)`.
   - Call `container?.stopSoundEffects()`.
   - Call `container?.setLoopSuspended(true)`.
   - Pause Slick input if available, or clear pressed records through `game.clearInputPressedRecords()`.
   - Save current state as fallback.
   - Stop hamburger visibility monitoring.
   - Hide hamburger.
   - Stop cursor auto-hide.
   - Render the normal menu as an overlay.
6. In the live resume path:
   - Remove overlay.
   - Resume/clear input.
   - Restart cursor auto-hide and hamburger visibility monitoring.
   - Reapply current volume and display mode if needed.
   - Schedule responsive resize.
   - Focus canvas.
   - Re-run lifecycle suspension so blurred/hidden pages remain suspended.
7. Update `applyCurrentGameLifecycleSuspension()`:
   - Include `liveMenuOpen` in the suspend condition.
   - Do not resume while `liveMenuOpen` is true.
   - Call `container?.stopSoundEffects()` during suspend.
8. Add a `.menu-overlay` CSS rule with a z-index above the game and hamburger.

Stickvania game-side concern:

```text
C:\js-projects\stickvania-js\pwa\src\stickvania\Main.ts -> setBrowserSuspended(...)
```

Current observed behavior:

```ts
if (suspended) {
    this.stopAllSoundEffects();
    this.appGameContainer.setMusicOn(false);
} else {
    this.appGameContainer.setMusicOn(true);
    this.clearInputPressedRecords();
    this.resetNextFrameTime();
}
```

This blindly restores music on resume. That may be acceptable for Stickvania's current state model, but it should be audited before adding the hybrid overlay. If Stickvania can be internally paused, in a menu, in a cutscene, or in another state where music is intentionally off, then `setBrowserSuspended(false)` should restore the prior music-on value instead of forcing music on. Jackal does this by storing `browserSuspendedMusicOn` and `browserSuspendedSoundOn` before muting.

## Why Not Only Serialize?

Serialization remains necessary for:

1. Page reload.
2. Browser crash.
3. PWA being killed by the OS.
4. Returning from a cold menu after a prior session.

Serialization is not the best same-page hamburger behavior because:

1. It reconstructs audio objects.
2. It can restart music playback.
3. It depends on the snapshot capturing every transient music/pause detail perfectly.
4. It creates more work than needed for a menu overlay.
5. It may create subtle state differences from the original live object graph.

The hybrid method uses live resume when it can, and serialized restore when it must.

## Expected Test Matrix

Run these manually after implementing in each project:

1. Start active gameplay, wait until music is clearly mid-track, click hamburger, click Continue.
   - Expected: music resumes from the same point; it does not restart.
2. Start gameplay, trigger a short sound effect, immediately click hamburger.
   - Expected: the sound effect does not keep playing over the PWA menu.
3. Start gameplay, use the game's internal pause, click hamburger, click Continue.
   - Expected: the game is still internally paused and music remains in the same on/off state it had before opening the PWA menu.
4. Open the hamburger menu, then switch to another app and return.
   - Expected: the game does not resume behind the menu while the menu is open.
5. Open the hamburger menu, then click New Game.
   - Expected: old runtime is destroyed and saved game is cleared.
6. Open the hamburger menu, reload the browser page, then click Continue.
   - Expected: cold serialized restore still works.
7. Start from a title/loading/non-save-ready screen and click hamburger if visible.
   - Expected: no invalid gameplay snapshot is created; Continue is disabled or uses only valid prior save according to the project's current policy.
8. While the PWA menu is open over a live game, observe performance tools.
   - Expected: the game loop should be suspended; it should not keep rendering under the menu.
9. Verify volume at 10%, 50%, and 100%.
   - Expected: music and SFX preserve the project's existing master-volume behavior. Do not regress the `Math.sqrt(masterVolume)` sound-effect compensation.

## Common Failure Modes

1. Calling `showMenu()` from the overlay path when `showMenu()` still calls `destroyGame()`.
   - This silently reintroduces the old behavior.
2. Calling `stopAllSounds()` for the live overlay.
   - This stops music and can reset track position.
3. Calling `setLoopSuspended(true)` without also stopping sound effects.
   - The game stops visually but one-shot effects can continue audibly.
4. Resuming automatically on `focus` or `visibilitychange` while the live menu is open.
   - The game starts running behind the PWA menu.
5. Forgetting to save a fallback snapshot before showing the live menu.
   - A page reload from the PWA menu loses progress.
6. Forgetting to clear pressed input records on resume.
   - The game can process stale key/button presses immediately after Continue.
7. Forcing music on during browser resume.
   - This breaks games that were internally paused or intentionally silent.
8. Leaving the hamburger visible above the overlay.
   - The menu should own the UI while open.
9. Forgetting to bump PWA version/cache metadata after implementation.
   - Old service-worker assets can mask the change during testing.

## Recommended Implementation Principle

Treat the hamburger PWA menu as a browser/runtime suspension layer, not as a game mode and not as a forced app restart.

The game should remain alive, muted according to its current audio state, free of active one-shot SFX, loop-suspended, and covered by the normal PWA menu. Continue should remove the overlay and let the same instance breathe again only if the page is visible and focused.

