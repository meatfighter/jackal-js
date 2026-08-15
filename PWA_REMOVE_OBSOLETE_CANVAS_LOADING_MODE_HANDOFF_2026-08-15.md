# PWA Handoff: Remove Obsolete In-Canvas Loading Mode

Date: 2026-08-15

This note describes the approach used in `jackal-js` to remove the old Java/Slick-style in-canvas loading mode from the PWA while preserving the cleaner runtime invariant that the active game mode is always populated after initialization. It is intended as a model for similar work in `ms-pac-man-2010-js` and `stickvania-js`.

## Goal

Modern PWA ports already present their own HTML/CSS loading experience before the game is playable. If the old converted Java game still contains an in-canvas loading mode, that mode may now be dead weight:

- It may render obsolete loading art that users never see.
- It may require assets that the PWA no longer needs to ship.
- It may keep a startup-only enum/mode branch alive even though the PWA loader owns user-visible loading.

The cleanup should remove only the obsolete browser/PWA loading mode, not the actual resource-loading pipeline.

## Core Principle

Do not replace the old loading mode with a nullable active mode.

In these converted games, main update/render code usually assumes an active mode exists:

```ts
this.mode.update(gc);
this.mode.render(gc, g);
```

That invariant is better than adding null checks across the runtime. The clean approach is:

1. Keep resource-loading functions.
2. Complete loading during `Main.init()` or the equivalent startup method.
3. Ensure the final loading step installs a real mode before init returns.
4. Remove the obsolete visual loading mode and its assets.

After this change, startup should end in one of the real modes:

- restored saved state,
- title/menu mode,
- intro/cutscene mode,
- gameplay mode,
- or whatever first playable/display mode the project uses.

There should be no frame where the game loop can update/render with `mode == null`.

## Generalized Implementation Pattern

Before changing code, identify:

- The old in-canvas loading mode class.
- The enum value or state id for that loading mode.
- The method that advances resource loading, such as `loadNext()`.
- The method that completes all loading, such as `completeLoadingImmediately()`.
- The final loading step that transitions to the title screen or restores saved state.
- PWA app-shell code that currently calls the completion method after container startup.
- Assets used only by the obsolete loading mode.

Then apply this pattern:

```ts
public init(gc: GameContainer): void {
    // Normal one-time setup.
    this.gc = gc;
    this.loadAlwaysNeededBootAssets();
    this.input = new HumanInput(...);
    this.resetPlayerOrSessionDefaults();

    // PWA divergence:
    // finish the converted game's loading sequence before init returns,
    // so active mode is real by the first update/render.
    this.completeLoadingImmediately(gc);
}
```

The final `loadNext()` step should still do the important transition:

```ts
case FINAL_LOAD_STEP:
    let handled = false;
    if (this.loadingCompleteHandler != null) {
        handled = this.loadingCompleteHandler(this.gc) == true;
    }
    this.notifyLoadingFinished();
    if (!handled) {
        this.requestMode(Modes.INTRO_OR_TITLE, this.gc);
    }
    break;
```

That keeps saved-game restore support intact, as long as the PWA assigns `loadingCompleteHandler` before it starts the game container.

## What To Remove

Remove the old loading display path from the PWA/TS side:

- The loading mode class.
- The loading enum/state value.
- The `requestMode(LOADING)` branch.
- Any boot-only loading-art fields.
- Any method that loads only the old loading-art assets.
- Any PWA flag whose only purpose was skipping old loading-art assets.
- Any PWA app-shell call that manually completes loading after container startup, if loading now completes inside game init.
- Loading-art files from the PWA public resources, if they are no longer referenced by the manifest or runtime loader.

Do not remove:

- The core resource-loading functions.
- Saved-state restore hooks.
- Loading-complete notification hooks.
- PWA DOM loading/progress UI.
- Desktop Java or historical source copies, unless that project explicitly wants the same behavior there.

## Jackal Concrete Example

In `jackal-js`, the obsolete pieces were:

