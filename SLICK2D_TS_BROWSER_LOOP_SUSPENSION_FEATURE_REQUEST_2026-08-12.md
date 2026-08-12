# Slick2D TS Browser Loop Suspension Feature Request

Date: 2026-08-12

## Purpose

Add an explicit browser-only loop suspension feature to `C:\js-projects\slick2d-ts` so browser PWAs can stop all game-loop work while the user is using another app.

This is needed for `C:\js-projects\jackal-js` because the PWA currently pauses game logic and audio when browser focus is lost, but the render loop can still repaint. Jackal contains original Java-parity render methods that mutate animation state during rendering. During the opening cutscene, the helicopter/chinook body stops moving when the browser loses focus, but the rotors keep spinning because `Chinook.render()` advances `rotorAngle`.

The intended result is:

- Browser focus loss can mean true PWA lifecycle suspension.
- No game logic advances.
- No audio polling continues.
- No canvas repainting continues.
- No GPU frame submission continues.
- Existing Java Slick2D `setPaused(...)` semantics remain unchanged.
- Generated Jackal gameplay classes remain Java-parity and do not need special browser conditionals.

## Current Behavior

Jackal's PWA shell calls browser suspension hooks when the page loses focus:

- `C:\js-projects\jackal-js\src\app\JackalWebApp.ts`
  - focus/blur/visibility handlers call `applyCurrentGameLifecycleSuspension()`.
  - lifecycle suspension calls `game.setBrowserSuspended(true)`.
- `C:\js-projects\jackal-js\src\jackal\Main.ts`
  - `update(gc, delta)` returns early when `browserSuspended` is true.
  - `setBrowserSuspended(true)` disables Slick music/sound flags and clears pressed-input records.

That pauses logic and audio state, but it does not stop the browser RAF loop.

In `slick2d-ts`:

- `C:\js-projects\jackal-js\node_modules\slick2d-ts\src\slick\AppGameContainer.ts`
  - `start()` schedules `requestAnimationFrame(this.loop)`.
  - `loopFrame(time)` still polls input, music, and sound.
  - `loopFrame(time)` still calls `updateGame(delta)`.
  - `loopFrame(time)` renders when `this.hasFocus() || this.getAlwaysRender()`.
- `C:\js-projects\jackal-js\src\app\JackalWebApp.ts`
  - Jackal sets `appContainer.setAlwaysRender(true)`.

Because `alwaysRender` is true, `AppGameContainer` continues to render after focus loss even though `Main.update(...)` is returning early.

## Why This Shows Up As Spinning Rotors

The original Java Jackal code mutates several helicopter rotor animation fields inside `render()`, not `update()`.

Opening cutscene:

- Java: `C:\NetBeansProjects\SlickJackal\src\jackal\Chinook.java`
  - `render()` does `rotorAngle -= 30`.
- TypeScript: `C:\js-projects\jackal-js\src\jackal\Chinook.ts`
  - `render()` does `this.rotorAngle -= 30`.

Other confirmed render-time rotor mutations:

- `C:\NetBeansProjects\SlickJackal\src\jackal\EnemyHelicopter.java`
- `C:\js-projects\jackal-js\src\jackal\EnemyHelicopter.ts`
- `C:\NetBeansProjects\SlickJackal\src\jackal\BossHelicopter.java`
- `C:\js-projects\jackal-js\src\jackal\BossHelicopter.ts`
- `C:\NetBeansProjects\SlickJackal\src\jackal\SunsetMode.java`
- `C:\js-projects\jackal-js\src\jackal\SunsetMode.ts`

Do not "fix" this by moving rotor updates from `render()` to `update()` in Jackal. The Java source does it in `render()`, and this port is intentionally preserving Java class/method behavior.

The right fix is to let the browser app stop invoking render while it is lifecycle-suspended.

## Not A Java Parity Bug

This should not be described as a `slick2d-ts` Java-parity bug.

Java Slick2D separates paused update behavior from render behavior:

- `GameContainer.setPaused(true)` pauses updates.
- Java Slick2D can still render when focused or when `alwaysRender` is true.
- `alwaysRender` means the container may render even when it does not have focus.

Current `slick2d-ts` is following that broad model. Existing pause behavior should remain intact because tests already assert Java-like paused semantics:

- Paused containers still receive a zero-delta update.
- Paused containers still poll music/browser audio.

The requested feature is stronger than Java pause. It is a browser/PWA lifecycle capability.

## Requested API

Add an explicit AppGameContainer loop suspension API.

Suggested public methods on `AppGameContainer`:

```ts
public setLoopSuspended(suspended: boolean): void;
public isLoopSuspended(): boolean;
public suspendLoop(): void;
public resumeLoop(): void;
```

