# SlickJackal Performance Sweep

Date: 2026-08-04

## Scope

This pass rechecked the Jackal TypeScript port and the linked `slick2d-ts` dependency after another AI reported fixes and performance improvements. The goal was performance cleanup only where parity stays intact:

- Preserve the Java class/method structure and overload behavior.
- Preserve generated Java-to-TypeScript behavior.
- Avoid temporary objects in frame-hot paths where the Java behavior does not change.
- Avoid replacing Java integer semantics with faster but non-equivalent JavaScript shortcuts.

## Changes Made In `jackal-js`

### Generated Overload Dispatch Avoids Rest-Array Allocation

Changed `tools/convert-java-to-ts.mjs` so generated overloaded methods use fixed optional parameters plus `arguments.length` instead of `...args`.

Previous generated pattern:

```ts
public draw(...args: any[]): any {
    if (args.length === 3 && args[0] instanceof Image) {
        return this.draw__overload0(args[0], args[1], args[2]);
    }
}
```

New generated pattern:

```ts
public draw(arg0?: any, arg1?: any, arg2?: any, arg3?: any, arg4?: any): any {
    const argCount = arguments.length;
    if (argCount === 3 && arg0 instanceof Image) {
        return this.draw__overload0(arg0, arg1, arg2);
    }
}
```

This removes a temporary rest array from hot overload wrappers such as:

- `Main.draw`
- `Main.drawString`
- `Main.drawRotated`
- `Main.drawCentered`
- `Main.drawScaled`
- `Main.drawVehicle`
- `Main.playSound`
- `Main.playSoundIfNotPlaying`
- `GameMode.suggestDirection`
- `GameMode.isDriveable`
- `GameMode.isOutsideOfFrame`
- `GameMode.add`
- `Enemy.isSolid`
- `Enemy.isMine`
- `HitElement.hit`
- `Player.attack`

Parity rationale:

- Arity checks are unchanged in meaning: `args.length === n` became `arguments.length === n`.
- Type guards are unchanged in meaning: `typeof args[i]`, `Array.isArray(args[i])`, and `args[i] instanceof Type` became the equivalent checks on `arg0`, `arg1`, etc.
- The selected overload target is unchanged.
- Constructor dispatch still uses `...args`; constructors are not frame-hot and preserving the existing generator shape there keeps the risk low.

### Java Array Helpers Avoid Callback Allocation

Changed `src/java/JavaRuntime.ts` array helpers:

- `javaArray`
- `java2DArray`
- `java3DArray`
- `java4DArray`

The previous implementation used `Array.from(..., callback)` and `.map(...)`. The new implementation uses direct `new Array(...)` plus loops/fill.

Parity rationale:

- Primitive/default scalar arrays still receive the same value in every slot.
- Nested array defaults are still cloned per element, matching the previous helper behavior.
- Multi-dimensional Java arrays still allocate fresh child arrays for every row/depth level.
- No gameplay logic or dimensions were changed.

## Slick2D TS Recheck

### JavaRandom Performance Issue Appears Fixed

The previous `SLICK2D_TS_RANDOM_PERFORMANCE_ISSUE_2026-08-04.md` handoff was removed because current `C:\js-projects\slick2d-ts\src\slick\support\JavaRandom.ts` now stores the 48-bit Java Random seed as numeric 16-bit limbs.

Current state:

- BigInt remains at API/default-seed boundaries, especially `setSeed(seed: number | bigint)`.
- `next(bits)`, `nextInt(...)`, `nextFloat()`, and `nextBoolean()` use number math and no temporary object allocation.
- The rejection-loop condition keeps Java signed 32-bit overflow via `| 0`.

Verification:

- Stress-checked `slick2d-ts/dist/slick/support/JavaRandom.js` against a BigInt Java Random reference.
- Seeds checked: `-9007199254740991`, `-9223372036854775808`, `-1`, `0`, `1`, `123456789`, `25214903917`, `9223372036854775807`.
- Bounds checked repeatedly: `1`, `2`, `3`, `5`, `7`, `16`, `31`, `32`, `1000`, `65535`, `1048576`, `1073741825`, `2147483647`.
- Methods checked: unbounded `nextInt()`, bounded `nextInt(bound)`, `nextFloat()`, `nextBoolean()`.

Result: `slick2d-ts JavaRandom stress parity ok`.

### Audio Handoff Superseded

Later source comparison against the original Java Slick2D code showed the old audio handoff was incorrect.

The current `slick2d-ts` source does pre-multiply per-call sound volume by `SoundStore.getSoundVolume()`, and `SoundStore.playSound(...)` multiplies by `this.soundVolume` again. However, original Java Slick2D does the same through `Sound.java` and `SoundStore.java`, so this is Java parity rather than a confirmed `slick2d-ts` bug.

The old `SLICK2D_TS_AUDIO_ISSUES_2026-08-04.md` file was removed and replaced by `SLICK2D_TS_CURRENT_BUGS_2026-08-04.md`.

The separate previous `Song.loop.playing is not a function` symptom appears addressed in current slick2d-ts: `src/slick/support/Song.ts` converts string refs to `Music` objects and `loop` is a `Music | null`.

## Integer Math Decisions

No broad `javaInt(...)` to bitwise shortcut rewrite was made.

Reason:

- Java float/double-to-int casts are not equivalent to `value | 0` for NaN, infinity, and out-of-range values.
- Jackal is a game, but preserving exact Java behavior is the priority.
- Existing targeted optimizations are retained only where parity was audited, such as packed direction index truncation within known non-negative integer bounds.

BigInt was not removed from stage direction storage.

Reason:

- Java stores pathing data as `long[]`.
- TypeScript stores those Java long values as BigInt to preserve bit extraction parity.
- The hot lookup already avoids allocating a new BigInt shift value by using `JAVA_LONG_PACKED_3BIT_SHIFTS`.

## Verification Commands

Commands run successfully:

- `npm.cmd run convert`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`

Additional parity checks:

- Exhaustive packed-direction extraction check across all `public/resources/maps/dirs-*.dat`.
- JavaRandom stress check against a BigInt reference implementation.

Packed direction results:

- Stage 0: width `16`, height `90`, longs `98743`, entries `2073600`.
- Stage 1: width `16`, height `90`, longs `98743`, entries `2073600`.
- Stage 2: width `16`, height `90`, longs `98743`, entries `2073600`.
- Stage 3: width `16`, height `90`, longs `98743`, entries `2073600`.
- Stage 4: width `16`, height `90`, longs `98743`, entries `2073600`.
- Stage 5: width `16`, height `98`, longs `117078`, entries `2458624`.

Result: all packed direction extractions matched the previous Java-style formula.

## Files Changed

- `tools/convert-java-to-ts.mjs`
- `src/java/JavaRuntime.ts`
- Regenerated overload wrappers in:
  - `src/jackal/Enemy.ts`
  - `src/jackal/GameMode.ts`
  - `src/jackal/HitElement.ts`
  - `src/jackal/Main.ts`
  - `src/jackal/Player.ts`
- Removed stale handoff:
  - `SLICK2D_TS_RANDOM_PERFORMANCE_ISSUE_2026-08-04.md`

## Remaining Follow-Up

The current `slick2d-ts` bug inventory is `SLICK2D_TS_CURRENT_BUGS_2026-08-04.md`.

No confirmed current `slick2d-ts` performance or parity blocker is known from this sweep.
