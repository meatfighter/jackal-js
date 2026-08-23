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

The release verifier requires the 64-bit natives used by the packaged launchers:

- Windows: `lwjgl64.dll`, `OpenAL64.dll`, `jinput-dx8_64.dll`, `jinput-raw_64.dll`
- Linux: `liblwjgl64.so`, `libopenal64.so`, `libjinput-linux64.so`
- macOS: `liblwjgl.jnilib`, `openal.dylib`, `libjinput-osx.jnilib`

The Windows folder also contains 32-bit natives from the original runtime set, but the initial release target is 64-bit Java.

The original `jorbis.jar` contains both `com.jcraft.jorbis` and `com.jcraft.jogg`, so this project does not split it into separate JOrbis/Jogg dependency jars.

The bundled `jinput.jar` embeds `net/java/games/util/plugins/Plugins.class`, so this runtime does not ship a separate `jutils.jar`. If `jinput.jar` is replaced with a build that does not embed that class, add `jutils.jar` to `desktop/lib` and to the desktop runtime classpath before releasing.

Third-party desktop license files are packaged under `licenses/` in the generated desktop ZIP:

- `licenses/SLICK2D.txt`
- `licenses/LWJGL-2.txt`
- `licenses/JINPUT.txt`
- `licenses/JORBIS-LGPL.txt`
