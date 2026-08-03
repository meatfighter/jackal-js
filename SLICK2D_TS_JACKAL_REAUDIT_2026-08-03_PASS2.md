# Slick2D TS Jackal Re-Audit, Pass 2 - 2026-08-03

## Scope

This pass re-audited the current TypeScript Slick2D port at:

- `C:\js-projects\slick2d-ts`

against the Java Slick2D source used by SlickJackal:

- `C:\java-projects\slick2d\Slick\src`

and the actual Java game usage surface in:

- `C:\NetBeansProjects\SlickJackal\src\jackal`

The goal of this pass was not to demand native Java desktop behavior in the browser. I intentionally did not file issues for AWT/Applet/JNLP support, LWJGL native display setup, OS cursor fidelity, Java threading APIs, or other desktop-only implementation details that are not required for a PWA SPA desktop browser port.

## Verification Performed

- Ran `npm.cmd test` in `C:\js-projects\slick2d-ts`.
- Result: all current tests passed, `48` passing and `0` failing.
- Rechecked the prior Jackal-critical findings from `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03.md`.
- Searched the SlickJackal Java source for current Slick2D and Slick2D-support helper usage, with extra focus on graphics transforms, image drawing, input, audio, resource loading, color construction, and Java numeric behavior.

## Previously Reported Items Now Verified As Repaired

No new handoff work is needed for these prior items in this pass:

1. `clearWorldClip()` no longer erases the outer `ScalableGame`/screen clip. The renderer now composes screen and world clips.
2. Sound effects can now be muted with exact zero effective gain. The test suite covers both per-sound zero volume and global sound-volume zero.
3. Controller D-pad and directional press/release coverage has been added for Jackal-style input.
4. Resource decode/preparation failures are retained and surfaced by the resource barrier.
5. Explicit `Color.fromInts(...)` and `Color.fromFloats(...)` paths now avoid the Java constructor ambiguity that matters for Jackal's fade table and pixel colors.
6. The resource-loading tests now cover retained failures and wait behavior.

One important audio note: the current test named `sound-effect gain matches Java's double sound-volume application` is correct. Java Slick2D multiplies by `SoundStore.getSoundVolume()` in `Sound.play(...)`, then `SoundStore.playAsSoundAt(...)` multiplies by `soundVolume` again. Do not "fix" that double application unless the Java game port deliberately chooses non-parity behavior.

## New Repair Item

### P0 If Used By The Jackal Port: `SpriteDrawing` Does Not Match Jackal's Java Matrix-Based Drawing Helpers

Affected TypeScript file:

- `C:\js-projects\slick2d-ts\src\slick\support\SpriteDrawing.ts`

Primary affected methods:

- `SpriteDrawing.drawRotated(...)`, lines `53-89`
- `SpriteDrawing.drawRotatedScaled(...)`, lines `96-127`
- `SpriteDrawing.drawScaled(...)`, lines `148-160`
- Alpha helper behavior in `drawWithAlpha(...)`, lines `4-9`

