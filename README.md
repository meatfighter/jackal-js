# Jackal

This repository contains the maintained **Jackal** project: the original Java/Slick2D recreation, the TypeScript Progressive Web App (PWA) port, the public project page, desktop packaging, and the tooling used to build and verify releases.

I originally recreated Konami's _Jackal_ in Java in 2013. In 2026 I translated the game to TypeScript and adapted it to modern browsers using [`slick2d-ts`](https://github.com/meatfighter/slick2d-ts). The Java source remains in the repository as the behavioral and structural reference for the browser port and as the source for downloadable desktop builds.

This project is a reimplementation, not an emulator, and does not contain or run the original NES ROM.

## Game

_Jackal_ is an overhead run-and-gun game in which the player drives a jeep through six hostile territories, destroys enemy forces, rescues prisoners of war, and fights a boss at the end of each stage. The jeep starts with a machine gun and grenades; rescued prisoners can upgrade the grenades into increasingly powerful missiles.

The recreation keeps the original game structure while adding enhanced graphics and animation, including smooth vehicle and turret rotation, transformed and semitransparent effects, animated cutscenes, smoother water and conveyor motion, helicopter shadows and rotor effects, and other details that take advantage of modern hardware.

A separate **Hard Mode** uses the same six maps with substantially more aggressive enemy pressure and an extended ending.

## Controls

Jackal supports keyboard and gamepad input. The default mappings are:

| Action            | Keyboard    | Gamepad     |
| ----------------- | ----------- | ----------- |
| Up                | Up Arrow    | D-pad Up    |
| Down              | Down Arrow  | D-pad Down  |
| Left              | Left Arrow  | D-pad Left  |
| Right             | Right Arrow | D-pad Right |
| Grenade / Missile | X           | A           |
| Gun               | Z           | X           |
| Start / Pause     | Enter       | Menu        |

Mappings can be changed from **Options → Input** in the game.

Two browser controls are reserved and cannot be remapped:

| Key   | Action            |
| ----- | ----------------- |
| Space | Toggle fullscreen |
| Esc   | Exit fullscreen   |

## Browser version

The PWA opens with a browser menu offering **New Game** and **Continue**. Save-ready state is stored in deployment-scoped browser storage so a game can be resumed after closing the tab or browser.

During windowed play, the hamburger button opens the browser menu as a live overlay when the current state can safely be suspended. The game also suspends when the page loses focus or becomes hidden.

The browser presentation supports:

- **Smooth** — linear filtering.
- **Crisp** — nearest-neighbor scaling.
- **Pixel Perfect** — integer nearest-neighbor scaling with letterboxing when necessary.

Rendering uses the native-resolution framebuffer support in `slick2d-ts`; gameplay continues to use Jackal's original logical coordinate system.

## Save-state compatibility

Browser saves use an explicit, versioned format with stable entity identifiers, exact runtime descriptors, reference validation, and conservative corruption bounds.

Save schema **11** is the first public game-state format. Earlier schemas were development-only and are intentionally discarded. If an older build encounters a future public format, it leaves that save untouched rather than silently rewriting or deleting it. Oversized unknown stored state is likewise preserved rather than parsed by an older build.

The input-mapping format is stored separately from game state and has its own compatibility version.

## Repository layout

| Path                        | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `pwa/`                      | TypeScript browser/PWA implementation and static resources                 |
| `pwa/src/jackal/`           | Java-shaped TypeScript gameplay port                                       |
| `pwa/src/jackal/persistence/` | Save-state schema, validation, serialization, and restoration            |
| `pwa/src/app/`              | Browser shell, preferences, lifecycle, storage, and viewport integration   |
| `desktop/`                  | Maintained Java/Slick2D reference implementation and desktop packaging     |
| `about/`                    | Source for the public project/about page                                   |
| `scripts/`                  | Build, verification, packaging, benchmarks, and release tooling            |
| `version.json`              | Application version/build-stamp source                                     |
| `THIRD_PARTY_NOTICES.md`    | Third-party notices and attribution                                        |

Generated output such as `node_modules/`, `dist/`, `.release-components/`, and desktop build output is not source and should not be edited manually.

## Requirements

Use a Node.js version accepted by `package.json`:

```text
^20.19.0 || ^22.13.0 || >=24
```

Install JavaScript dependencies from the lockfile:

```sh
npm ci
```

The maintained desktop build uses JDK 21.

## Development

Start the browser development server:

```sh
npm run dev
```

Run the primary source verification gate:

```sh
npm run verify
```

Run the production dependency audit separately:

```sh
npm run verify:dependencies
```

Run real-browser and offline-PWA verification:

```sh
npm run verify:browser
```

Build the complete release output:

```sh
npm run build
```

Useful focused checks are also exposed through the individual `test:*`, parity, formatting, linting, type-checking, and benchmark scripts in `package.json`.

## Java/TypeScript parity

The TypeScript gameplay source intentionally retains much of the organization and numeric behavior of the Java implementation. Java-shaped structure is therefore not automatically technical debt.

Dedicated tests cover structural parity, Java `float` behavior, fixed-step timing, player and mechanics differentials, save-state coverage, controller behavior, rendering/scaling integration, release integrity, and browser lifecycle behavior.

When changing gameplay code, compare the corresponding Java implementation before replacing Java-shaped logic with a more idiomatic TypeScript design. Browser-only concerns such as storage, responsive presentation, service workers, lifecycle handling, and save/continue should remain outside the gameplay port where practical.

## `slick2d-ts`

The browser project depends on an exact immutable HTTPS archive of a qualified `slick2d-ts` commit. `package.json` and `package-lock.json` must agree on that revision. Treat engine updates as behavioral changes and qualify them against Jackal rather than repinning casually.

## License and attribution

The project source is licensed under **GPL-3.0-or-later**. See `LICENSE`.

Third-party licenses, desktop runtime components, and attribution are documented in `THIRD_PARTY_NOTICES.md` and the desktop runtime documentation.

Jackal is an unofficial fan-made recreation and is not affiliated with, sponsored by, or endorsed by Konami or Nintendo. Original game graphics, music, sound effects, characters, and other copyrighted material remain the property of their respective rights holders.

The project is provided free of charge, contains no advertising, and generates no revenue.
