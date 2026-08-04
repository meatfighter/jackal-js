# SlickJackal Preconversion Analysis

Date: 2026-08-03

This document is a research and discussion pass before converting `C:\NetBeansProjects\SlickJackal` to TypeScript. No game conversion code is included here. The goal is to answer what still needs to be settled before the 1-to-1 Java-to-TypeScript conversion starts.

## Executive Answer

Yes, there are a few things to do before conversion. They are not more broad audits; they are conversion rules and verification gates that need to be fixed up front:

1. Define the exact Java-to-TS mapping contract for every source file, class, field, method, static initializer, and asset reference.
2. Decide how to document the two bundled Java desktop Slick2D container files under `src/org/newdawn/slick`, since a browser PWA intentionally replaces native LWJGL window behavior.
3. Freeze numeric parity rules for `int`, `long`, `byte`, `short`, `float`, casts, division, modulo, shifts, boolean eager operators, `Math.round`, and Java `Random`.
4. Build a conversion ledger before porting: Java file to TS file, Java methods to TS methods, and explicit exceptions.
5. Build binary and asset verification fixtures before porting `Main.loadNext`, because Jackal relies on synchronous Java classpath-style DAT/XML/audio/image loading.
6. Establish the PWA shell contract: splash dots, visible loading errors, retries, version/cache busting, user-gesture Start button, volume slider, and hamburger return to menu.

No new Jackal-blocking defect was found in `C:\js-projects\slick2d-ts` during this pass. I did not create a new Slick2D-TS repair handoff file.

## Documentation Cleanup

Kept:

- `SLICKJACKAL_WEB_PORT_AUDIT.md`: still useful for broad project inventory, full asset list, trigger mapping, loading details, and PWA notes.
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS6.md`: latest Slick2D-TS Jackal-focused reaudit. It records that no new Slick2D-TS repair item was found.
- `SLICKJACKAL_PRECONVERSION_ANALYSIS_2026-08-03.md`: this file.

Removed as superseded or no longer relevant to the current pre-conversion state:

- `SLICK2D_TS_MISSING_AUDIT.md`
- `SLICK2D_TS_JACKAL_FIX_HANDOFF.md`
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03.md`
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS2.md`
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS3.md`
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS4.md`
- `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS5.md`

Reason: those files represented older repair queues or intermediate Slick2D audit passes that another AI claimed were repaired. Keeping them beside the latest pass would make the conversion queue ambiguous.

## Source Shape To Preserve

Source roots inspected:

- Java game: `C:\NetBeansProjects\SlickJackal\src`
- Java gameplay package: `C:\NetBeansProjects\SlickJackal\src\jackal`
- Bundled local Slick desktop classes: `C:\NetBeansProjects\SlickJackal\src\org\newdawn\slick`
- TypeScript Slick2D port: `C:\js-projects\slick2d-ts`

Counts:

| Item | Count |
|---|---:|
| Java source files under `src` | 126 |
| Java gameplay files under `src\jackal` | 124 |
| Bundled local Slick desktop files under `src\org\newdawn\slick` | 2 |
| Non-Java source assets under `src` | 126 |
| `.dat` assets | 40 |
| `.ogg` assets | 39 |
| `.png` assets | 24 |
| `.xml` assets | 23 |
| Non-Java asset bytes | 10,603,005 |

The TS port should preserve the Java package layout wherever possible:

```text
Java: C:\NetBeansProjects\SlickJackal\src\jackal\Main.java
TS:   C:\js-projects\jackal-js\src\jackal\Main.ts

