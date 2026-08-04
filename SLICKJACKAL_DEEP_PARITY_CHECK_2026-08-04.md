# SlickJackal Deep Parity Check - 2026-08-04

## Scope

This pass audited the failure classes from the most recent browser testing:

- `Player` static initialization and the `invincible` local variable collision.
- `Main.loadFont`, `Character`, `Log`, and loading fallback rendering.
- `Main.draw(...)` overload selection.
- `GameMode.suggestDirection(...)` packed Java `long` direction extraction.
- `Main.addPoints(...)` extra-life threshold arithmetic.
- `Song` music sequencing and Slick `Music.playing()`.
- `BossSuperTankGun` and `RotatingGun` nested enum ownership.
- Java primitive numeric semantics that can affect active gameplay.

The goal remains a mechanical 1-to-1 Java-to-TS port. Fixes in this pass are converter/runtime parity fixes, not gameplay reinventions.

## Sources Compared

- Java game source: `C:\NetBeansProjects\SlickJackal\src\jackal`
- Generated TS game source: `C:\js-projects\jackal-js\src\jackal`
- Game conversion tool: `C:\js-projects\jackal-js\tools\convert-java-to-ts.mjs`
- Local Java runtime helpers: `C:\js-projects\jackal-js\src\java\JavaRuntime.ts`
- Slick2D TS dependency: `C:\js-projects\slick2d-ts`

## Changes Made In This Pass

### 1. Packed `long` Direction Extraction

Java source:

- `GameMode.java:276`: `int i = (((Y1 << 4) + X1) << 4) * directionsHeight + ((Y2 << 4) + X2);`
- `GameMode.java:277`: `int index = i / 21;`
- `GameMode.java:278`: `int shift = 3 * (i % 21);`
- `GameMode.java:284`: `int direction = (int)((directions[index] >> shift) & 7L);`
- The same pattern appears again in the overload beginning at `GameMode.java:321`.

Generated TS now uses:

- `GameMode.ts:342`: `let index = (i / 21) | 0;`
- `GameMode.ts:343`: `let shift = JAVA_LONG_PACKED_3BIT_SHIFTS[i % 21];`
- `GameMode.ts:349`: `let direction = Number((this.directions[index] >> shift) & JAVA_LONG_LOW_3_BITS);`
- The same pattern appears at `GameMode.ts:402` through `GameMode.ts:409`.

Runtime support added:

- `JavaRuntime.ts`: `JAVA_LONG_LOW_3_BITS`
- `JavaRuntime.ts`: `JAVA_LONG_PACKED_3BIT_SHIFTS`

Reason:

- The previous TS expression used a runtime `BigInt(shift)` conversion and then converted the masked result through `javaInt(...)`.
- That caused the browser error `Cannot mix BigInt and other types` when one arithmetic part stayed numeric and another part was converted to BigInt.
- It also created avoidable BigInt temporaries in a gameplay path used by enemy pathing.

Parity and performance decision:

- Keep `stage.directions` as BigInt values because Java stores real signed 64-bit `long` values and `DataInputStream.readLong()` must preserve all bits.
- Avoid per-call `BigInt(shift)` by using a static array of 21 BigInt shift constants.
- Avoid `javaInt(bigint)` for the masked 3-bit value by using `Number(...)` after the mask. The masked value is always `0..7`, so this is exact.
- Use `(i / 21) | 0` for the index because all shipped direction tables keep `i` inside Java `int` range.

Stage direction table bounds verified from shipped resources:

| Stage | size | width | height | max packed index | max `directions` index |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 98743 | 16 | 90 | 2073599 | 98742 |
| 1 | 98743 | 16 | 90 | 2073599 | 98742 |
| 2 | 98743 | 16 | 90 | 2073599 | 98742 |
| 3 | 98743 | 16 | 90 | 2073599 | 98742 |
| 4 | 98743 | 16 | 90 | 2073599 | 98742 |
| 5 | 117078 | 16 | 98 | 2458623 | 117077 |

All are far below `Integer.MAX_VALUE`, so the optimized numeric division does not depend on overflow behavior for the actual game data.

Verification performed:

- Exhaustively compared old BigInt-shift extraction and new constant-shift extraction for every source/target cell pair in all six shipped `maps/dirs-*.dat` files.
- Result: all six stages reported packed direction parity OK.

### 2. Java `Math.round(float)` Sites

Java `Math.round(float)` is not simply JavaScript `Math.round(...)`; Java performs the `float` operation as `floor(a + 0.5f)` and then narrows to `int`.

Affected Java source sites:

