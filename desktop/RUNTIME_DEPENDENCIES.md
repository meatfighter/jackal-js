# Runtime Dependencies

The desktop Java archive vendors the runtime files that shipped with the original SlickJackal release:

- `lib/slick.jar`
- `lib/lwjgl.jar`
- `lib/lwjgl_util.jar`
- `lib/jinput.jar`
- `lib/jorbis.jar`

These jars are placed on the desktop application runtime classpath.

The repository retains the historical native sets under `desktop/natives/` for reference. The generated public desktop ZIP deliberately packages only the 64-bit native files used by its current Windows, Linux, and macOS launchers:

- Windows x64: `lwjgl64.dll`, `OpenAL64.dll`, `jinput-dx8_64.dll`, `jinput-raw_64.dll`
- Linux x64: `liblwjgl64.so`, `libopenal64.so`, `libjinput-linux64.so`
- macOS: `liblwjgl.jnilib`, `openal.dylib`, `libjinput-osx.jnilib`

The current supported and tested desktop target is Windows x64 with Java 21. Linux x64 and macOS launchers are included for compatibility testing but are not advertised as supported until the generated ZIP has been tested on those platforms. Solaris and 32-bit native files retained in the repository are not copied into the public desktop ZIP.

The original `jorbis.jar` contains both `com.jcraft.jorbis` and `com.jcraft.jogg`, so this project does not split it into separate JOrbis/Jogg dependency jars.

The bundled `jinput.jar` embeds `net/java/games/util/plugins/Plugins.class`, so this runtime does not ship a separate `jutils.jar`. If `jinput.jar` is replaced with a build that does not embed that class, add `jutils.jar` to `desktop/lib` and to the desktop runtime classpath before releasing.

Third-party desktop license files are packaged under `licenses/` in the generated desktop ZIP:

- `licenses/SLICK2D.txt`
- `licenses/LWJGL-2.txt`
- `licenses/JINPUT.txt`
- `licenses/LGPL-2.0.txt`
- `licenses/JORBIS-NOTICE.txt`

The generated desktop ZIP also includes the corresponding JOrbis 0.0.17 source archive at `sources/jorbis-0.0.17-sources.jar`.
