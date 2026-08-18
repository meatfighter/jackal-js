# Jackal PWA Audio Resume/Suspension Handoff

Date: 2026-08-18

## Context

Stickvania exposed a browser-only audio lifecycle bug during credits: after opening the live PWA menu or losing focus, resuming could leave music silent even though the game and Slick2D-ts still believed a song was playing.

Jackal has the same risk class because it uses:

- a Java-style `Song` wrapper with intro/intro2/loop `Music` parts,
- a live PWA menu and focus/visibility suspension,
- Slick2D-ts `GameContainer.setMusicOn(false)` to pause browser audio,
- exact game-state audio persistence.

Slick2D-ts keeps Java-style `Music.playing()` true while a track is globally suspended by `setMusicOn(false)`. If the underlying Web Audio source/handle does not resume cleanly, a `Song` wrapper can remain `playing == true`, while `Song.update()` sees a part as still playing and never restarts the audible source.

## Relevant Code

- `pwa/src/app/JackalWebApp.ts`
    - `showLiveMenuOverlay()` calls `this.game.setBrowserSuspended(true)` before `this.saveCurrentGameState()`.
    - `suspendCurrentGameForLifecycle()` calls `this.game.setBrowserSuspended(true)` before `this.saveCurrentGameState()`.
    - `resumeCurrentGameForLifecycle()` calls `this.game.setBrowserSuspended(false)` and resumes the loop.

- `pwa/src/jackal/Main.ts`
    - `update()` switches to `requestedSong` and calls `currentSong.update()` every frame.
    - `setBrowserSuspended(true)` stores `browserSuspendedMusicOn` / `browserSuspendedSoundOn`, then calls `gc.setMusicOn(false)` and `gc.setSoundOn(false)`.
    - `setBrowserSuspended(false)` restores those flags but does not explicitly revive `currentSong`.

- `pwa/src/jackal/Song.ts`
    - `play()` returns early if `this.playing` is already true.
    - `update()` advances intro -> intro2 -> loop based on `Music.playing()`.
    - There is no browser-resume helper.

- `pwa/src/jackal/persistence/JackalGameStateSerializer.ts`
    - Captures `currentSongId`, `requestedSongId`, `currentSongState`, and `audioState`.
    - `createAudioStateSnapshot()` preserves pre-suspension flags if `main.browserSuspended` is true.
    - `restoreSongPlayback()` restores active song music and audio flags.

## Findings

### 1. Jackal Should Add A `Song.resumeAfterBrowserSuspension()` Helper

This is the closest match to the Stickvania issue.

Recommended behavior:

- If `Song.playing` is false, do nothing.
- If `intro`, `intro2`, or `loop` is the currently active `Music` part, call `music.resume()`.
- If no part is active but the song is still marked playing:
    - For looped songs, restart/re-enter the loop.
    - For one-shot songs with no loop, be conservative. Do not blindly replay if the song may have naturally ended. If the code can identify a currently active part from private music state, resume that part only.

Jackal has one-shot `Song`s:

- `continueSong = new Song("music/continue.ogg")`
- `cutsceneSong = new Song("music/cutscene.ogg")`
- `titleSong = new Song("music/title.ogg")`

It also has looped songs:

- `bossSong`
- `endingSong`
- `introSong`
- `stageSong0`
- `stageSong1`
- `stageSong2`
- `superTankSong`

So the helper should be slightly more conservative than Stickvania's helper for one-shot songs.

Suggested shape:

```ts
public resumeAfterBrowserSuspension(): void {
    if (!this.playing) {
        return;
    }
    if (this.resumeMusicPart(this.intro)) {
        return;
    }
    if (this.resumeMusicPart(this.intro2)) {
        return;
    }
    if (this.resumeMusicPart(this.loop)) {
        return;
    }
    if (this.loop != null) {
        this.loop.loop();
    }
}

private resumeMusicPart(music: Music): boolean {
    if (music == null || !music.playing()) {
        return false;
    }
    music.resume();
    return true;
}
```

Because `Music.resume()` only acts for paused/globally suspended music, this should be safe when the handle is healthy. The loop fallback exists for the case where the wrapper remains active but no part reports active playback.

### 2. `Main.setBrowserSuspended(false)` Should Call The Song Helper

After restoring `gc.setMusicOn(this.browserSuspendedMusicOn)` and `gc.setSoundOn(this.browserSuspendedSoundOn)`, call a small browser audio recovery method.

Suggested shape:

```ts
private resumeBrowserAudio(): void {
    if (this.gc == null || !this.browserSuspendedMusicOn || !this.gc.isMusicOn()) {
        return;
    }
    if (this.currentSong != null) {
        this.currentSong.resumeAfterBrowserSuspension();
    }
}
```

Then call it in `setBrowserSuspended(false)` after restoring the music/sound flags and before `resetNextFrameTime()`.

### 3. Save Before Browser Suspension

The PWA shell should snapshot before muting browser audio.

Current shape in `JackalWebApp.ts`:

```ts
this.game.setBrowserSuspended(true);
this.container?.stopSoundEffects();
this.container?.setLoopSuspended(true);
this.saveCurrentGameState();
```

Recommended shape:

```ts
this.saveCurrentGameState();
this.game.setBrowserSuspended(true);
this.container?.stopSoundEffects();
this.container?.setLoopSuspended(true);
```

Apply this to:

- `showLiveMenuOverlay()`
- `suspendCurrentGameForLifecycle()`

This aligns Jackal with Stickvania's fixed PWA shell ordering.

### 4. Serializer Is Mostly Prepared, But Should Be Rechecked After The Ordering Change

`JackalGameStateSerializer` already captures:

- current/requested song ids,
- active song music position/volume/looped state,
- whether the browser suspension wanted music/sound on.

After changing the shell to save before suspension, `createAudioStateSnapshot()` will more often read `gc.isMusicOn()` directly instead of using `browserSuspendedMusicOn`. That is fine and cleaner.

Still verify:

- Saving while in `GameMode.paused` should restore with music off.
- Saving while the PWA live menu is open should restore with music on if the game was not already paused/muted.
- Restoring looped songs should preserve position closely enough.

## Suggested Validation

After patching:

1. Run `npm.cmd run typecheck`.
2. Run `npm.cmd run lint`.
3. Run `npm.cmd run build:pwa`.
4. Browser-test:
    - Title song: open PWA menu, Continue.
    - Gameplay stage song: open PWA menu, Continue.
    - Browser focus loss/regain during gameplay.
    - In-game pause, then PWA focus loss/regain; music should stay muted until unpaused.
    - At least one cutscene or ending/sunset sequence, because these use non-gameplay modes and are closest to the Stickvania credits failure.

## Expected Risk

Low to medium. The PWA shell save-order change is low risk. The `Song` helper is also low risk if one-shot songs are not blindly restarted. The main thing to avoid is replaying completed one-shot songs such as title/continue/cutscene audio after they naturally finished.