- `BossBlueTank.java:157`
- `BrownTank.java:169`
- `FireTank.java:142`
- `GrayJeep.java:134`
- `GrayTank.java:173`
- `GameMode.java:252`
- `SubmarineMissile.java:25`

Generated TS now uses `javaRoundFloat(...)` at the corresponding locations:

- `BossBlueTank.ts:199`
- `BrownTank.ts:218`
- `FireTank.ts:177`
- `GrayJeep.ts:166`
- `GrayTank.ts:225`
- `GameMode.ts:318`
- `SubmarineMissile.ts:30`

Runtime helper:

- `JavaRuntime.ts`: `javaRoundFloat(value)`

Important details:

- The helper rounds the input to Java float precision with `Math.fround(...)`.
- It also rounds the `+ 0.5f` addition to float precision before `Math.floor(...)`.
- The final narrowing uses `javaInt(...)`, preserving Java float-to-int behavior for `NaN`, infinities, and out-of-range values.

Sample checks:

- `javaRoundFloat(-1.6) == -2`
- `javaRoundFloat(-1.5) == -1`
- `javaRoundFloat(-0.5) == 0`
- `javaRoundFloat(0.5) == 1`
- `javaRoundFloat(NaN) == 0`
- `javaRoundFloat(Infinity) == 2147483647`
- `javaRoundFloat(-Infinity) == -2147483648`

### 3. Extra Life Calculation

Java source:

- `Main.java:471`: `public void addPoints(int points)`
- `Main.java:472`: `int before = score;`
- `Main.java:473`: `score += points;`
- `Main.java:474-475`: extra-life thresholds use `(before - 20000) / 50000` and `(score - 20000) / 50000`

The key parity detail is Java `int` division truncates toward zero. JavaScript division does not.

Generated TS now uses:

- `Main.ts:496`: `public addPoints(points: any): void`
- `Main.ts:500`: `javaIntDiv(before - 20000, 50000) != javaIntDiv(this.score - 20000, 50000)`

Reason:

- If negative pre-threshold values are divided using floor-like behavior, kills below 20,000 points can look like threshold crossings.
- That explains the observed symptom where killing an enemy could grant extra lives too often.

Current behavior:

- One extra life is granted when crossing 20,000.
- After that, one extra life is granted each time the `(score - 20000) / 50000` Java-int bucket changes.
- No extra life is granted merely for a normal small enemy kill below the threshold.

### 4. `javaIntDiv(...)` Hot Path

`javaIntDiv(...)` was tightened:

- Inputs are narrowed once with `javaInt(...)`.
- Divide-by-zero still throws.
- `Integer.MIN_VALUE / -1` returns `Integer.MIN_VALUE`, matching Java overflow behavior.
- The normal path returns `Math.trunc(left / right)`.

This avoids wrapping the already-truncated division result through another `javaInt(...)`.

### 5. Player Static Initialization

Java source:

- `Player.java:36-41` initializes three rotated sensor points with `Main.rotate(...)`.
- `Player.java:431` declares a local boolean named `invincible`, shadowing the instance field.

Generated TS current state:

- `Player.ts:49` static initializer uses `rotatePoint(...)`, a runtime helper, not `Main.rotate(...)`.
- That avoids the prior ES module temporal-dead-zone failure: `Cannot access 'Main' before initialization`.
- `Player.ts:456` uses `let invincibleLocal = this.invincible > 0;`, avoiding the prior local-field name collision.

Audit result:

- No remaining `Main.rotate(...)` or `Main.` use inside the `Player` static initializer.
- The constructor still reads `Main.mainInstance` and `Main.gameMode`, which matches Java's instance construction timing and is not a static initialization cycle.

### 6. `BossSuperTankGun` and `RotatingGun` Enum Ownership

Java source:

- `RotatingGun.java:33`: `public enum State { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }`
- `RotatingGun.java:35`: `public State state = State.PAUSED_BETWEEN_FIRING;`
- `BossSuperTankGun.java:29`: declares its own `State`, but `BossSuperTankGun.java:31` actually uses `RotatingGun.State state = RotatingGun.State.PAUSED_BETWEEN_FIRING;`

Generated TS current state:

- `RotatingGun.ts:8`: `export enum RotatingGunState { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }`
- `BossSuperTankGun.ts:8`: imports `RotatingGunState`
- `BossSuperTankGun.ts:56`: initializes `state` to `RotatingGunState.PAUSED_BETWEEN_FIRING`
- No remaining `RotatingGun.BossSuperTankGunState` reference was found.

Audit result:

