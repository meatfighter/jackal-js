# Slick2D TS Jackal Re-Audit, Pass 3 - 2026-08-03

## Scope

This pass re-audited the current TypeScript Slick2D port at:

- `C:\js-projects\slick2d-ts`

against:

- Java Slick2D: `C:\java-projects\slick2d\Slick\src`
- Java SlickJackal: `C:\NetBeansProjects\SlickJackal\src\jackal`

This audit is filtered to issues that can affect the 1-to-1 SlickJackal desktop-browser PWA port. I did not file issues for AWT, Applet/JNLP, native LWJGL display creation, OS cursor fidelity, synchronous fullscreen behavior, Java thread behavior, or Web Audio user-gesture differences where the browser port intentionally needs a web-shaped equivalent.

## Verification Performed

- Re-ran the current `C:\js-projects\slick2d-ts` test suite during this pass.
- Result: `55` tests passing, `0` failing.
- Verified that the previous Pass 2 `SpriteDrawing` matrix-transform issue is now repaired and covered by `test\sprite-drawing-parity.test.mjs`.
- Rechecked Jackal-used rendering helpers, image/atlas usage, GL11 transform usage, controller mapping, GameContainer audio toggles, `Song`, bitmap text, geometry helpers, binary reads, `ScalableGame`, and XML packed sheets.
- Reproduced one current `SpriteDrawing.drawScaled(...)` failure directly with the built `dist` package.

## Previously Reported Items Verified As Repaired Or Not Refiled

These areas do not need new handoff work from this pass:

- The original Pass 2 `SpriteDrawing.drawRotated(...)` and `drawRotatedScaled(...)` matrix-origin problem appears fixed. The new tests cover local offsets, nested transforms, alpha reset to `1`, and no image rotation/center mutation.
- The prior controller D-pad and controller edge-state fixes remain covered by tests.
- Controller button remapping is correct for Jackal: Java Slick sends one-based listener button indexes, and Jackal's `InputMode.controllerButtonPressed(...)` decrements before storing. Current TS docs and `HumanInput` are aligned with that.
- The prior color constructor ambiguity repair, sound zero-volume repair, retained resource-failure behavior, and world-clip/screen-clip separation remain covered by tests.
- `ScalableGame` matches Java's important render structure: safe block, clip, translate, scale, push, held render, pop, clear clip, leave safe block.
- `XMLPackedSheet` matches Jackal's observed atlas usage: it constructs `Image(imageRef, false, Image.FILTER_NEAREST)`, parses `<sprite>` entries, and returns unflipped sub-images. Jackal only calls `getSubImage(...)` directly on unflipped `sun` and `wave` strips.

## New Repair Items

### P0: `SpriteDrawing.drawScaled(image, x, y, scale, alpha)` Misroutes When `scale > 1`

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts:170`
- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts:179`
- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts:184`

Relevant Java:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:891`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:899`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:902`

Current TS declares both of these overloads:

```ts
drawScaled(image, x, y, scale, alpha)
drawScaled(image, x, y, width, height)
```

The runtime implementation tries to distinguish them with this numeric heuristic:

```ts
} else if (a <= 1 && b <= 1) {
    // treat as scale, alpha
} else {
    image.draw(x, y, a, b);
}
```

That is not valid for Jackal. Java Jackal's `drawScaled(Image, x, y, scale, alpha)` accepts any `float scale`, not only scales less than or equal to `1`.

Java behavior for the alpha overload is:

```java
image.setAlpha(alpha);
GL11.glPushMatrix();
GL11.glTranslatef(x, y, 0);
GL11.glScalef(scale, scale, 1);
image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
GL11.glPopMatrix();
image.setAlpha(1f);
```

Concrete Jackal call sites where `scale > 1` and `alpha < 1` are expected:

- `C:\NetBeansProjects\SlickJackal\src\jackal\TravelingExplosion.java:55` sets `scale = 2.25f - t * K0`
- `C:\NetBeansProjects\SlickJackal\src\jackal\TravelingExplosion.java:58` sets `scale = 1.75f - ...`
- `C:\NetBeansProjects\SlickJackal\src\jackal\TravelingExplosion.java:61` sets `scale = 1.333f - ...`
- `C:\NetBeansProjects\SlickJackal\src\jackal\TravelingExplosion.java:84` through `:88` calls `main.drawScaled(..., scale, ALPHA)` with `ALPHA = 0.6f`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Explosion.java:96` through `:102` can produce scales above `1`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Explosion.java:132` calls `main.drawScaled(..., scale, alpha)`
- `C:\NetBeansProjects\SlickJackal\src\jackal\BossHelicopter.java:164` sets tiny explosion alpha to `0.5f`
- `C:\NetBeansProjects\SlickJackal\src\jackal\BossSuperTank.java:243` creates delayed alpha `0.5f` explosions

I reproduced the current TS behavior with a fake `64x64` image:

```text
SpriteDrawing.drawScaled(img, 100, 100, 2.25, 0.6)
current TS draw record:
{"x":100,"y":100,"w":2.25,"h":0.6,"alpha":1,"m":[1,0,0,0,1,0,0,0,1]}
```

Expected Java-equivalent behavior for the same `64x64` fake image:

- draw alpha during the image draw: `0.6`
- final image alpha after the helper: `1`
- transform: translate `(100, 100)`, scale `(2.25, 2.25)`
- local draw point: `(-32, -32)`
- transformed top-left: `(28, 28)`
- transformed bottom-right: `(172, 172)`

Why this matters:

- Traveling explosions and alpha explosions will render as tiny top-left width/height draws instead of large centered scaled explosions.
- Alpha will not be applied in the current misrouted branch.
- This is an immediately visible gameplay graphics bug.

Required repair:

- Do not use numeric magnitude to distinguish `scale, alpha` from `width, height`.
- For Jackal parity, `drawScaled(image, x, y, scale, alpha)` must always mean the Java helper above.
- If a width/height convenience helper is still needed for another game, give it a separate name such as `drawSized(...)`, or otherwise make the API unambiguous.
- Update docs so `SpriteDrawing.drawScaled(...)` cannot mislead a Jackal converter into this overload trap.

Acceptance tests to add:

- `drawScaled(fake64, 100, 100, 2.25, 0.6)` must draw transformed top-left `(28, 28)` and bottom-right `(172, 172)`, with draw alpha `0.6`, and final alpha `1`.
- `drawScaled(fake64, 100, 100, 0.5, 0.6)` must still use the same scale-alpha path.
- A width/height helper, if retained, must be tested under a different non-ambiguous method name or invocation shape.

### P0 If The Port Uses `SpriteDrawing`: `drawOffset` Is Not Jackal's `Main.drawOffset`

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts:52`
- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts:56`

Affected docs:

- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2764`
- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2796`
- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2897`

Relevant Java:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:870`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:877`

Java Jackal:

```java
public void drawOffset(Image image, float x, float y) {
  image.draw(x, y);
}

public void drawOffset(Image image, float x, float y, float alpha) {
  image.setAlpha(alpha);
  image.draw(x, y);
  image.setAlpha(1f);
}
```

Current TS:

```ts
public static drawOffset(image, x, y, offsetX, offsetY, alpha?) {
    const draw = () => image.draw(x - offsetX, y - offsetY);
    ...
}
```

These are different helpers. Jackal's `drawOffset` is a local-offset draw helper, usually used while a GL transform is already active. It is not a camera-offset helper.

Concrete Jackal call sites:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Chinook.java:118` through `:126`
- `C:\NetBeansProjects\SlickJackal\src\jackal\SunsetMode.java:225` through `:250`

Example Java pattern from `Chinook`:

```java
main.rotateGraphics(x, y, angle, scale);
main.drawOffset(main.chinooks[0], -154, 0);
main.drawOffset(main.chinooks[1], -154, -80);
...
main.popGraphics();
```

The `-154, 0` and `-154, -80` values are local draw coordinates inside the active translated/rotated/scaled matrix. Subtracting camera offsets, or requiring extra offset parameters, is not equivalent.

