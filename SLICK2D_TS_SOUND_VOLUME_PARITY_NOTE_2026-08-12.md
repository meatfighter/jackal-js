# slick2d-ts Sound Effect Volume Parity Note

Date: 2026-08-12

Scope: documentation-only correction after re-auditing Jackal, `slick2d-ts`, and Java Slick2D audio paths.

This file supersedes the earlier `SLICK2D_TS_SOUND_VOLUME_DOUBLE_APPLY_2026-08-12.md` note. The earlier note correctly identified the math but incorrectly called it a `slick2d-ts` parity bug.

## Summary

`slick2d-ts` applies configured sound-effect volume twice on the normal public `Sound.play(...)`, `Sound.playAt(...)`, and `Sound.loop(...)` path.

That is not a Java Slick2D parity bug. Java Slick2D does the same thing on the public `Sound` wrapper path.

Therefore, do not remove the second multiply from `slick2d-ts` if the goal is Java Slick2D parity.

## TypeScript Path

File:

- `C:\js-projects\slick2d-ts\src\slick\Sound.ts`

Current behavior:

- `Sound.play(pitch, volume)` computes `effectiveVolume = volume * SoundStore.get().getSoundVolume()`.
- `Sound.playAt(...)` does the same.
- `Sound.loop(...)` does the same.
- Each method passes that effective volume to `SoundStore.get().playSound(...)`.

File:

- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts`

Current behavior:

- `SoundStore.playSound(ref, pitch, volume, ...)` later computes `sourceGain = Math.max(0, volume * this.soundVolume)`.

So the public wrapper path produces:

```text
perEffectVolume * soundVolume * soundVolume
```

## Java Slick2D Path

File:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\Sound.java`

Java `Sound.play(float pitch, float volume)` calls:

```java
sound.playAsSoundEffect(pitch, volume * SoundStore.get().getSoundVolume(), false);
```

`Sound.playAt(...)` and `Sound.loop(...)` use the same pre-multiply pattern.

File:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\openal\AudioImpl.java`

Java `AudioImpl.playAsSoundEffect(...)` forwards the supplied gain to the store:

```java
index = store.playAsSound(buffer, pitch, gain, loop);
```

File:

- `C:\java-projects\slick2d\Slick\src\org\newdawn\slick\openal\SoundStore.java`

Java `SoundStore.playAsSoundAt(...)` then applies:

```java
gain *= soundVolume;
```

So the Java public wrapper path also produces:

```text
perEffectVolume * soundVolume * soundVolume
```

## API Distinction

There are two different concepts:

- `SoundStore.setSoundVolume(value)`: Java Slick2D parity API. Normal public `Sound.play(...)` calls square this value.
- PWA master volume slider: browser UX API. Users expect music and effects to track the same audible master value.

Do not redefine `setSoundVolume(...)` to mean browser master volume. That would be more intuitive in isolation but less compatible with Java Slick2D behavior.

If a cleaner browser API is wanted later, add a separate helper or bus such as:

```ts
setMasterVolume(masterVolume);
```

That helper can map:

```text
musicVolume = masterVolume
soundVolume = sqrt(masterVolume)
```

while leaving Java-compatible `setSoundVolume(...)` untouched.

## Jackal PWA Consequence

Jackal currently applies its menu slider like this:

```ts
SoundStore.get().setMusicVolume(masterVolume);
SoundStore.get().setSoundVolume(Math.sqrt(masterVolume));
```

That is mathematically correct for a PWA master-volume slider:

```text
perEffectVolume * sqrt(masterVolume) * sqrt(masterVolume)
= perEffectVolume * masterVolume
```

Music is applied once:

```text
perMusicVolume * masterVolume
```

So the sqrt mapping aligns effective music and sound-effect master volume.

## Jackal Audio Usage

Jackal routes normal sound effects through:

- `C:\js-projects\jackal-js\src\jackal\Main.ts`
- `Main.playSound(...)`
- `Sound.play(...)`

That means Jackal is using the Java-compatible squared public `Sound` path.

The audit did not find Jackal gameplay using `Sound.playAt(...)` directly. Positional Web Audio panning may matter for other games, but it does not currently explain weak Jackal sound effects.

## If Effects Still Sound Weak

Do not remove the second multiply as the first fix.

Check these instead:

- PWA slider value. At master `1`, Jackal sets `soundVolume = 1`, so the squared path is still full volume.
- Asset loudness. Compare decoded browser buffers against the original `.ogg` files.
- Music-vs-effects balance. Music may simply be subjectively louder than one-shot effects.
- Game-side throttling. `Main.MINIMUM_SOUND_TIME = 125` ms intentionally suppresses repeated plays of the same `Sound`.
- One-shot overlap behavior. Slick source availability and `Sound.playing()` checks can affect perceived density.
- Any future `container.reinit()` path. `AppGameContainer.rebuildSystemForReinit()` resets music and sound volume to `1`, so the PWA shell must reapply the slider after reinit.

## Verification Framing

Engine parity test:

- Set `SoundStore` sound volume to `0.25`.
- Call public `sound.play(1, 1)`.
- Java-parity expected gain on the public wrapper path is `0.0625`.

PWA master-slider test:

- Set PWA master volume to `0.25`.
- Jackal should call `setSoundVolume(0.5)`.
- Calling public `sound.play(1, 1)` should then produce effective gain `0.25`.

Music test:

- Set PWA master volume to `0.25`.
- Jackal should call `setMusicVolume(0.25)`.
- Per-track music volume `1` should produce effective music gain `0.25`.

These tests distinguish Java API parity from browser UX master-volume behavior.