- `src/jackal/LoadingMode.ts`
- `Modes.LOADING`
- `Main.loadProgressBar()`
- `Main.controllers`
- `Main.skipJavaLoadingAssets`
- `public/resources/images/sprites-9.png`
- `public/resources/images/sprites-9.xml`
- `mainGame.completeLoadingImmediately(appContainer)` in the PWA shell

The retained loading pipeline was:

- `Main.loadIndex`
- `Main.loadNext()`
- `Main.completeLoadingImmediately(gc)`
- `Main.loadingCompleteHandler`
- `Main.loadingFinishedHandler`
- PWA DOM loading/progress UI

The important change was to replace startup's old loading-mode install:

```ts
this.requestMode(Modes.LOADING, gc);
```

with:

```ts
this.completeLoadingImmediately(gc);
```

Because the last `loadNext()` step already restores the saved game or requests the intro/title mode, `Main.init()` now returns with `mode` populated.

## Save/Continue Interaction

If the PWA supports saved-state restore, verify this order:

1. Construct main game.
2. Restore persistent input mapping, if applicable.
3. Assign `loadingCompleteHandler`.
4. Start the app/container.
5. During game init, complete loading.
6. During the final loading step, call `loadingCompleteHandler`.
7. If restore succeeds, it installs the restored mode.
8. If no restore happens, request the normal title/intro mode.

This order is why removing the post-start `completeLoadingImmediately()` call is safe in Jackal. The handler is already assigned before `appContainer.start()`, and `Main.init()` runs inside `start()`.

## Loading State Checks

After removing the loading mode class, loading checks should not use `instanceof LoadingMode`.

Use the loading counter/resource state instead:

```ts
public isLoadingScreenActive(): boolean {
    return this.loadIndex < FINAL_LOAD_COUNT;
}
```

Save gates can also use the counter:

```ts
public isStateSaveReady(): boolean {
    return this.loadIndex >= FINAL_LOAD_COUNT
        && this.mode != null
        && this.gc != null;
}

public isStateSaveInvalidatingMenuActive(): boolean {
    return this.mode == null
        || this.loadIndex < FINAL_LOAD_COUNT;
}
```

The `mode != null` checks remain defensive, but the intended invariant is that mode is populated after init.

## Asset Removal Rules

Only remove assets after proving they are referenced solely by the obsolete loading mode.

Recommended search patterns:

```sh
rg -n "LoadingMode|Modes\\.LOADING|LOADING,|loadProgressBar|controllers|skipJavaLoadingAssets|sprites-9" src public
```

For another project, replace `sprites-9`, `controllers`, and `loadProgressBar` with that project's loading-art names.

If the project includes a copied Java/desktop source tree for preservation, do not delete those resources unless the desktop build is intentionally receiving the same change.

## Verification Checklist

Run these checks after implementation:

- Search for stale loading-mode references in PWA/TS code.
- Confirm obsolete loading assets are gone from PWA public resources.
- Confirm desktop/historical resources remain if they are supposed to.
- Typecheck.
- Lint.
- Production build.
- Start a new game from the PWA menu.
- Continue from a saved gameplay state.
- Continue from title/menu/intro/cutscene states if the project supports all-state continue.
- Test slow network/throttled loading and verify the DOM/PWA loading screen appears, not the old in-canvas loader.
- Confirm no first-frame `mode == null` update/render error.

## Risks And Concerns

The largest risk is accidentally creating a startup window where the app container can render before a real mode exists. Avoid that by completing loading during game init rather than after game start.

The second risk is breaking saved-state restore by completing loading before the restore handler is assigned. The PWA shell must assign the handler before calling the container's `start()`.

The third risk is deleting assets used by desktop Java or another non-PWA runner. Keep the change scoped to browser/PWA resources unless the other runtime is intentionally being modernized.

## Summary

The approach is not "make loading null" and not "delete loading logic." It is:

Use the PWA DOM loader for user-visible loading, complete the converted game's loading sequence during init, let the final loading step install a real mode, and then remove only the obsolete in-canvas loading mode and its PWA-only assets.