Why this matters:

- A literal converter using the current `SpriteDrawing.drawOffset(...)` mapping cannot directly express Jackal's `Main.drawOffset(image, x, y)` overload.
- If forced through the current helper, the Chinook and rescue-helicopter body sprites will be placed incorrectly. In plain JS with only three numeric arguments, the current implementation would subtract `undefined` and draw at `NaN`.
- The docs currently map `Main.drawOffset(Image, x, y)` to a camera-offset helper, which is not Jackal parity.

Required repair:

- Add exact Jackal overloads:
  - `drawOffset(image, x, y)` -> `image.draw(x, y)`
  - `drawOffset(image, x, y, alpha)` -> set alpha, draw at `x, y`, reset alpha to `1`
- Rename the current camera-offset helper or move it to a clearly non-Jackal name.
- Update the parity docs and source helper mapping so `Main.drawOffset(...)` maps to the exact Java behavior.

Acceptance tests to add:

- Inside a `SpriteDrawing.withRotation(...)` or equivalent transform, `drawOffset(fake, -154, -80)` must record local draw coordinates `(-154, -80)` under the active transform.
- `drawOffset(fake, -38, -40, 0.5)` must draw at local `(-38, -40)` with draw alpha `0.5` and final image alpha `1`.
- The old camera-offset behavior must not be reachable through the Jackal-named helper.

### P1: `GeometryMath` Uses Slick `FastTrig` And Double Precision Instead Of Jackal's `Math` Plus Java `float`

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\support\GeometryMath.ts:1`
- `C:\js-projects\slick2d-ts\src\slick\support\GeometryMath.ts:17`
- `C:\js-projects\slick2d-ts\src\slick\support\GeometryMath.ts:22`
- `C:\js-projects\slick2d-ts\src\slick\support\GeometryMath.ts:73`

Affected docs:

- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2828`
- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2830`
- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2910`
- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2911`

Relevant Java:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:46`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:662`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:665`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1970`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1973`
- `C:\NetBeansProjects\SlickJackal\src\jackal\GameMode.java:177`
- `C:\NetBeansProjects\SlickJackal\src\jackal\GameMode.java:185`

Java Jackal:

```java
public static final float ISQRT2 = (float)(1.0 / Math.sqrt(2));

public float[] createUnitVector2(float angle) {
  unitVector[0] = (float)Math.cos(angle);
  unitVector[1] = (float)Math.sin(angle);
  return unitVector;
}

public static Point2D.Float rotate(float x, float y, float angle) {
  float cos = (float)Math.cos(angle);
  float sin = (float)Math.sin(angle);
  return new Point2D.Float(x * cos - y * sin, x * sin + y * cos);
}
```

Current TS:

```ts
public static readonly ISQRT2 = 1 / Math.sqrt(2);
target[0] = FastTrig.cos(angle);
target[1] = FastTrig.sin(angle);
const cos = FastTrig.cos(angle);
const sin = FastTrig.sin(angle);
```

This is not a Java-specific desktop omission. It changes game math.

Concrete value differences from the current TS build:

```text
GeometryMath.ISQRT2:
current TS:          0.7071067811865475
Java float expected: 0.7071067690849304

GeometryMath.createUnitVector2(3.2):
current TS:          [-0.998294775794753, -0.05837414342758039]
Java float expected: [-0.9982947707176208, -0.05837419256567955]

GeometryMath.rotate(1, 2, 3.2):
current TS:          { x: -0.8815464889395922, y: -2.0549636950170864 }
Java float expected: { x: -0.8815463781356812, y: -2.0549638271331787 }
```

The TS docs also say `createUnitVector2(angle)` should return `FastTrig.cos/sin`, but the Java Jackal source uses `Math.cos/sin`, not Slick `FastTrig`.

Why this matters:

- `GameMode.suggestDirection(...)` calls `main.createUnitVector2(angle)` for randomized enemy direction.
- `Player` static sensor constants use `Main.rotate(...)`.
- `GameMode.rotate(float[] v, float angle)` uses the same Java `Math.cos/sin` plus `float` narrowing pattern.
- Small float/trig differences can accumulate in movement, targeting, collision, and replay/parity checks.

