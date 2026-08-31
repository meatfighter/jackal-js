# TypeScript Parity and Technical-Debt Cleanup

## Purpose

This revision removes translation scaffolding that made the browser version imitate Java compile-time language features at runtime. The Java desktop source remains the behavioral reference, while the TypeScript version now expresses overload selection, constructor intent, numeric conversions, and shared state directly.

The cleanup follows four priorities:

1. Preserve the Java game's observable behavior.
2. Preserve Java-sensitive float, integer, initialization, and collection semantics.
3. Keep Java-to-TypeScript correspondence explicit enough to audit mechanically.
4. Avoid runtime dispatch, temporary allocations, and abstraction layers in gameplay hot paths.

## Method overloads

The previous translation represented Java overload sets with optional TypeScript parameters, `arguments.length`, runtime `typeof`/`instanceof` tests, generated `__overloadN` methods, and impossible fallback errors.

That machinery has been removed. The 22 overloaded Java method groups, comprising 54 Java signatures, now map to fixed-arity TypeScript methods with descriptive names. Examples include:

```text
Main.draw(Image, float, float)                 -> Main.drawImage
Main.draw(Image, float, float, float)          -> Main.drawImageAlpha
GameMode.isDriveable(float, float)             -> GameMode.isDriveable
GameMode.isDriveable(float, float, float, float)
                                                -> GameMode.isDriveableBounds
Player.attack(float, float)                    -> Player.attackAt
Player.attack(float, float, float, float)      -> Player.attackBounds
```

Call sites were changed according to the overload selected by Java's compile-time argument types, not according to JavaScript runtime object types.

That distinction is important for `GameMode.add`. Java's `add(GameElement)` overload explicitly casts enemy elements before calling `add(Enemy)`. The TypeScript implementation now reproduces that control flow through `addGameElement` and `addEnemy`; it no longer relies on a runtime `instanceof` dispatcher.

The complete Java-signature-to-TypeScript mapping is recorded in:

```text
scripts/java-ts-signature-map.json
```

Mappings identify Java overloads by method name and the actual Java parameter-type vector, not by declaration order. Structural tests verify that every renamed Java overload is covered exactly once and that the mapped TypeScript method retains the Java parameter names and fixed arity. Reordering overload declarations in the Java source therefore cannot silently redirect a mapping.

Seventeen of the removed dispatchers also performed a Java `float` conversion before entering the overload implementation. The fixed-arity replacements preserve those conversions explicitly at method entry. A guardrail checks every affected parameter so a future cleanup cannot accidentally replace Java call-boundary float32 behavior with unrestricted JavaScript binary64 values.

## Constructors

### Classes with one Java constructor

Generated constructor dispatch was removed from 82 classes that had one translated constructor dispatcher and no genuine Java constructor overload set. These classes now use ordinary fixed-arity TypeScript constructors. The cleanup removed:

- optional constructor parameters used only for dispatch;
- `arguments.length` checks;
- generated `__construct_*` methods;
- runtime parameter-type checks;
- impossible "No Java constructor overload matched" errors;
- generated local aliases such as `xLocal` and `yLocal`.

Java float narrowing is still performed at the constructor boundary where the Java parameter or assignment requires it. This includes all three `float` parameters of `Parachute(float x, float y, float distance, ...)`; `distance` is narrowed before the integer delay calculation just as it is when Java receives the argument.

### Classes with overloaded Java constructors

Eleven classes genuinely have overloaded Java constructors. They now use a private canonical constructor and explicit static factories:

- `Airplane`
- `Bomb`
- `BrownTank`
- `EnemyBullet`
- `Explosion`
- `FloorGun`
- `FriendlySoldier`
- `Gate`
- `GrayTank`
- `RotatingGun`
- `Song`

The 36 Java constructor signatures are represented by 36 named factories. Factory chaining follows the same order as Java `this(...)` constructor chaining. An object is created only once, so base construction, Java-style field initialization, virtual `init()`, and `GameElement` registration occur once and in the original order.

Direct construction of these factory-backed classes is prohibited by a parity guardrail. Save-state restoration uses `Object.create` with the registered prototype, so private constructors do not interfere with persistence.

### Java varargs

`Menu` now uses a real TypeScript rest parameter for Java's `String... options`. This removes the artificial fixed option limit from the generated optional-parameter form. The existing `Main.loadExtraLargeImage` rest parameter remains because it also corresponds to Java varargs.

## Java collection overloads

Java's `ArrayList.remove(int)` and `ArrayList.remove(Object)` cannot be represented faithfully by choosing at runtime based on whether a JavaScript value is a number. The runtime helper now exposes two explicit operations:

```ts
removeAt(index);
removeValue(value);
```

