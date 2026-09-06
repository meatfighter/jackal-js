@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "JAR=%SCRIPT_DIR%target\jackal-desktop.jar"
set "NATIVES=%SCRIPT_DIR%target\natives\windows"

if not exist "%JAR%" set "JAR=%SCRIPT_DIR%jackal-desktop.jar"
if not exist "%NATIVES%" set "NATIVES=%SCRIPT_DIR%natives\windows"

if not exist "%JAR%" goto missing_jar
if not exist "%NATIVES%" goto missing_natives
goto launch

:missing_jar
echo Desktop jar is missing. Run npm.cmd run build:desktop first.
exit /b 1

:missing_natives
echo Missing Windows native library directory: "%NATIVES%"
exit /b 1

:launch
set "JINPUT_PLUGIN=net.java.games.input.DirectAndRawInputEnvironmentPlugin"
set "MODERN_FLAGS="
java --enable-native-access=ALL-UNNAMED -version >nul 2>nul
if not errorlevel 1 set "MODERN_FLAGS=%MODERN_FLAGS% --enable-native-access=ALL-UNNAMED"
java --sun-misc-unsafe-memory-access=allow -version >nul 2>nul
if not errorlevel 1 set "MODERN_FLAGS=%MODERN_FLAGS% --sun-misc-unsafe-memory-access=allow"

java %MODERN_FLAGS% -Dorg.lwjgl.librarypath="%NATIVES%" -Dnet.java.games.input.librarypath="%NATIVES%" -Djava.library.path="%NATIVES%" -Djinput.useDefaultPlugin=false -Dnet.java.games.input.plugins=%JINPUT_PLUGIN% -jar "%JAR%"
exit /b %ERRORLEVEL%
