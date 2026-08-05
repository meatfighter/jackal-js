# Audio Mixing Audit - 2026-08-05

## Scope

Reviewed the audio pathways for `C:\js-projects\jackal-js` after comparing with `C:\js-projects\stickvania-js\AUDIO_MIXING_AUDIT_2026-08-05.md`.

Projects checked:

- Jackal browser shell: `src\app\JackalWebApp.ts`
- Converted Jackal game classes: `src\jackal`
- Java Jackal source: `C:\NetBeansProjects\SlickJackal\src\jackal`
- TypeScript Slick2D port: `C:\js-projects\slick2d-ts`
- Java Slick2D source: `C:\java-projects\slick2d\Slick`

## Finding

Jackal needs the same project-shell sound-volume compensation as Stickvania if the PWA menu slider is intended to behave as a neutral master volume.

The fix belongs in `JackalWebApp.applyVolume()`, not in generated Jackal classes and not in `slick2d-ts`.

Definition used for "mathematically correct":

- The PWA slider value is a normalized finite master volume `m` where `0 <= m <= 1`.
- Music final gain should be `perMusicVolume * m`.
- Sound-effect final gain should be `perEffectVolume * m`.
- Original Jackal gameplay per-effect volumes must remain untouched.
- `slick2d-ts` Java-parity `Sound` and `SoundStore` behavior must remain untouched.

## Why The Fix Is Needed

Current `slick2d-ts` intentionally matches Java Slick2D's sound-effect gain path:

- `Sound.play(pitch, volume)` multiplies the supplied effect volume by `SoundStore.getSoundVolume()`.
- `SoundStore.playSound(...)` multiplies by `this.soundVolume` again when assigning the Web Audio source gain.

That means a normal effect's final gain is:

```text
perEffectVolume * soundVolume * soundVolume
```

Music has a different path:

```text
perTrackMusicVolume * musicVolume
```

Therefore, if the PWA shell feeds the same slider value into both Slick globals, music is attenuated once and effects are attenuated twice.

## Mathematical Verification

Let:

- `m` = normalized PWA master slider value.
- `gMusic` = Slick global music volume supplied by the app shell.
- `gSound` = Slick global sound volume supplied by the app shell.
- `vMusic` = Java/Slick per-track music volume argument.
- `vEffect` = Java/Slick per-effect sound volume argument.

From the Java and TS source paths:

```text
finalMusicGain = vMusic * gMusic
finalEffectGain = vEffect * gSound * gSound
```

To make the PWA slider a neutral master volume, require:

```text
finalMusicGain = vMusic * m
finalEffectGain = vEffect * m
```

For music:

```text
vMusic * gMusic = vMusic * m
gMusic = m
```

For effects:

```text
vEffect * gSound * gSound = vEffect * m
gSound^2 = m
gSound = sqrt(m)
```

Because `m` is clamped to `0 <= m <= 1`, `sqrt(m)` is finite, real, and also in `0 <= sqrt(m) <= 1`.

Therefore:

```text
finalEffectGain = vEffect * sqrt(m) * sqrt(m)
finalEffectGain = vEffect * m
```

The square-root technique is mathematically correct for Jackal's PWA menu slider under the definition above.

## Jackal-Specific Path Check

Jackal sound effects are routed through Java-mapped methods in `Main`:

- `playSound(Sound sound)` -> `sound.play()`
- `playSoundAlways(Sound sound)` -> `sound.play()`
- `playSound(Sound sound, float volume)` -> `sound.play(1, volume)`
- `playSoundIfNotPlaying(Sound sound)` -> `sound.play()`
- `playSoundIfNotPlaying(Sound sound, float volume)` -> `sound.play(1, volume)`

These match Java `Main.java`.

Jackal has many explicit per-effect volumes copied from Java, including:

- `enemyHitSound`: `0.6`
- `explodeSound`, `explodeSound2`, `explodeSound3`: `0.65`
- helicopter and sunset-style effects with their own computed or fixed volumes