Required repair:

- `GeometryMath.ISQRT2` must be `Math.fround(1 / Math.sqrt(2))`.
- `GeometryMath.createUnitVector2(angle)` must use Java's `Math.cos/sin` behavior with Java `float` narrowing. At minimum, treat the argument and stored outputs as `float`, for example by using `Math.fround(...)` at the same boundaries.
- `GeometryMath.rotate(x, y, angle)` must mirror Java `float` inputs, `float cos`, `float sin`, float arithmetic, and `Point2D.Float` storage as closely as the rest of the numeric parity helpers allow.
- The docs must be changed away from `FastTrig` for Jackal's geometry helper mapping.

Acceptance tests to add:

- `GeometryMath.ISQRT2` equals `Math.fround(1 / Math.sqrt(2))`.
- `createUnitVector(45)` and other diagonal cases use that frounded `ISQRT2`.
- `createUnitVector2(...)` for several radians, including `0`, `Math.PI / 6`, `Math.PI / 4`, `-Math.PI / 3`, and `3.2`, matches a Java-float expected table.
- `rotate(1, 2, angle)` matches a Java-float expected table.
- A test should explicitly prove `GeometryMath` is not using Slick `FastTrig` for these Jackal helper mappings.

### P2: `Song` Helper Still Does Not Exactly Match Jackal's `Song.java`

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\support\Song.ts:49`
- `C:\js-projects\slick2d-ts\src\slick\support\Song.ts:58`
- `C:\js-projects\slick2d-ts\src\slick\support\Song.ts:68`
- `C:\js-projects\slick2d-ts\src\slick\support\Song.ts:75`

Relevant Java:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:51`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:65`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:77`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:80`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Song.java:93`

Differences found:

1. Java `play()` calls `stop()` before starting anything. Current TS `play()` does not.
2. Java sets `playing = true` after the selected `Music.play()` or `loop.loop()` call. Current TS sets `playing = true` before starting.
3. Java `play()` does not set `playedIntro2 = true` when `intro == null && intro2 != null`. Current TS does set it true.
4. Because of item 3, Java's first `update()` after the `intro == null && intro2 != null` path will call `intro2.play()` again and set `playedIntro2 = true`. Current TS skips that replay.
5. Java `stop()` only calls `stop()` on a `Music` part if that part exists and `playing()` is true. Current TS calls `stop()` unconditionally through optional chaining.

The most dangerous `intro == null && intro2 != null` three-part case is not currently instantiated by Jackal's `Main.java`; the observed `new Song(null, "music/stage2_repeat.ogg")` is the two-argument intro/loop constructor, not the three-part intro2 constructor. However, this helper is documented as the parity mapping for source `Song` classes, so it should not silently clean up Java behavior.

Required repair:

- Mirror `Song.java` exactly unless the Jackal port chooses to copy `Song` game-locally instead of using the support helper.
- `play()` must keep the Java order: already-playing guard, `stop()`, start selected segment, then `playing = true`.
- Preserve Java's `playedIntro2` lifecycle, including the odd no-intro/intro2 replay behavior.
- For exactness, `stop()` should only stop a part if that part exists and `playing()` returns true.

Acceptance tests to add:

- A fake `Music` sequence proving `play()` calls `stop()` before the start call.
- A fake `Music` sequence proving `playing` becomes true only after the selected start call.
- A fake three-part `Song(null, intro2, loop)` proving first `play()` starts `intro2`, first `update()` starts `intro2` again, then later updates can enter the loop.
- A fake `stop()` test proving non-playing parts are not stopped.

### P2: `BitmapText.drawStringAlpha` Restores Old Alpha, But Jackal Resets Glyph Alpha To `1f`

Affected TypeScript:

- `C:\js-projects\slick2d-ts\src\slick\support\BitmapText.ts:57`
- `C:\js-projects\slick2d-ts\src\slick\support\BitmapText.ts:60`