- The browser error `Cannot read properties of undefined (reading 'PAUSED_BETWEEN_FIRING')` is fixed in generated TS.
- The unused generated `BossSuperTankGunState` enum remains because it exists in Java source. It is not used by Java behavior and is not used by current TS behavior.

### 7. `Song.loop.playing()`

Java source:

- `Song.java` stores `Music intro`, `Music intro2`, and `Music loop`.
- String constructors create `new Music(...)`.
- Music-object constructors store `Music` references directly.

Generated TS current state:

- `Song.ts:18-25`: two-string constructor creates `new Music(...)` for the loop.
- `Song.ts:32-43`: three-string constructor creates `new Music(...)` for intro/intro2/loop where applicable.
- `Song.ts:76-84`: `stop()` calls `.playing()` only after null checks.

Slick2D TS current state:

- `C:\js-projects\slick2d-ts\src\slick\Music.ts:167-170` defines `playing(): boolean`.

Audit result:

- The reported `this.loop.playing is not a function` issue is not present in current generated `Song.ts` plus current `slick2d-ts` `Music.ts`.
- If it recurs in the browser, first clear Vite/browser cache and confirm the deployed bundle includes the current generated `Song.ts`.

### 8. `Main.draw(...)` Overload Error

Java source:

- `Main.java:574`: `draw(Image image, float x, float y)`
- `Main.java:578`: `draw(Image image, float x, float y, float alpha)`
- `Main.java:833`: `draw(Image image, float x, float y, float angle, float scale)`

Generated TS current state:

- `Main.ts:606-617` dispatches these overloads by arity and `Image`/number guards.

Audit result:

- All imports found in `src` resolve `slick2d-ts` through the package name, so no evidence of two differently imported `Image` classes was found in this repo.
- `XMLPackedSheet.getSprite(...)` in `slick2d-ts` returns `Image | null`, and `Image.getSubImage(...)` returns `Image`.
- If `No Java method overload matched draw: 3` recurs, the most likely current causes are a missing sprite/tile value or an invalid tile index, not a known remaining converter pattern from this pass.
- No gameplay code was changed here because masking a missing image with a fallback draw would not match Java.

### 9. Generated Raw Pattern Sweep

Searches performed after conversion and fixes:

- No raw Java primitive casts remain in generated `src/jackal/*.ts`: `(int)`, `(long)`, `(short)`, `(byte)`, `(char)`, `(float)`, `(double)`.
- No generated `Math.toDegrees(...)` or `Math.toRadians(...)` calls remain.
- No generated `BigInt(shift)` or `>> BigInt(...)` packed-direction calls remain.
- No generated `javaInt(((this.directions[index] ...` packed-direction calls remain.
- No generated raw `Math.round(...)` calls remain in `src/jackal/*.ts`.

### 10. Remaining BigInt Use

BigInt still appears where it is necessary for Java `long` parity:

- `Main.ts:1943`: `stage.directions = javaArray(size, 0n);`
- `Main.ts:1945`: `stage.directions[i] = dis.readLong();`
- `JavaRuntime.ts`: constants and `javaLong(...)`

This is intentional:

- The direction data is serialized Java `long` data.
- Java `long` bit shifting cannot be exactly represented with normal JS bitwise operators, which are 32-bit only.
- The optimized lookup now avoids creating new BigInts every frame; it reuses precomputed BigInt constants.

## Slick2D TS Issue Found

No new Slick2D TS correctness bug was found in `BinaryReader.readLong()` for this pass. It must return BigInt for Java `long` parity.

One Slick2D TS performance issue was found at the time of this pass:

- `C:\js-projects\slick2d-ts\src\slick\support\JavaRandom.ts` uses BigInt in the hot RNG path.
- Jackal calls `main.random.nextInt(...)`, `nextFloat()`, and `nextBoolean()` frequently during gameplay.
- This is correct behaviorally but undesirable for a high-performance browser game.

This item was later fixed in `slick2d-ts` and the separate handoff file was removed:

- `SLICK2D_TS_RANDOM_PERFORMANCE_ISSUE_2026-08-04.md`

The earlier audio handoff was later superseded after checking original Java Slick2D sound-volume behavior:

- `SLICK2D_TS_AUDIO_ISSUES_2026-08-04.md`

The current `slick2d-ts` bug inventory is:

- `SLICK2D_TS_CURRENT_BUGS_2026-08-04.md`

## Verification Commands Run

- `npm.cmd run convert`
- Stage packed-direction exhaustive Node check over all shipped `maps/dirs-*.dat`
- Java round-float sample Node check
- `rg` raw-pattern sweeps for stale Java numeric and packed-long conversion patterns

Final lint/typecheck/build verification is recorded in the assistant response for this pass.