The square-root project-shell mapping is still exact for these calls:

```text
perEffectVolume * sqrt(masterVolume) * sqrt(masterVolume)
= perEffectVolume * masterVolume
```

Music is routed through `Song.play()`, which calls no-argument `Music.play()` or `Music.loop()` and therefore remains:

```text
perTrackMusicVolume * masterVolume
```

## Applied Fix

`src\app\JackalWebApp.ts` now does:

```ts
const masterVolume = clampVolume(this.volume, 1);
this.volume = masterVolume;
SoundStore.get().setMusicVolume(masterVolume);
SoundStore.get().setSoundVolume(Math.sqrt(masterVolume));
```

The app shell clamps the slider-derived value before applying the square root:

```ts
function clampVolume(value: number, fallback: number): number {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(1, value));
}
```

This makes the square-root domain explicit in code.

At master volume `0.8`:

- Before: normal effect global gain was `0.8 * 0.8 = 0.64`.
- After: normal effect global gain is `sqrt(0.8) * sqrt(0.8) = 0.8`.
- Music stays at `0.8`.

At master volume `1`, behavior is unchanged:

- sound volume: `sqrt(1) = 1`
- music volume: `1`

## Why slick2d-ts Should Not Be Changed

The double sound-volume application is Java Slick2D parity. Changing `Sound.ts` or `SoundStore.ts` would alter the mapped behavior for every project using `slick2d-ts`.

The browser shell is the correct layer because the volume slider is a new PWA host feature, not original Jackal game logic.

## Caveat

`SoundStore.playSound(...)` bakes `soundVolume` into each effect source gain at creation time. This matches the current tested Slick behavior that global sound volume is not retroactive for already-playing effects.

Jackal uses `playSoundIfNotPlaying(...)` for longer helicopter/plane-style sound effects. If a user changes the slider while one of those already-created effects is still playing, the current effect source may keep its old gain until the next play. A future browser-only `SoundStore.setMasterVolume(...)` or final shared master bus could make live slider updates affect active sounds and music uniformly, but that would be a new `slick2d-ts` feature rather than required Jackal parity.

The square-root mapping would not be correct for direct project calls to `SoundStore.playSound(...)`, because that lower-level helper only applies `soundVolume` once to the supplied volume. This audit searched Jackal and found no direct `SoundStore.get().playSound(...)` calls. Jackal routes effects through `Sound.play(...)`, which is the two-multiplier path.

## Result

No `slick2d-ts` bug was identified. The required Jackal project-shell fix has been applied.

## Verification Commands

Commands run successfully:

- `npm.cmd test` in `C:\js-projects\slick2d-ts`
  - Result: 99 tests passed, 0 failed.
  - Relevant audio proof: `test\sound-store-parity.test.mjs` asserts that `setSoundVolume(0.5)` followed by `Sound.play(1, 1)` produces gain `0.25`.
- `npm.cmd run lint` in `C:\js-projects\jackal-js`
- `npm.cmd run typecheck` in `C:\js-projects\jackal-js`
- `npm.cmd run build` in `C:\js-projects\jackal-js`

Search checks:

- No direct `SoundStore.get().playSound(...)` calls were found in `src\jackal` or `src\app`.
- No Jackal `Sound.playAt(...)` calls were found.
- No generated Jackal calls to `SoundStore.get().setSoundVolume(...)` or `SoundStore.get().setMusicVolume(...)` were found; only `JackalWebApp.applyVolume()` controls the PWA global volumes.

Numeric sanity table:

```text
master  soundVolume=sqrt(master)       soundVolume^2
0       0                              0
0.01    0.1                            0.010000000000000002
0.25    0.5                            0.25
0.5     0.7071067811865476             0.5000000000000001
0.6     0.7745966692414834             0.6000000000000001
0.8     0.8944271909999159             0.7999999999999999
1       1                              1
```

The tiny differences at `0.01`, `0.5`, `0.6`, and `0.8` are normal IEEE-754 representation error, not a meaningful gain error.
