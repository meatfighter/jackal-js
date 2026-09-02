import { readFileSync, rmSync, writeFileSync } from "node:fs";

function read(path) {
    return readFileSync(path, "utf8");
}

function write(path, content) {
    writeFileSync(path, content, "utf8");
}

function replaceExact(path, oldText, newText, expected = 1) {
    const source = read(path);
    const count = source.split(oldText).length - 1;
    if (count !== expected) {
        throw new Error(`Expected ${expected} occurrence(s) in ${path}, found ${count}: ${oldText.slice(0, 120)}`);
    }
    write(path, source.replaceAll(oldText, newText));
}

function removeFunction(source, name) {
    const pattern = new RegExp(`\\nfunction ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n\\}\\n`, "m");
    const matches = source.match(pattern);
    if (matches === null) {
        throw new Error(`Unable to find function ${name}.`);
    }
    return source.replace(pattern, "\n");
}

for (const path of ["desktop/pom.xml", "desktop/assembly.xml"]) {
    rmSync(path, { force: false });
}

const buildPath = "scripts/build-desktop.mjs";
let build = read(buildPath);
build = build.replace('import { dirname, join, relative, resolve } from "node:path";', 'import { dirname, join, relative } from "node:path";');
for (const name of ["normalizeMavenOutputs", "quoteSh", "windowsPathToWslPath", "tryNativeMaven", "tryWslMaven"]) {
    build = removeFunction(build, name);
}
if (!build.includes("function buildWithJavacFallback()")) {
    throw new Error("Expected the existing direct-JDK fallback function.");
}
build = build.replace("function buildWithJavacFallback()", "function buildWithJdk()");
build = build.replace(
    'throw new Error("The desktop build requires Maven, WSL2 Maven, or javac on PATH.");',
    'throw new Error("The desktop build requires javac on PATH.");'
);
build = build.replace(
    'throw new Error("The desktop build requires Maven, WSL2 Maven, or jar on PATH.");',
    'throw new Error("The desktop build requires jar on PATH.");'
);
const oldDispatch = `    if (!tryNativeMaven() && !tryWslMaven()) {\n        buildWithJavacFallback();\n    }`;
if (!build.includes(oldDispatch)) {
    throw new Error("Expected Maven/direct-JDK desktop build dispatch.");
}
build = build.replace(oldDispatch, "    buildWithJdk();");
if (/Maven|mvn|WSL2|buildWithJavacFallback|tryNativeMaven|tryWslMaven|normalizeMavenOutputs/.test(build)) {
    throw new Error("Obsolete Maven/fallback build terminology remains in scripts/build-desktop.mjs.");
}
write(buildPath, build);

write(
    "desktop/README.md",
    `# Jackal Java Reference Implementation\n\nThis directory contains the maintained Java/Slick2D reference implementation of Jackal. The Java gameplay code is the primary behavioral reference for the TypeScript browser port and is also built into the downloadable desktop distribution.\n\nThe source and resource layout under \`desktop/src\` intentionally stays close to the original game instead of being reorganized around a particular IDE or build system. Current builds use the JDK tools directly; no separate build-system or IDE-specific project metadata is required.\n\n## Build\n\nUse JDK 21 LTS for current development and release validation. The build requires \`javac\` and \`jar\` on \`PATH\` and emits Java 8-compatible bytecode for the legacy Slick2D/LWJGL runtime.\n\nFrom the repository root:\n\n\`\`\`sh\nnpm run build:desktop\n\`\`\`\n\nOn Windows, \`npm.cmd run build:desktop\` is equivalent. The repository build script owns the compile classpath, resource copying, manifest generation, runtime/native packaging, license/source-material checks, and final ZIP construction. Do not maintain a separate Java build description alongside it.\n\nPublic desktop releases should be produced through the repository-level release tooling so the generated ZIP is verified together with the rest of the release.\n\n## Run\n\nFrom the repository root:\n\n\`\`\`sh\nnpm run run:desktop\n\`\`\`\n\nOr run the platform launcher from the generated desktop distribution. The launch scripts set the LWJGL 2 and JInput native-library paths and probe optional Java flags used by current JDKs.\n\n## Compatibility Notes\n\nThe Java code is compiled as Java 8-compatible bytecode while keeping the gameplay source structurally close to the implementation used for browser parity work. Java 21 LTS is the primary supported build and smoke-test JDK.\n\nOnly advertise an OS/JVM combination after launching the actual generated ZIP on that exact combination. See \`RUNTIME_DEPENDENCIES.md\` for the vendored runtime jars, natives, licenses, and corresponding-source material.\n`
);

