#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
JAR="$SCRIPT_DIR/target/jackal-desktop.jar"
if [ ! -f "$JAR" ]; then
    JAR="$SCRIPT_DIR/jackal-desktop.jar"
fi
if [ ! -f "$JAR" ]; then
    echo "Desktop jar is missing. Run npm run build:desktop first." >&2
    exit 1
fi

NATIVES="$SCRIPT_DIR/target/natives/linux"
if [ ! -d "$NATIVES" ]; then
    NATIVES="$SCRIPT_DIR/natives/linux"
fi

MODERN_FLAGS=""
if java --enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow -version >/dev/null 2>&1; then
    MODERN_FLAGS="--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow"
elif java --enable-native-access=ALL-UNNAMED -version >/dev/null 2>&1; then
    MODERN_FLAGS="--enable-native-access=ALL-UNNAMED"
fi

exec java $MODERN_FLAGS \
    "-Dorg.lwjgl.librarypath=$NATIVES" \
    "-Dnet.java.games.input.librarypath=$NATIVES" \
    "-Djava.library.path=$NATIVES" \
    "-Djinput.useDefaultPlugin=false" \
    "-Dnet.java.games.input.plugins=net.java.games.input.LinuxEnvironmentPlugin" \
    -jar "$JAR"
