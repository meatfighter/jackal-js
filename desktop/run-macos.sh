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

NATIVES="$SCRIPT_DIR/target/natives/macosx"
if [ ! -d "$NATIVES" ]; then
    NATIVES="$SCRIPT_DIR/natives/macosx"
fi

FIRST_THREAD_FLAG=""
if java -XstartOnFirstThread -version >/dev/null 2>&1; then
    FIRST_THREAD_FLAG="-XstartOnFirstThread"
fi

MODERN_FLAGS=""
add_java_flag_if_supported() {
    if java "$1" -version >/dev/null 2>&1; then
        MODERN_FLAGS="$MODERN_FLAGS $1"
    fi
}

add_java_flag_if_supported "--enable-native-access=ALL-UNNAMED"
add_java_flag_if_supported "--sun-misc-unsafe-memory-access=allow"

exec java $FIRST_THREAD_FLAG $MODERN_FLAGS \
    "-Dorg.lwjgl.librarypath=$NATIVES" \
    "-Dnet.java.games.input.librarypath=$NATIVES" \
    "-Djava.library.path=$NATIVES" \
    "-Djinput.useDefaultPlugin=false" \
    "-Dnet.java.games.input.plugins=net.java.games.input.OSXEnvironmentPlugin" \
    -jar "$JAR"