Suggested private field:

```ts
private loopSuspended = false;
```

This API should not replace or alter:

- `setPaused(...)`
- `pause()`
- `resume()`
- `setAlwaysRender(...)`
- `setUpdateOnlyWhenVisible(...)`
- `setMusicOn(...)`
- `setSoundOn(...)`

## Required Semantics

When `setLoopSuspended(true)` is called:

- Set `loopSuspended = true`.
- Cancel any pending RAF via `cancelAnimationFrame`.
- Set `animationFrame = 0`.
- Do not destroy the container.
- Do not clear textures.
- Do not clear sounds.
- Do not alter fullscreen state.
- Do not alter display size.
- Do not alter `paused`.
- Do not alter `alwaysRender`.
- Do not alter `updateOnlyWhenVisible`.
- Do not alter music/sound enabled flags.
- Leave the current canvas pixels untouched.

While loop-suspended:

- No `requestAnimationFrame` loop should be active.
- `input.poll(...)` must not be called.
- `Music.poll(delta)` must not be called.
- `SoundStore.get().poll(delta)` must not be called.
- `updateGame(delta)` must not be called.
- `game.update(...)` must not be called.
- `game.render(...)` must not be called.
- `Renderer.getBackend().beginFrame(...)` must not be called.
- `Renderer.getBackend().endFrame()` must not be called.
- `Display.sync(...)` must not be called.
- FPS counters should not advance.
- `storedDelta` should not accumulate hidden/suspended time.

When `setLoopSuspended(false)` is called:

- Set `loopSuspended = false`.
- Reset frame timing so no catch-up delta is delivered.
- Clear `storedDelta`.
- Reset or normalize FPS bookkeeping.
- Schedule exactly one RAF if:
  - the container has started,
  - the container is not destroyed,
  - the container is not waiting for queued resources.
- Do nothing harmful if called before `start()`.
- Do nothing harmful if called after `destroy()`.
- Be idempotent.

## Suggested Implementation Shape

Add helper methods to `AppGameContainer` to avoid direct duplicated RAF scheduling.

```ts
private scheduleNextFrame(): void {
    if (this.destroyed || this.loopSuspended || this.animationFrame !== 0) {
        return;
    }
    this.animationFrame = requestAnimationFrame(this.loop);
}

private cancelScheduledFrame(): void {
    if (this.animationFrame !== 0) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
    }
}

private resetLoopResumeTiming(): void {
    this.lastFrameTime = this.now();
    this.storedDelta = 0;
    this.framesThisSecond = 0;
    this.fpsWindowStart = this.lastFrameTime;
    this.fps = 0;
}
```

Then replace direct `requestAnimationFrame(this.loop)` call sites with `scheduleNextFrame()` where appropriate.

Known call sites in current `AppGameContainer.ts`:

- `start()`
- `reinit()`
- `loopFrame(...)`
- hidden/target-frame-rate early returns inside `loopFrame(...)`
- resource completion path in `waitForQueuedResources()`

Guard the RAF callback itself:

```ts
private readonly loop = (time: number): void => {
    this.animationFrame = 0;
    if (this.destroyed || this.loopSuspended) {
        return;
    }
    try {
        this.loopFrame(time);
    } catch (error) {
        this.reportError(error);
    }
};
```

Important: current code may leave `animationFrame` holding the previously scheduled RAF id while that callback is executing. If adding `scheduleNextFrame()`, clear `animationFrame` at the start of the RAF callback as shown above. Tests should cover that duplicate RAFs are not scheduled.

`setLoopSuspended(...)` can be shaped like:

```ts
public setLoopSuspended(suspended: boolean): void {
    if (this.loopSuspended === suspended) {
        return;
    }
    this.loopSuspended = suspended;
    if (suspended) {
        this.cancelScheduledFrame();
        this.storedDelta = 0;
        return;
    }
    this.resetLoopResumeTiming();
    if (this.started && !this.destroyed && !this.waitingForResources) {
        this.scheduleNextFrame();
    }
}

public isLoopSuspended(): boolean {
    return this.loopSuspended;
}

public suspendLoop(): void {
    this.setLoopSuspended(true);
}

public resumeLoop(): void {
    this.setLoopSuspended(false);
}
```

`destroy()` should cancel any scheduled frame and reset or leave harmless the suspension flag. Prefer setting `loopSuspended = false` during destroy so a reused object is not accidentally stuck suspended, although `start()` already returns early when `started` is true and destroyed objects should not normally be restarted.

`reinit()` should respect suspension:

- If the container was running and not suspended, reinit should schedule a new frame after resource load.
- If the container was suspended, reinit should rebuild state but not restart RAF until resumed.

`waitForQueuedResources()` should respect suspension:

