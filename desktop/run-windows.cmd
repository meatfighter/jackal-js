@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "JAR=%SCRIPT_DIR%target\jackal-desktop.jar"
if not exist "%JAR%" set "JAR=%SCRIPT_DIR%jackal-desktop.jar"
if not exist "%JAR%" (
    echo Desktop jar is missing. Run npm run build:desktop first.
    exit /b 1
)

set "NATIVES=%SCRIPT_DIR%target\natives\windows"
if not exist "%NATIVES%" set "NATIVES=%SCRIPT_DIR%natives\windows"

set "JINPUT_PLUGIN=net.java.games.input.DirectAndRawInputEnvironmentPlugin"
java --enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow -version >nul 2>nul
if "%ERRORLEVEL%"=="0" (
    set "MODERN_FLAGS=--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow"
) else (
    java --enable-native-access=ALL-UNNAMED -version >nul 2>nul
    if "%ERRORLEVEL%"=="0" (
        set "MODERN_FLAGS=--enable-native-access=ALL-UNNAMED"
    ) else (
        set "MODERN_FLAGS="
    )
)

java %MODERN_FLAGS% -Dorg.lwjgl.librarypath="%NATIVES%" -Dnet.java.games.input.librarypath="%NATIVES%" -Djava.library.path="%NATIVES%" -Djinput.useDefaultPlugin=false -Dnet.java.games.input.plugins=%JINPUT_PLUGIN% -jar "%JAR%"
