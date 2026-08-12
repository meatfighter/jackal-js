$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$jar = Join-Path $scriptDir "target\jackal-desktop.jar"
if (-not (Test-Path $jar)) {
    $jar = Join-Path $scriptDir "jackal-desktop.jar"
}
if (-not (Test-Path $jar)) {
    throw "Desktop jar is missing. Run npm run build:desktop first."
}

$natives = Join-Path $scriptDir "target\natives\windows"
if (-not (Test-Path $natives)) {
    $natives = Join-Path $scriptDir "natives\windows"
}

$modernFlags = @()
& java "--enable-native-access=ALL-UNNAMED" "--sun-misc-unsafe-memory-access=allow" "-version" *> $null
if ($LASTEXITCODE -eq 0) {
    $modernFlags = @("--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow")
} else {
    & java "--enable-native-access=ALL-UNNAMED" "-version" *> $null
    if ($LASTEXITCODE -eq 0) {
        $modernFlags = @("--enable-native-access=ALL-UNNAMED")
    }
}

& java @modernFlags `
    "-Dorg.lwjgl.librarypath=$natives" `
    "-Dnet.java.games.input.librarypath=$natives" `
    "-Djava.library.path=$natives" `
    "-Djinput.useDefaultPlugin=false" `
    "-Dnet.java.games.input.plugins=net.java.games.input.DirectAndRawInputEnvironmentPlugin" `
    "-jar" $jar
exit $LASTEXITCODE