Each call site was translated according to the Java overload selected from its static argument type. `removeAt` also preserves the range checks expected from Java list indexing.

## Font representation

Java stores fonts as `Image[4][256]` and indexes glyphs by character code. The previous TypeScript code typed the structure as `Image[][]` but attached arbitrary string-named properties to each array.

Font loading and drawing now use numeric `charCodeAt` indexes. This matches the Java representation, eliminates `Record<string, Image>` casts, and keeps access on the normal dense array-index path.

## Equality and JavaScript boundaries

Coercive JavaScript `==` and `!=` operators have been removed from the TypeScript source. Java numeric, boolean, enum, and reference comparisons now use `===` and `!==`.

Places where browser APIs differ from Java have explicit boundary handling. For example, JavaScript `Map.get()` can produce `undefined`, whereas Java `Map.get()` normally produces `null`; those cases are tested deliberately rather than relying on loose null equality.

A source-level guardrail rejects future use of coercive equality in `pwa/src`.

## Shared state and constants

`MainRuntimeState` is now the sole storage location for the current `Main` and `GameMode` instances. The Java-shaped `Main.mainInstance` and `Main.gameMode` members proxy that storage through accessors, eliminating two independently mutable copies without reintroducing ES-module cycles.

`MainConstants` is the source of truth for constants needed by cycle-safe modules. `Main` exposes aliases where Java structural correspondence is useful. Float constants remain explicitly narrowed with `javaFloat` where Java stores or computes them as `float`.

## Shared Java-compatible rotation math

The duplicated point-rotation implementations have been replaced with `rotatePointLikeJava` in:

```text
pwa/src/jackal/JackalMath.ts
```

Both `Main` and `Player` use this helper. It preserves the Java float32 rounding boundaries rather than replacing the computation with unrestricted JavaScript double arithmetic.

## Float and integer parity

The cleanup intentionally retains Java numeric helpers where the Java source depends on them, including:

- `javaFloat` float32 narrowing;
- Java integer conversion and division helpers;
- Java remainder/rounding behavior where applicable;
- Java-compatible random-number generation;
- explicit intermediate float boundaries in translated expressions.

The float metadata generator and static storage/operation audits were updated to understand the renamed methods and constructor factories. Three intermediate arithmetic boundaries discovered during the audit were made explicit, including the angle and velocity calculations in `SubmarineMissile`.

## Persistence

The game-element registry now describes constructible prototypes rather than requiring a publicly callable TypeScript constructor. This supports private factory-backed constructors while retaining stable save-state entity IDs.

Restoration continues to allocate objects without running gameplay constructors and then applies the serialized state, matching the existing persistence design. The set of persisted entity types and float-normalized state fields is unchanged by the refactor.

## Performance considerations

The cleanup removes runtime overload selection from drawing, collision, update, sound, and object-creation paths. Fixed-arity methods and explicit factories avoid repeated checks of `arguments.length`, `typeof`, and `instanceof`.

The project deliberately keeps explicit loops and reused collections in gameplay code. It does not replace them with allocation-heavy `.map`, `.filter`, spread, tuple-dispatch, or options-object patterns. The predecoded direction cache remains allocation-free in its hot path.

## Intentionally retained Java-shaped behavior

Some Java-shaped code is purposeful and remains in place:

- construction ordering and the virtual `init()` mechanism;
- `declare` fields used to avoid TypeScript-generated initialization at the wrong point;
- Java float and integer semantic helpers;
- Java random-number behavior;
- collection helpers where gameplay depends on Java semantics;
- field/method collision adaptations required by Java-to-TypeScript naming rules;
- straightforward duplication that keeps Java and TypeScript gameplay logic easy to compare.

The goal is not to make the source maximally idiomatic TypeScript at the expense of parity. It is to remove translation machinery that adds runtime ambiguity without representing meaningful Java behavior.

## Guardrails and validation

The updated tests enforce:

- one-to-one Java/TypeScript gameplay-file coverage, apart from documented platform boundaries;
- complete Java-signature mappings for renamed overloads and constructor factories, selected by Java parameter types rather than overload ordinals;
- mapped TypeScript parameter-name and fixed-arity correspondence;
- preservation of the 17 removed-dispatcher float argument conversions and the `Parachute.distance` constructor boundary;
- absence of generated overload/constructor dispatch patterns;
- absence of direct construction for factory-backed classes;
- absence of coercive equality;
- numeric font indexing;
- one runtime-state store and one shared constant source;
- one Java-compatible rotation implementation;
- preservation of Java construction ordering and hidden-field behavior;
- preservation of direction-cache output and allocation behavior;
- Java/TypeScript float-sensitive mechanics parity;
- freshness of generated float metadata and explicit float boundaries.

Run `npm run verify` to execute the current repository validation suite.