- On successful resource completion, schedule next frame only if not destroyed and not loop-suspended.
- If resources finish while suspended, resume should schedule the frame.

## Suggested Tests

Add tests to `C:\js-projects\slick2d-ts\test\app-game-container-visibility.test.mjs`.

Recommended coverage:

1. `setLoopSuspended(true)` cancels an existing RAF.
   - Arrange a container with `animationFrame = 9`.
   - Stub `cancelAnimationFrame`.
   - Call `setLoopSuspended(true)`.
   - Assert cancel was called with `9`.
   - Assert `animationFrame === 0`.
   - Assert `isLoopSuspended() === true`.

2. `loopFrame(...)` is not called after suspended RAF callback fires.
   - Schedule or simulate a RAF id.
   - Set suspended.
   - Invoke `loop(time)` if test can access private through JS runtime.
   - Assert no update/render/audio polling calls happen.

3. `setLoopSuspended(false)` resets timing and schedules exactly one RAF.
   - Start from `started = true`, `destroyed = false`, `waitingForResources = false`.
   - Set `storedDelta` to a nonzero value.
   - Stub `requestAnimationFrame`.
   - Resume.
   - Assert one RAF request.
   - Assert `storedDelta === 0`.

4. Resume does not schedule when destroyed.

5. Resume does not schedule when not started.

6. Resume does not schedule while `waitingForResources` is true.

7. Resource completion does not schedule while suspended.
   - Use or adapt existing `waitForQueuedResources()` test scaffolding.

8. Existing paused behavior remains unchanged.
   - Keep current tests:
     - paused containers still receive zero-delta update.
     - paused containers still poll music and browser audio.

9. Existing hidden-visible behavior remains unchanged.
   - Keep current tests:
     - hidden frames skip update/render by default.
     - hidden time is not accumulated into next visible update.

## Jackal Integration After Engine Feature Lands

After `slick2d-ts` exposes this API, update `C:\js-projects\jackal-js\src\app\JackalWebApp.ts`.

On lifecycle suspend:

```ts
this.game.setBrowserSuspended(true);
this.container?.setLoopSuspended(true);
this.saveCurrentGameState();
```

On lifecycle resume:

```ts
this.game.setBrowserSuspended(false);
this.container?.setLoopSuspended(false);
```

Recommended order:

- Suspend: set Jackal browser state first, then suspend the loop.
- Resume: clear Jackal browser state first, then resume the loop.

Reason: the first frame after resume should see live Jackal state.

Keep Jackal's audio behavior as currently implemented:

- `Main.setBrowserSuspended(true)` stores music/sound enabled flags and disables them.
- `Main.setBrowserSuspended(false)` restores those flags and resets timing.
- The PWA shell volume mapping remains unchanged.

## Why Not Just Toggle alwaysRender?

A project-local workaround would be to set `container.setAlwaysRender(false)` on browser focus loss and restore it on focus return.

That would stop rendering when `document.hasFocus()` is false, but it is weaker than true loop suspension:

- RAF still runs.
- Input/audio polling can still happen.
- `Main.update(...)` still gets called and returns early.
- FPS bookkeeping can still advance.
- The app still spends some CPU every frame.

True loop suspension is cleaner for PWAs because it stops the scheduling source itself.

## Why Not Change setPaused?

Do not redefine `setPaused(...)`.

Existing pause behavior is Java Slick2D compatibility behavior. It should remain available for games that rely on Slick's paused-container semantics, including zero-delta updates and continued audio polling.

The new API should be opt-in and browser-specific.

## Acceptance Criteria

For `slick2d-ts`:

- New loop suspension API exists on `AppGameContainer`.
- Existing Java-parity paused tests still pass unchanged.
- Existing visibility tests still pass unchanged.
- New tests prove no update, render, input poll, audio poll, or RAF rescheduling happens while loop-suspended.
- Resume after a long suspension does not deliver a large catch-up delta.
- Reinit/resource-wait paths respect loop suspension.

For `jackal-js` after integration:

- Start a new game.
- Reach the opening Chinook drop-off cutscene.
- Click another external application so browser focus is lost.
- Helicopter body movement stops.
- Helicopter rotor animation stops.
- Audio stops/mutes according to current browser suspension behavior.
- CPU/GPU use drops because the RAF loop is not repainting.
- Return focus to the browser.
- The game resumes without a large jump.
- No stuck input state occurs from keys/buttons held during focus loss.

## Parity Position

This feature intentionally extends `slick2d-ts` for browser lifecycle control. It should be documented as a browser/PWA feature, not a Java Slick2D parity fix.

The feature helps preserve Jackal Java source parity because it avoids editing generated render methods whose side effects came from the Java original.