Affected docs:

- `C:\js-projects\slick2d-ts\docs\SLICK2D-PARITY-API.md:2720`

Relevant Java:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:562`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:570`

Java Jackal:

```java
Image image = font[string.charAt(i)];
image.setAlpha(alpha);
image.draw(x, y);
image.setAlpha(1f);
```

Current TS:

```ts
const oldAlpha = glyph.getAlpha();
glyph.setAlpha(alpha);
glyph.draw(...);
glyph.setAlpha(oldAlpha);
```

The docs currently instruct the restore-old-alpha behavior, but that is not Jackal's source behavior.

Why this matters:

- In normal Jackal font usage the old alpha is usually `1`, so this is lower risk than the `SpriteDrawing` issues.
- It is still not exact. If any glyph alpha was left at a non-`1` value before `drawStringAlpha(...)`, Java resets it to `1`; TS preserves the prior non-`1` value.
- This also contradicts the now-correct `SpriteDrawing` alpha-helper rule that Jackal alpha helpers reset image alpha to exactly `1`.

Required repair:

- For Jackal parity, `BitmapText.drawStringAlpha(...)` must set each glyph alpha to the requested value, draw, then reset that glyph alpha to exactly `1`.
- If a restore-old-alpha convenience is desired, it should be a differently named helper and not documented as Jackal's `Main.drawStringAlpha(...)` mapping.

Acceptance tests to add:

- With a fake glyph whose starting alpha is `0.25`, `drawStringAlpha("A", x, y, 0.6)` must record draw alpha `0.6` and leave final glyph alpha `1`.
- The docs must say reset-to-`1`, not restore-old-alpha, for the Jackal source helper.

## Broader Findings Checked But Not Filed As Jackal Blockers

These were examined and intentionally not added as repair items for this pass:

- `Input` controller button indexing is correct for Jackal. Java Slick listener callbacks are one-based, Java `Input.isButtonPressed(...)` polling is zero-based, and Jackal's `InputMode` decrements callback `buttonIndex` before storing.
- Browser F12/fullscreen behavior is inherently browser-shaped. This is intentionally handled by the PWA/menu/fullscreen plan, not by exact native Java APIs.
- Core direct GL11 transform calls used by Jackal are narrow and present: push, pop, translate, scale, rotate. The current shim routes these to the shared renderer transform stack.
- `BinaryReader` covers Jackal's observed big-endian `readShort`, `readInt`, and `readLong` usage. The game port still must keep Java `long` direction data as `bigint` or another exact 64-bit representation.
- `Image.getSubImage(...)` on an already flipped image still looks like a broader Slick parity risk, but Jackal's direct `getSubImage(...)` calls are only on unflipped `sun` and `wave` strips.
- `Image.copy()` copies alpha/rotation/center/corner-color state, unlike Java's `copy()` via `getSubImage(0,0,width,height)`. Jackal's observed flipped-copy creation happens during loading before those source images have mutated draw state, so this is not filed as a Jackal blocker.
- `Image.draw(x, y, scale, Color)` appears broader-Slick ambiguous in TS, but Jackal does not call that overload directly.
- The container/music poll order differs slightly from Java in places, but Jackal does not use Slick music fades and the Web Audio ended-state tracking makes this low risk for the current game conversion.

## Bottom Line

I found five new conversion-relevant issues in this pass:

1. P0: `SpriteDrawing.drawScaled(..., scale, alpha)` breaks when `scale > 1`.
2. P0 if used by the port: `SpriteDrawing.drawOffset(...)` is not Jackal's local-offset helper.
3. P1: `GeometryMath` uses `FastTrig` and double precision instead of Jackal's `Math` plus Java `float`.
4. P2: `Song` helper sequencing is still not an exact `Song.java` port.
5. P2: `BitmapText.drawStringAlpha(...)` restores old alpha instead of resetting to `1f`.

The highest priority repairs are the two `SpriteDrawing` issues. They can visibly misplace, shrink, or fail to alpha-blend sprites in actual Jackal gameplay even after the previous rotation helper repair.