Java: C:\NetBeansProjects\SlickJackal\src\jackal\GameMode.java
TS:   C:\js-projects\jackal-js\src\jackal\GameMode.ts
```

The browser/PWA shell should be outside the Java-parity tree:

```text
src\app\...
```

That keeps browser-only startup/menu/service-worker code from contaminating the class-for-class Jackal port.

## Required Mapping Contract

Before converting, create a ledger with these columns:

| Field | Meaning |
|---|---|
| Java file | Original path, for example `src/jackal/Main.java`. |
| TS file | Port path, for example `src/jackal/Main.ts`. |
| Class/interface/enum | Original type name. |
| Status | `pending`, `ported`, `exception`, or `verified`. |
| Method count | Mechanical Java method count. |
| TS method count | Mechanical TS method count. |
| Static fields/init notes | Static initializer ordering concerns. |
| Numeric concerns | `int`, `long`, `float`, casts, shifts, binary reads, random, etc. |
| Asset refs | Literal resource paths used by this file. |
| Exception reason | Required only if any Java source is not ported literally. |

Rules:

- One Java class/interface/enum becomes one TS file.
- Keep class names and method names unless TypeScript syntax forces a small adaptation.
- Keep file and directory names parallel to Java.
- Keep the original resource strings such as `images/sprites-9.xml`, `maps/dirs-0.dat`, and `music/title.ogg`.
- Do not merge classes for convenience.
- Do not move game logic into browser shell files.
- Every omitted Java line needs either a TS counterpart or an explicit documented exception.

## Bundled Slick Container Decision

SlickJackal includes:

```text
src/org/newdawn/slick/ApplicationGameContainer.java
src/org/newdawn/slick/ScalableGameContainer.java
```

These are local desktop Slick2D/LWJGL container copies. For a PWA desktop-browser port, their native behavior is intentionally replaced:

- LWJGL display creation is replaced by browser canvas setup.
- Native window icons are replaced by web app icons and manifest icons.
- Native fullscreen is replaced by browser fullscreen APIs and may require a user gesture.
- Native cursor byte-buffer code is not a browser gameplay requirement.
- Java applet/JNLP/native library handling is not relevant.

Recommended decision:

- Do not port these two files as gameplay logic.
- Do include explicit exception rows in the mapping ledger.
- Use `slick2d-ts` browser-compatible `ApplicationGameContainer`, `AppGameContainer`, and `ScalableGame` equivalents.

If absolute source-file parity is interpreted literally, create stub or adapter TS files at matching paths that delegate to `slick2d-ts` and document every browser-specific substitution. That is cleaner than pretending native LWJGL code can be meaningfully converted 1-to-1 for the browser.

## Integer And Numeric Parity Rules

This game uses Java numeric semantics heavily. TS `number` is not Java `int`, and loose conversion will create gameplay drift.

Use `C:\js-projects\slick2d-ts\src\slick\support\JavaNumbers.ts` wherever possible. It already provides helpers including `toInt`, `castDoubleToInt`, `intDiv`, `intRem`, `toByte`, `toShort`, `toFloat`, `roundFloat`, and `roundDouble`.

### `int`

Java `int` is 32-bit signed. Arithmetic overflows wrap. Integer division truncates toward zero.

TS policy:

- Store most Java `int` fields as `number`.
- Narrow at Java assignment/cast boundaries with `toInt(...)` when overflow, shifts, or array indexing can matter.
- Replace Java `int / int` with `intDiv(...)`.
- Preserve Java `(int)x` as truncation toward zero, not floor.
- Use JS bitwise operators only when Java 32-bit coercion is intended.

High-risk examples:

- `GameMode.suggestDirection`
- `GameMode.drawBackground`
- `GameMode.processTriggers`
- `HitElement.updateTrail`
- `Main.drawString(int...)`
- `Main.loadMaps`
- `Main.loadDirections`

### `long`

Java `long` is 64-bit signed. Jackal's most important `long` use is packed direction data loaded from `maps/dirs-*.dat`.

TS policy:

- Use `bigint` for direction arrays.
- `BinaryReader.readLong()` should return `bigint`.
- Convert to `number` only after masking a small value.

Required `suggestDirection` shape:

```text
int X1 = ((int)x1) >> 7;
int Y1 = ((int)y1) >> 7;
int X2 = ((int)x2) >> 7;
int Y2 = ((int)y2) >> 7;
int i = (((Y1 << 4) + X1) << 4) * directionsHeight + ((Y2 << 4) + X2);
int index = i / 21;
int shift = 3 * (i % 21);
int direction = (int)((directions[index] >> shift) & 7L);
```

TS must use Java int math for `i`, `index`, and `shift`, then BigInt shift/mask:

```text
Number((directions[index] >> BigInt(shift)) & 7n)
```

### `byte`

Java `byte` is signed 8-bit. Jackal writes group IDs into `byte[][] groupsMap`.

Observed current map group counts:

| File | Group count |
|---|---:|
| `maps/map-0.dat` | 2 |
| `maps/map-1.dat` | 71 |
| `maps/map-2.dat` | 91 |
| `maps/map-3.dat` | 0 |
| `maps/map-4.dat` | 26 |
| `maps/map-5.dat` | 87 |

These do not exceed 127, so signedness should not change current behavior. Still, use `Int8Array` or `toByte(...)` where Java byte storage is being mirrored so future data changes do not silently diverge.

### `short`

Java `DataInputStream.readShort()` is big-endian signed 16-bit.

TS policy:

- DAT readers should default to signed big-endian `readShort()`.
- Use `readUnsignedShort()` only when Java explicitly does unsigned handling.
- Add fixture tests for the DAT files before converting `Main.loadExtraLargeImage`, `Main.loadMaps`, `Main.loadTypes`, `Main.loadStages`, and `Main.loadDirections`.

### `float`

Java `float` is 32-bit IEEE 754. TS `number` is 64-bit double.

TS policy:

- Store Java `float` fields as `number`.
- Apply `toFloat(...)` or `Math.fround(...)` at assignment/update boundaries where drift can affect branches, animation frame selection, collision, or camera movement.
- Prioritize movement, velocity, angle, alpha, camera, acceleration, and timer fields.

Do not blindly fround every arithmetic subexpression unless that is how Java would round it. Java float expressions round when values are stored to `float` fields/locals or when operands are float in a way that forces float operations. For this game, a practical rule is to fround field/local assignments declared as Java `float`, especially in update loops.

### Casts

Java `(int)` truncates toward zero and has defined behavior for NaN/infinities. TS `Math.trunc` handles the common finite case but not every Java edge exactly. Use `castDoubleToInt(...)` from `JavaNumbers` where the value may be non-finite or where strict parity matters.

Examples:

- `((int)x) >> 7`
- `(int)(cameraX / 32)`
- `(int)Math.round(...)`
- `drawString(int value, ...)`

### Division And Modulo

Java `int / int` truncates toward zero. TS `/` never does integer division.

TS policy:

- Use `intDiv(a, b)` whenever both Java operands are `int` and the Java result is used as `int`.
- JS `%` matches Java signed remainder for normal number operands, but still narrow the result when Java stores it to `int`.
- Do not use `Math.floor(a / b)` for Java integer division. It is wrong for negative values.

### Shifts And Bitfields

Java int shifts mask the shift count and operate on signed 32-bit values. Java long shifts operate on 64-bit values.

TS policy:

- Use JS `<<`, `>>`, and `>>>` for Java `int` shifts after operands are narrowed to int.
- Use BigInt shifts for Java `long` data.
- `GameMode.suggestDirection` must not use JS number bitwise operations on direction longs because the data is wider than 32 bits.

### Boolean `|` And `&`

Java permits eager boolean `|` and `&`. TS `|` and `&` are numeric bitwise operators, not boolean operators.

TS policy:

- Convert Java boolean `|` or `&` by evaluating both sides explicitly and then applying `||` or `&&` to the booleans.
- Only use plain `||` or `&&` directly when short-circuiting cannot change side effects.

This matters in input code because `isKeyPressed(...)` consumes pressed records. It is easy to change behavior by accidentally short-circuiting a Java eager expression.

### `Math.round`

Java has `Math.round(float)` and `Math.round(double)`. JS `Math.round` differs for some negative half cases and does not distinguish float/double overloads.

TS policy:

- Use `roundFloat(...)` for Java float expressions.
- Use `roundDouble(...)` for Java double expressions.
- Tank, jeep, helicopter, soldier, and boss movement classes use rounded movement/angle logic and should be audited during conversion.

### `Random`

Java `Random` uses a 48-bit linear congruential generator. Jackal creates `new Random()` in `Main`.

TS policy:

- Use `JavaRandom` from `slick2d-ts`.
- Provide a deterministic seed mode for parity tests.
- Runtime unseeded behavior does not need to match a historical Java run exactly, but the algorithm and distribution should match Java.

## Numeric Hotspot Inventory

This mechanical scan counts Java numeric-risk tokens. The score is not a bug count; it is a conversion priority signal.

| File | Score | Main concerns |
|---|---:|---|
| `Main.java` | 738 | Binary loading, image slicing, draw helpers, fixed tick timing, audio timestamps, integer string formatting, resource sequence. |
| `GameMode.java` | 503 | Map indexing, trigger rows, camera math, direction bitfields, layers, render order, collisions. |
| `BossHelicopter.java` | 206 | Float movement, casts, random choices, angle/position behavior. |
| `BossBlueTank.java` | 176 | Float movement, int counters, shifts, modulo, animation/collision. |
| `GrayTank.java` | 175 | Float movement, route choice, int counters, shifts, modulo. |
| `BrownTank.java` | 161 | Float movement, route choice, int counters, shifts, modulo. |
| `FireTank.java` | 155 | Float movement, route choice, int counters, shifts, modulo. |
| `GrayJeep.java` | 149 | Float movement, route choice, int counters, shifts, modulo. |
| `FriendlyHelicopter.java` | 148 | Float movement, casts, pickup/drop timing. |
| `BossSuperTank.java` | 136 | Float movement, int counters, shifts, modulo, boss state. |
| `EnemySoldier.java` | 135 | Float movement, random, collision, animation, branches. |
| `Player.java` | 116 | Movement, collisions, static sensor geometry, weapons, timers. |
| `FriendlySoldier.java` | 113 | Movement, random, rescue logic, animation, branch-sensitive floats. |
| `EnemyHelicopter.java` | 103 | Float movement, casts, random, pathing. |
| `CannonTruck.java` | 103 | Float movement, casts, angle/fire behavior. |
| `ElephantGun.java` | 97 | Float movement/aiming, int counters, shifts. |
| `SunsetMode.java` | 88 | Cutscene math, camera/alpha/timing. |
| `BossShipGun.java` | 85 | Float aiming/movement, casts. |
| `RotatingGun.java` | 82 | Angles, casts, sprite choice, modulo. |
| `SuperFire.java` | 81 | Float movement, casts, shifts, modulo. |
| `HardEndingMode.java` | 81 | Bit shifts, counters, end-scene positioning. |
| `BossSuperTankGun.java` | 77 | Float aiming/movement, casts. |
| `FloorGun.java` | 76 | Float aiming/movement, casts. |
| `Chinook.java` | 75 | Float movement, casts, cutscene timing. |
| `Column.java` | 74 | Float positions, casts, shifts, collisions. |
| `HitElement.java` | 68 | Trail ring buffer, int casts, bit masks, collision history. |
| `BossHeadquarters.java` | 62 | Int counters, shifts, boss state. |
| `BossShipManager.java` | 61 | Heavy bit-shift/counter manager logic. |
| `Triggers.java` | 61 | Constant ID table used by map spawning. |
| `BossStatue.java` | 58 | Int counters, float state, shifts. |
| `IntroMode.java` | 58 | Timers, title/menu state, shifted animation choices. |
| `Bomb.java` | 57 | Float movement, blast behavior, animation. |
| `CliffGun.java` | 57 | Float aiming/movement, casts, math. |
| `StatueSeekerMissile.java` | 54 | Float steering, casts, math. |
| `LandingPort.java` | 54 | Int/float positioning, shifts. |
| `Rock.java` | 54 | Float movement/collision, casts. |
| `SwampMissile.java` | 50 | Float movement/steering, casts. |
| `GrayBoat.java` | 49 | Float movement, casts. |
| `ElephantMissile.java` | 49 | Float movement, casts, shifts. |
| `BossGarage.java` | 47 | Int state, float/cast positioning, shifts. |
| `Statue.java` | 45 | Int state, float positioning, shifts. |
| `Submarine.java` | 45 | Float movement, casts. |

Files below that threshold still need normal line-by-line conversion. Most are simpler projectiles, modes, constants, interfaces, or wrappers, but any file containing casts, division, shifts, random, binary reads, or boolean eager operators must still follow the numeric policy.

## Critical Java Semantics To Preserve

### Static Initialization Order

`Main.loadClasses()` explicitly triggers static initialization for classes such as:

```text
RotatingGun
FriendlySoldier
FriendlyHelicopter
GrayJeep
BossHelicopter
CliffGun
Flame
SuperFire
BossSuperTankGun
SunsetMode
HardEndingMode
```

TS modules evaluate once at import time, but circular imports and static field initialization can differ from Java if the order is careless.

Pre-conversion task:

- Identify every static field with object/array initialization.
- Preserve Java order with explicit module imports or `initializeStatics()` calls where necessary.
- Add tests for static tables that feed movement, sprites, or cutscenes.

### Constructor Side Effects

`GameElement` constructor calls `init()` and then adds the object to `gameMode`.

That means many Java constructors have side effects before their own constructor body completes. The TS conversion must preserve this ordering. Do not move `gameMode.add(this)` into factories unless the Java behavior is documented and reproduced exactly.

### Java Collections

Jackal uses `ArrayList`, `HashMap`, and synchronized map wrappers.

TS policy:

- Prefer a small Java-like `ArrayList<T>` wrapper for parity-sensitive lists so `add`, `get`, `size`, `remove(index)`, and `remove(object)` cannot be confused.
- If raw arrays are used, every removal call must be checked because Java overloads removal by index and object.
- Browser runtime is single-threaded for this game, so `Collections.synchronizedMap(...)` can map to `Map`, but preserve key identity and value semantics.

### Update And Render Order

`GameMode.update` iterates layers 7 down to 0 and iterates each list from end to start. `drawSprites` draws layers 0 through 3, then player, then layers 4 through 7, with reverse list order inside layers.

This is not an optimization detail. It affects collisions, removals, enemy behavior, and visual stacking.

Pre-conversion task:

- Add comments or tests around the converted loops.
- Do not replace reverse loops with `forEach`.
- Do not use unordered collections.

### Binary Resource Reads

Jackal DAT loading is Java `DataInputStream` style: big-endian signed primitives unless otherwise stated.

Pre-conversion fixtures:

- Validate `images/title.dat`, `images/sunset.dat`, `images/map.dat`, `images/soldier-*.dat`, `images/jeep-*.dat` dimensions and cell counts.
- Validate `maps/map-*.dat` and `maps/types-*.dat` dimensions and group records.
- Validate `maps/dirs-*.dat` long counts and direction dimensions.
- Validate `maps/enemies*.dat` trigger counts and min/max Y range.

These fixtures should exist before `Main.loadNext` is ported so loader bugs are caught immediately.

### String Formatting

Jackal uses small Java `String.format` patterns such as zero-padded score/life/count strings.

TS policy:

- Do not add a large general printf dependency unless already present.
- Implement or use a small Java-format helper for the patterns actually used.
- Verify score, stage, lives, and menu strings pixel positions after conversion.

## Asset And Loading Contract

The Java code expects resources to be synchronously available. Browser fetch is asynchronous. The port must not convert every Java resource call into ad hoc `await` calls inside game classes.

Recommended loading model:

1. Copy all 126 source assets byte-for-byte into public web resources.
2. Generate a resource manifest using original Java paths as logical keys.
3. Before creating `Main`, preload every image, XML, DAT, OGG, and icon resource.
4. Configure `ResourceLoader` with a base URL and cache-bust query parameter.
5. Register loaded bytes under original keys.
6. Let Java-parity game code call `ResourceLoader.getResourceAsStream(...)` and construct Slick images/audio normally.
7. If any preload fails after retries, show a visible error and do not enter the game.

This keeps browser async I/O in the PWA shell and preserves synchronous Java-style game code.

## PWA Shell Contract

The game should target modern evergreen desktop browsers. Required browser features:

- ES modules
- Canvas/WebGL rendering path used by `slick2d-ts`
- Web Audio API
- BigInt
- Service workers and Cache API for PWA behavior

Startup flow:

1. `index.html` shows a splash screen immediately, with animated dots.
2. App JS initializes.
3. A PWA menu is shown before the game starts.
4. The menu includes a Start button and an audio volume slider.
5. The Start click resumes/unlocks Web Audio and applies volume.
6. The loader fetches resources with retries and cache-bust query params.
7. On success, create the Slick container and `Main`.
8. Let Jackal's original `LoadingMode` and `Main.loadNext` sequence run.
9. On failure, show a user-visible error with enough detail to debug missing assets.

Hamburger flow:

1. A browser overlay hamburger appears in the upper-left while the game is running.
2. Clicking it stops or pauses game audio.
3. It stops/destroys the active game container or returns it to a safe inactive state.
4. It shows the PWA menu again.
5. It preserves the selected volume.
6. It does not replace Jackal's original in-game menus.

`pitfall-js` is the right local reference for Start/menu/volume/audio-unlock behavior. `worst-mario-game-ever` is the right local reference for splash dots, version metadata, build stamp injection, failure UI, and service-worker versioning.

## Version And Cache Busting

Add a version file before conversion:

```json
{
    "version": "0.1.0",
    "buildStamp": "20260803T000000Z"
}
```

Use the semantic version for release identity and the build stamp for cache busting.

Every generated app-shell URL and every resource URL should include an adjustable query parameter:

```text
?v=<buildStamp>
```

Service worker rules:

- Register the service worker with a versioned URL.
- Include version/build stamp in cache names.
- Delete old caches on activation.
- Cache the app shell and resources intentionally.
- On resource fetch failure, retry before reporting failure.

## Verification Gates Before And During Conversion

Before converting gameplay classes:

- Create the source mapping ledger.
- Create the asset manifest.
- Create binary DAT fixture tests.
- Create Java numeric helper tests inside the Jackal port or rely on `slick2d-ts` tests and add Jackal-specific fixtures.
- Decide the local Slick container exception policy.
- Decide the float fround policy.

During conversion:

- Convert in dependency order, not random file order.
- After each class group, update the ledger.
- Keep TS method names aligned with Java.
- Use 4-space indent and semicolons.
- Keep browser-only code out of `src/jackal`.

After initial conversion:

- Run TypeScript build.
- Run unit tests for numeric helpers, JavaRandom, BinaryReader, asset manifests, and static tables.
- Run browser smoke tests for splash, menu, loading, intro, active gameplay, hamburger return, and audio volume.
- Add Playwright canvas nonblank checks.
- Compare Java and browser side by side using deterministic input recordings where possible.

Recommended state snapshots for parity comparison:

- Current mode
- Stage index
- Camera X/Y
- Player X/Y
- Player direction
- Lives
- Score
- Prisoner count
- Current song
- Active element counts by layer
- Enemy/solid/mine list sizes
- Trigger row/index
- Random seed/state in deterministic test mode

## Discussion Points To Settle Now

1. Should the two bundled local Slick container Java files be ledger exceptions, or should we create TS adapter files at matching paths that document/delegate to browser container behavior?
2. Should all Java `float` assignments be frounded, or only movement/camera/collision/timer fields?
3. Should the port include a deterministic seed/debug mode from the start?
4. Should the resource layout be `public/resources/<original path>` or directly `public/<original path>`? Either works if logical Java keys are preserved.
5. Should we create the mapping ledger as Markdown only, or Markdown plus machine-readable JSON so future audits can be generated?

My recommendation:

- Treat local Slick desktop container files as explicit browser exceptions with adapter notes.
- Use `public/resources/<original path>` plus a loader base path.
- Add deterministic seed mode for tests but keep normal runtime unseeded.
- Use Markdown plus JSON for the mapping ledger.
- Fround Java `float` field/local assignments in update-sensitive code, then add targeted tests rather than frounding blindly inside every expression.

## Slick2D-TS Status

Checked relevant `slick2d-ts` support areas:

- Java numeric helpers exist.
- JavaRandom exists.
- BinaryReader exists and returns `bigint` for Java long reads.
- ResourceLoader supports cache busting, retries, preloading, failure tracking, and clearing failures.
- App container reinit was previously repaired and is documented in `SLICK2D_TS_JACKAL_REAUDIT_2026-08-03_PASS6.md`.

No new Jackal-relevant Slick2D-TS bug was discovered in this pass.

One non-blocking improvement: add dedicated Jackal DAT fixture tests that exercise `BinaryReader` against actual SlickJackal DAT files. That can live in the Jackal port test suite. It does not require a Slick2D-TS repair handoff unless a fixture proves a mismatch.

## References

- MDN Autoplay guide for media and Web Audio APIs: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN Web Audio API best practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- MDN Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN PWA caching guide: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