const rootReadme = "README.md";
replaceExact(
    rootReadme,
    "2. **`desktop/` is the Java game.** It is buildable and is the primary behavioral reference when checking gameplay parity.",
    "2. **`desktop/` is the Java/Slick2D reference implementation.** It remains buildable and is the primary behavioral reference when checking gameplay parity."
);
replaceExact(rootReadme, "  desktop/      Java desktop game", "  desktop/      Java/Slick2D reference implementation");
replaceExact(
    rootReadme,
    `### Java\n\nUse Java 21 LTS for current desktop release builds and smoke tests.\n\nThe Java source is compiled as Java 8-compatible bytecode, but Java 21 LTS is the primary current validation runtime for generated desktop releases.\n\n### Maven\n\nMaven is optional.\n\n\`npm run build:desktop\` tries:\n\n1. Maven on the host;\n2. WSL2 Maven when running on Windows;\n3. a direct \`javac\`/\`jar\` fallback.\n\nThe fallback keeps the desktop build available to developers with a JDK but no Maven installation.\n`,
    `### Java desktop toolchain\n\nUse JDK 21 LTS for current desktop builds and smoke tests. The supported desktop build requires \`javac\` and \`jar\` on \`PATH\`; repository tooling invokes them directly against the vendored legacy runtime jars.\n\nThe Java source is compiled as Java 8-compatible bytecode while JDK 21 remains the primary current build and validation environment. Build the desktop component through \`npm run build:desktop\` rather than maintaining a separate Java build-system definition.\n`
);
replaceExact(
    rootReadme,
    "| `desktop/`                    | Java implementation plus desktop packaging/runtime material.                                                    |",
    "| `desktop/`                    | Maintained Java/Slick2D reference implementation plus desktop runtime/package material.                         |"
);
let readme = read(rootReadme);
const desktopSection = /### `desktop\/` — Java desktop version[\s\S]*?#### Desktop runtime contract/;
if (!desktopSection.test(readme)) {
    throw new Error("Unable to find the desktop README section.");
}
readme = readme.replace(
    desktopSection,
    `### \`desktop/\` — Java/Slick2D reference implementation\n\nThe desktop tree serves two purposes:\n\n1. maintain and build the Java/Slick2D implementation;\n2. provide the primary behavioral and structural reference for the TypeScript port.\n\nThe project intentionally keeps the Java source layout close to the game implementation rather than adapting it to a separate build-system or IDE convention. The repository's Node tooling invokes JDK 21 \`javac\` and \`jar\` directly and packages the exact vendored runtime files.\n\n\`\`\`text\ndesktop/\n├── src/\n│   ├── jackal/\n│   ├── maps/\n│   └── org/newdawn/slick/\n├── lib/\n├── natives/\n├── licenses/\n├── sources/\n├── run-windows.cmd\n├── run-windows.ps1\n├── run-linux.sh\n├── run-macos.sh\n├── README.md\n└── RUNTIME_DEPENDENCIES.md\n\`\`\`\n\n#### Desktop runtime contract`
);
if (/Maven|\bmvn\b|WSL2 Maven/.test(readme)) {
    throw new Error("Obsolete Maven build documentation remains in README.md.");
}
write(rootReadme, readme);

console.log("Jackal Java desktop build modernization applied.");