Primary Java reference:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java`

Relevant Java methods:

- `drawRotated(Image, x, y, float[] centers, angle)`, lines `712-718`
- `drawRotatedScaled(Image, x, y, centerX, centerY, angle, scaleX, scaleY)`, lines `721-728`
- `drawRotatedScaled(..., alpha)`, lines `731-741`
- `drawRotated(Image, x, y, centerX, centerY, angle)`, lines `744-751`
- `drawRotated(..., alpha)`, lines `754-763`
- `drawRotated(..., scale)`, lines `766-772`
- `drawRotated(Image, x, y, angle, alpha)`, lines `775-783`
- `rotateGraphics(...)`, `scaleGraphics(...)`, and `popGraphics()`, lines `791-810`
- `drawRotated(Image, x, y, angle)`, lines `814-819`
- `drawScaled(...)`, lines `891-908`
- `drawVehicle(...)`, lines `910-985`

#### What Java Does

Jackal's Java helpers use the OpenGL matrix stack. The `centerX` and `centerY` parameters are not image rotation pivots. They are local draw offsets after the caller has translated, rotated, and sometimes scaled the coordinate system.

Representative Java behavior:

```java
GL11.glPushMatrix();
GL11.glTranslatef(x, y, 0);
GL11.glRotatef(angle, 0, 0, 1);
image.draw(centerX, centerY);
GL11.glPopMatrix();
```

For scaled variants, Java inserts `GL11.glScalef(scaleX, scaleY, 1)` before `image.draw(centerX, centerY)`.

For the no-explicit-center rotated helper, Java draws the image centered on the transform origin:

```java
GL11.glPushMatrix();
GL11.glTranslatef(x, y, 0);
GL11.glRotatef(angle, 0, 0, 1);
image.draw(-image.getWidth() * .5f, -image.getHeight() * .5f);
GL11.glPopMatrix();
```

For `drawScaled(...)`, Java also treats `x, y` as the center/origin, then draws at local `(-width / 2, -height / 2)` after applying the scale.

Alpha overloads in `Main.java` set the image alpha, draw, then reset the image alpha to `1f`. They do not restore the previous alpha value.

#### What TypeScript Currently Does

`SpriteDrawing.drawRotated(...)` currently does this:

```ts
image.setCenterOfRotation(centerX, centerY);
image.setRotation(angle);
image.draw(x, y, image.getWidth() * scale, image.getHeight() * scale);
image.setRotation(0);
```

`SpriteDrawing.drawRotatedScaled(...)` follows the same pattern.

This is not equivalent to Jackal's Java helper semantics:

1. It treats `centerX` and `centerY` as `Image` rotation-center coordinates.
2. Java treats those same values as local draw offsets under the current matrix transform.
3. It draws the image at screen/local coordinate `x, y`.
4. Java translates to `x, y`, then draws at local offset `centerX, centerY`.
5. It mutates image rotation state and resets rotation to `0`.
6. Java does not mutate the image rotation state for these helpers.
7. It leaves the changed center of rotation on the image.
8. Java does not change the image center of rotation.
9. `drawScaled(...)` draws top-left at `x, y`.
10. Java's `drawScaled(...)` treats `x, y` as the center/origin and draws local centered.
11. `drawWithAlpha(...)` restores the previous alpha.
12. Jackal's Java helper overloads reset alpha to `1f`.

#### Concrete Parity Failure

For `drawRotated(image, 100, 100, angle)` with a `64x64` image and `angle == 0`:

- Java draws the image top-left at `(68, 68)`.
- Current TS helper draws the image top-left at `(100, 100)`.

That is a visible `+32, +32` displacement before rotation is even considered.

For `drawRotated(image, 100, 100, -29, -29, angle)`:

- Java translates to `(100, 100)`, rotates, then draws the image at local offset `(-29, -29)`.
- Current TS draws the image at top-left `(100, 100)` and treats `(-29, -29)` as the image pivot.

That is a different transform, different position, and different rotation center.

#### Why This Matters For SlickJackal

This is not an obscure helper. Jackal uses these transform helpers throughout gameplay and menus. If the TypeScript game port uses `SpriteDrawing` as the stand-in for `Main.java`'s helper methods, many sprites will be visibly misplaced or rotate around the wrong point.

Examples from `C:\NetBeansProjects\SlickJackal\src\jackal`:

- `BossHelicopter.java`, lines `348-353`
- `BossShipGun.java`, lines `253-269`
- `BossSuperTank.java`, lines `311-328`
- `BossSuperTankGun.java`, line `145`
- `Chinook.java`, lines `118-128`
- `Column.java`, lines `292-309`
- `ElephantMissile.java`, line `83`
- `EnemyHelicopter.java`, lines `211-216`
- `Fire.java`, line `107`
- `FriendlyHelicopter.java`, lines `274-283`
- `Explosion.java`, lines `130-132`
- `FloorGun.java`, lines `235-250`
- `GrayBoat.java`, line `107`
- `JeepYeahBullet.java`, line `34`
- `JeepYeahFireLeft.java`, lines `81-88`
- `JeepYeahFireRight.java`, lines `75-82`
- `JeepYeahPlane.java`, lines `52-63`
- `MapMode.java`, line `99`
- `Menu.java`, lines `161-176`
- `Player.java`, lines `479-486`
- `PlayerMissile.java`, line `90`
- `Rock.java`, line `161`
- `RotatingGun.java`, line `203`
- `StatueMissile.java`, lines `82-93`
- `StatueSeekerMissile.java`, lines `132-135`
- `SubmarineMissile.java`, line `69`
- `SunsetMode.java`, lines `225-251`
- `SwampMissile.java`, lines `108-111`
- `TravelingExplosion.java`, lines `84-88`

The especially high-risk patterns are calls with negative offsets, such as floor guns, helicopters, missiles, rocks, and vehicle sprite centers. Those offsets are meant to be local draw positions, not image pivot positions.

#### Required Repair

Repair one of these two ways:

1. Make `SpriteDrawing` exactly model the Java `Main.java` helper semantics.
2. Remove or clearly mark `SpriteDrawing` as not parity-safe for Jackal and implement the exact helpers inside the Jackal TypeScript port instead.

If repairing `SpriteDrawing`, the implementation must use renderer/graphics transform composition equivalent to the Java GL sequence:

- push transform
- translate by `x, y`
- rotate by `angle` around the translated local origin
- scale where Java scales
- draw the image at the Java local offset
- pop transform

Do not emulate these helpers by mutating `Image.setRotation(...)` or `Image.setCenterOfRotation(...)`. That is not equivalent, especially under nested transforms from `rotateGraphics(...)`, `scaleGraphics(...)`, and `popGraphics()`.

For alpha overloads that claim to map Jackal's `Main.java` helpers, reset image alpha to `1` after drawing, matching Java source. Do not silently restore the previous alpha unless that helper is explicitly documented as a new browser-only convenience helper and is not used for the 1-to-1 Jackal port.

#### Acceptance Tests To Add

Add focused tests that validate transformed draw output, not just method calls.

Minimum cases:

1. `drawRotated(image, 100, 100, 0)` with a `64x64` image must draw as if the top-left local point is `(68, 68)`.
2. `drawRotated(image, 100, 100, -29, -29, 0)` must draw top-left at `(71, 71)`.
3. `drawRotated(image, 100, 100, -29, -29, 90)` must match `translate(100,100) -> rotate(90) -> draw(-29,-29)`.
4. `drawRotatedScaled(image, 100, 100, -29, -29, 0, 2, 3)` must match `translate(100,100) -> rotate(0) -> scale(2,3) -> draw(-29,-29)`.
5. `drawScaled(image, 100, 100, 2)` with a `64x64` image must match `translate(100,100) -> scale(2,2) -> draw(-32,-32)`, not `draw(100,100,128,128)`.
6. A nested transform case must match Java composition: call a `rotateGraphics(...)`-style helper, then call `drawRotated(...)`, then pop.
7. Alpha overloads must leave image alpha at exactly `1`, matching `Main.java`.
8. Draw helpers must not leave image rotation or image center-of-rotation mutated after the call.

## Non-Issues Confirmed In This Pass

- Browser-specific display, icon, applet, JNLP, and native cursor differences are not filed here because they are not required for the PWA SPA desktop browser target.
- `Sound.play(...)` and `SoundStore.playSound(...)` double-apply global sound volume by design for Java Slick2D parity.
- `BinaryReader.readLong()` returning `bigint` is appropriate for Jackal's stage direction data. The Jackal port must keep Java `long`-derived direction data in `bigint` or an equivalent exact 64-bit representation.
- The TypeScript test suite currently covers the prior Color, Input, Sound, ResourceLoader, and world-clip repair areas.

## Bottom Line

I found one new conversion-relevant repair item in this pass. The core Slick2D areas previously flagged appear fixed, but `SpriteDrawing` is not safe to use as a 1-to-1 mapping for SlickJackal's Java drawing helper methods until its transform semantics are corrected.
