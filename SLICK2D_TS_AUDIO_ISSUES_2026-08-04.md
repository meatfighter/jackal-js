# Slick2D TS Audio Issues For Jackal

Date: 2026-08-04

## Context

The browser Jackal port uses `slick2d-ts` from `C:\js-projects\slick2d-ts`. Music mostly works, but sound effects are reported as not playing correctly, with the subjective symptom that effects sound like they are all the same.

This file is for the AI repairing `slick2d-ts`. It does not request Java-specific desktop APIs; these are browser Web Audio parity issues relevant to the desktop browser port.

## Confirmed Issue: Sound Volume Applied Twice

Java Jackal calls Slick `Sound.play()` and `Sound.play(float pitch, float volume)` through:

- `Main.playSound(Sound sound)`
- `Main.playSound(Sound sound, float volume)`
- `Main.playSoundAlways(Sound sound)`
- `Main.playSoundIfNotPlaying(Sound sound, float volume)`

In Java Slick2D, the per-call `volume` and the global sound volume should combine once.

Current `slick2d-ts` behavior:

- `C:\js-projects\slick2d-ts\src\slick\Sound.ts`
  - `Sound.play(...)` computes `effectiveVolume = volume * SoundStore.get().getSoundVolume()`.
  - `Sound.playAt(...)` does the same.
  - `Sound.loop(...)` does the same.
- `C:\js-projects\slick2d-ts\src\slick\openal\SoundStore.ts`
  - `SoundStore.playSound(...)` computes `sourceGain = Math.max(0, volume * this.soundVolume)`.

That applies global sound volume twice for every sound effect.

Required repair:

- Decide where global volume belongs.
- Keep Slick-style call-site volume as the `Sound.play(...)` argument.
- Apply global `soundVolume` exactly once.
- Verify `Sound.play()`, `Sound.play(float,float)`, `Sound.playAt(...)`, and `Sound.loop(...)`.
- Keep `Music` volume behavior separate; this issue is about sound effects.

Expected parity shape:

- Either `Sound.ts` passes raw per-call `volume` into `SoundStore.playSound(...)` and `SoundStore` multiplies by `soundVolume`, or `Sound.ts` passes a fully effective volume and `SoundStore` does not multiply again.
- The implementation should be consistent with any OpenAL/SoundStore source gain tests already present in `slick2d-ts`.

## Checks Already Performed In Jackal Repo

The Jackal port itself assigns distinct sound refs matching Java:

- `soundeffects/bullet_hit.ogg`
- `soundeffects/enemy_hit.ogg`
- `soundeffects/explode.ogg`
- `soundeffects/explode2.ogg`
- `soundeffects/explode3.ogg`
- `soundeffects/extra_life.ogg`
- `soundeffects/fire.ogg`
- `soundeffects/helicopter.ogg`
- `soundeffects/helicopter2.ogg`
- `soundeffects/helicopter_pickup.ogg`
- `soundeffects/hq_explodes.ogg`
- `soundeffects/hut.ogg`
- `soundeffects/intro_ching.ogg`
- `soundeffects/intro_type.ogg`
- `soundeffects/laser.ogg`
- `soundeffects/machine_gun.ogg`
- `soundeffects/missile.ogg`
- `soundeffects/pause.ogg`
- `soundeffects/pickup.ogg`
- `soundeffects/player_explodes.ogg`
- `soundeffects/plane.ogg`
- `soundeffects/soldier_killed.ogg`
- `soundeffects/throw.ogg`
- `soundeffects/weapon_upgrade.ogg`
- `soundeffects/well_done.ogg`

The files in `C:\js-projects\jackal-js\public\resources\soundeffects` have distinct file sizes and distinct SHA hashes. The generated `src\jackal\Main.ts` constructs a separate `new Sound(...)` for each Java sound-effect ref. The Jackal resource manifest also includes each ref separately.

## Additional Investigation Requested

The double-volume bug is confirmed, but it may not fully explain the user report that all sound effects seem the same. Please also audit `slick2d-ts` for any Web Audio buffer identity or playback-routing bug:

- Verify `ResourceLoader.loadResource(ref)` and `SoundStore.loadAudioBuffer(ref)` cache by the original Java ref and never reuse a decoded `AudioBuffer` for a different ref.
- Add a test with mocked resource bytes or mocked decoded buffers proving two different `Sound` refs call `playSound(...)` with distinct refs and resolve distinct buffers.
- Add a test proving overlapping short effects do not overwrite each other's `AudioBufferSourceNode` before playback starts.
- Verify `Sound.playing()` and `Sound.stop()` track only the most recent active handle for that `Sound`, while still allowing repeated `playSoundAlways(...)` calls to overlap as Java Slick2D allows.
- Verify `SoundStore.setMaxSources(...)` and `findFreeSoundSource()` preserve independent source slots for multiple simultaneous effects.

Do not alter Jackal gameplay code to mask an audio-system bug. The Java game expects Slick `Sound` instances with distinct resource refs to play distinct decoded sound effects.
