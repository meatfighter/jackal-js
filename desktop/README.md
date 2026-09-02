# Jackal Java Reference Implementation

This directory contains the maintained Java/Slick2D reference implementation of Jackal. The Java gameplay code is the primary behavioral reference for the TypeScript browser port and is also built into the downloadable desktop distribution.

The source and resource layout under `desktop/src` intentionally stays close to the original game instead of being reorganized around a particular IDE or build system. Current builds use the JDK tools directly; no separate build-system or IDE-specific project metadata is required.

## Build

Use JDK 21 LTS for current development and release validation. The build requires `javac` and `jar` on `PATH` and emits Java 8-compatible bytecode for the legacy Slick2D/LWJGL runtime.

From the repository root:

```sh
npm run build:desktop
```

On Windows, `npm.cmd run build:desktop` is equivalent. The repository build script owns the compile classpath, resource copying, manifest generation, runtime/native packaging, license/source-material checks, and final ZIP construction. Do not maintain a separate Java build description alongside it.

Public desktop releases should be produced through the repository-level release tooling so the generated ZIP is verified together with the rest of the release.

## Run

From the repository root:

```sh
npm run run:desktop
```

Or run the platform launcher from the generated desktop distribution. The launch scripts set the LWJGL 2 and JInput native-library paths and probe optional Java flags used by current JDKs.

## Compatibility Notes

The Java code is compiled as Java 8-compatible bytecode while keeping the gameplay source structurally close to the implementation used for browser parity work. Java 21 LTS is the primary supported build and smoke-test JDK.

The current supported and tested desktop target is Windows x64 with Java 21. Linux x64 and macOS launchers remain in the distribution for compatibility testing, but they are not advertised as supported until the actual generated ZIP has been exercised on those combinations. See `RUNTIME_DEPENDENCIES.md` for the vendored runtime jars, natives, licenses, and corresponding-source material.
