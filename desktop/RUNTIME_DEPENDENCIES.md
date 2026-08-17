# Runtime Dependencies

The desktop Java archive vendors the runtime files that shipped with the original SlickJackal release:

- `lib/slick.jar`
- `lib/lwjgl.jar`
- `lib/lwjgl_util.jar`
- `lib/jinput.jar`
- `lib/jorbis.jar`

These jars are placed on the desktop application runtime classpath.

Native libraries are unpacked from the original native jars into:

- `natives/windows`
- `natives/linux`
- `natives/macosx`
- `natives/solaris`

The Windows folder contains both 32-bit and 64-bit natives. The launch scripts intentionally point Java at the folder and let LWJGL/JInput load the matching native library for the active JVM architecture. For modern Windows 11 use, run with a 64-bit JVM.

The original `jorbis.jar` contains both `com.jcraft.jorbis` and `com.jcraft.jogg`, so this project does not split it into separate JOrbis/Jogg dependency jars.
