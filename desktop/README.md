# Jackal Desktop

This directory contains the preserved, Maven-buildable Java desktop version of SlickJackal.

The source and resource tree under `desktop/src` intentionally preserves the Java desktop code layout. The Maven files and launch scripts are packaging support only; they are not part of the TypeScript web port and should not be used to infer new gameplay behavior.

## Build

From the repository root:

```sh
npm run build:desktop
```

Or from this directory with Maven installed:

```sh
mvn package
```

Direct `mvn package` is a developer build path. Public desktop releases should be produced through the repository-level npm release tooling, which verifies the expected runtime artifacts, dependency notices and source material, release metadata, launcher permissions, and final ZIP contents.

`npm run build:desktop` tries native Maven first, then WSL2 Maven on Windows, then a `javac`/`jar` fallback. The fallback is present because modern Windows machines often have a JDK but not Maven on `PATH`.

## Run

From the repository root:

```sh
npm run run:desktop
```

Or run the platform script in this directory:

```sh
run-windows.cmd
```

The launch scripts set the LWJGL 2 and JInput native-library paths and probe optional Java flags used by current JDKs. The packaged ZIP includes the 64-bit Windows, Linux, and macOS natives listed in `RUNTIME_DEPENDENCIES.md`.

## Compatibility Notes

The Java code is compiled as Java 8 bytecode while keeping the original Java source intact. Java 21 LTS is the primary supported runtime for release smoke tests.

Initial desktop support should be advertised only for OS/JVM combinations that have launched the generated ZIP successfully:

- Windows 11 x86-64, Java 21
- Linux x86-64, Java 21

The ZIP contains macOS x86-era LWJGL/JInput natives, but macOS should not be listed as supported until the packaged artifact is smoke-tested on the exact architecture and JVM combination being advertised.
