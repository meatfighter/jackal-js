# Slick2D TS JavaRandom Performance Issue For Jackal

Date: 2026-08-04

## Context

`C:\js-projects\jackal-js` depends on `C:\js-projects\slick2d-ts`.

The Jackal port uses `java.util.Random` parity through:

- `src/java/JavaRuntime.ts`: `export class Random extends JavaRandom`
- `src/jackal/Main.ts`: `public random: any = new Random();`

The game calls `main.random.nextInt(...)`, `main.random.nextFloat()`, and `main.random.nextBoolean()` heavily during active gameplay: enemy decisions, tanks, helicopters, explosions, debris, soldiers, help markers, boss behavior, and cutscene selection.

## Current Slick2D TS Implementation

File:

- `C:\js-projects\slick2d-ts\src\slick\support\JavaRandom.ts`

Current hot-path BigInt usage:

- `JavaRandom.ts:1-3`: multiplier, addend, and mask are BigInt constants.
- `JavaRandom.ts:11`: seed is stored as BigInt.
- `JavaRandom.ts:21-22`: `setSeed(...)` converts seed with `BigInt(seed)`.
- `JavaRandom.ts:36`: power-of-two `nextInt(bound)` uses `BigInt(bound) * BigInt(this.next(31))`.
- `JavaRandom.ts:57-60`: every `next(bits)` updates the 48-bit LCG with BigInt and calls `BigInt(bits)`.
- `JavaRandom.ts:62-65`: default seed uses BigInt. This part is not hot.

This is behaviorally correct for Java's 48-bit LCG, but it creates BigInt arithmetic and conversion work in a gameplay hot path.

## Required Repair

Create a lower-allocation JavaRandom implementation that preserves exact `java.util.Random` behavior.

Requirements:

- Do not replace this with `Math.random()`.
- Preserve the public API and overload behavior:
  - `constructor()`
  - `constructor(seed: number | bigint)`
  - `setSeed(seed: number | bigint)`
  - `nextInt()`
  - `nextInt(bound: number)`
  - `nextFloat()`
  - `nextBoolean()`
- Preserve Java's 48-bit linear congruential generator:
  - multiplier: `0x5DEECE66D`
  - addend: `0xB`
  - mask: `(1 << 48) - 1`
  - internal seeded value: `(seed ^ multiplier) & mask`
- Preserve Java's bounded `nextInt(int bound)` algorithm, including:
  - `bound <= 0` throws.
  - power-of-two fast path.
  - non-power-of-two rejection loop.
  - signed 32-bit overflow behavior in the rejection condition.
- Avoid BigInt arithmetic in `next(bits)`, `nextInt(bound)`, `nextFloat()`, and `nextBoolean()` when possible.
- Avoid temporary objects in those hot methods.

Suggested implementation shape:

- Store the 48-bit seed as numeric limbs rather than one BigInt.
- A 16-bit limb design is straightforward:
  - `seed0`: low 16 bits
  - `seed1`: middle 16 bits
  - `seed2`: high 16 bits
- Update the 48-bit LCG using integer multiplication/carry across limbs.
- Return the top `bits` bits without constructing arrays or BigInts.
- Keep BigInt only at API boundaries where needed for `setSeed(bigint)` or for non-hot default seed creation.

This should be implemented and tested inside `slick2d-ts`, not as a Jackal gameplay workaround.

## Test Vectors

Add deterministic tests that compare the optimized implementation against Java. These vectors were generated from the current BigInt implementation, which matches Java's algorithm.

### Unbounded `nextInt()`

| Seed | First five `nextInt()` values |
| ---: | --- |
| `0` | `-1155484576, -723955400, 1033096058, -1690734402, -1557280266` |
| `1` | `-1155869325, 431529176, 1761283695, 1749940626, 892128508` |
| `123456789` | `-1442945365, -1016548095, 1962592967, 1094656688, 1677212580` |
| `-1` | `1155099827, 1887904451, 52699159, -1941176418, -1451336087` |
| `25214903917` | `0, 4232237, 178803790, 758674372, 1565954732` |

### Bounded `nextInt(bound)`

Bounds used in order:

`1, 2, 3, 5, 7, 16, 31, 32, 1000, 2147483647`

| Seed | Values |
| ---: | --- |
| `0` | `0, 1, 1, 2, 4, 4, 1, 3, 719, 1678332854` |
| `1` | `0, 0, 1, 3, 6, 0, 4, 21, 978, 1526301748` |
| `123456789` | `0, 1, 2, 4, 4, 3, 6, 13, 297, 925572887` |
| `-1` | `0, 0, 0, 4, 6, 9, 29, 12, 765, 121412731` |
| `25214903917` | `0, 0, 2, 1, 3, 1, 13, 15, 612, 975888346` |

### Rejection-Loop Stress Bound

Bound used: `1073741825`

| Seed | First eight values |
| ---: | --- |
| `0` | `516548029, 663681053, 251269761, 715581077, 542832677, 827187473, 49567875, 377907320` |
| `1` | `215764588, 880641847, 874970313, 446064254, 77814904, 714504434, 13136569, 327998473` |
| `123456789` | `981296483, 547328344, 838606290, 465137554, 913732807, 925572887, 771983441, 1052992961` |
| `987654321` | `657000536, 422320121, 98087148, 359444801, 554741714, 20859218, 775302182, 299652577` |

### `nextFloat()`

First three values rounded here for readability. Tests should compare exactly as JS numbers produced by `next(24) / (1 << 24)`.

| Seed | Values |
| ---: | --- |
| `0` | `0.7309677601, 0.8314409852, 0.2405363917` |
| `1` | `0.7308781743, 0.1004731655, 0.4100807905` |
| `123456789` | `0.6640380621, 0.7633164525, 0.4569517374` |
| `-1` | `0.2689425945, 0.4395619631, 0.0122699738` |
| `25214903917` | `0, 0.000985384, 0.0416309834` |

### `nextBoolean()`

| Seed | First six values |
| ---: | --- |
| `0` | `true, true, false, true, true, false` |
| `1` | `true, false, false, false, false, false` |
| `123456789` | `true, true, false, false, false, false` |
| `-1` | `false, false, false, true, true, true` |
| `25214903917` | `false, false, false, false, false, false` |

## Non-Issue For This Handoff

Do not change `BinaryReader.readLong()` just to remove BigInt.

Jackal stage pathing data is stored as Java signed `long` values:

- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1801`: `stage.directions = new long[size];`
- `C:\NetBeansProjects\SlickJackal\src\jackal\Main.java:1803`: `stage.directions[i] = dis.readLong();`

The Jackal TS port intentionally stores those values as BigInt, then uses precomputed BigInt shift constants during direction extraction. That part is required for Java `long` bit-parity.

