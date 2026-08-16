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

The launch scripts set the LWJGL 2 and JInput native-library paths and probe optional Java flags used by modern JDKs. Windows 11 x64 is expected to use the vendored `lwjgl64.dll`, `OpenAL64.dll`, `jinput-dx8_64.dll`, and `jinput-raw_64.dll`.

## Compatibility Notes

The Java code is compiled as Java 8 bytecode for modern JDK compatibility while keeping the original Java source intact. The runtime still depends on legacy LWJGL 2.8.5-era native libraries, so a working 64-bit desktop JVM and compatible OS native-loader behavior are still required.
