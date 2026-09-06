import { runDesktopInputTests } from "./desktop-input-tests.mjs";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { assertLocalGeneratedOutputPath, assertRealDirectory, assertRealFile, assertRealFileOrDirectory, rootDir } from "./build-utils.mjs";
import { withReleaseOperationLock } from "./release-lock-utils.mjs";
import { listZipEntries, writeZipFromDirectory } from "./zip-utils.mjs";

const desktopDir = join(rootDir, "desktop");
const sourceDir = join(desktopDir, "src");
const libDir = join(desktopDir, "lib");
const nativeDir = join(desktopDir, "natives");
const licenseDir = join(desktopDir, "licenses");
const runtimeSourceDir = join(desktopDir, "sources");
const targetDir = join(desktopDir, "target");
const classesDir = join(targetDir, "classes");
const targetLibDir = join(targetDir, "lib");
const targetNativeDir = join(targetDir, "natives");
const distributionRoot = join(targetDir, "distribution");
const distributionName = "jackal-desktop";
const stableJarPath = join(targetDir, `${distributionName}.jar`);
const stableZipPath = join(targetDir, `${distributionName}.zip`);
const sourcesFile = join(targetDir, "sources.txt");
const manifestPath = join(targetDir, "MANIFEST.MF");
const runtimeJars = ["slick.jar", "lwjgl.jar", "lwjgl_util.jar", "jinput.jar", "jorbis.jar"];
const requiredNatives = {
    windows: ["lwjgl64.dll", "OpenAL64.dll", "jinput-dx8_64.dll", "jinput-raw_64.dll"],
    linux: ["liblwjgl64.so", "libopenal64.so", "libjinput-linux64.so"],
    macosx: ["liblwjgl.jnilib", "openal.dylib", "libjinput-osx.jnilib"]
};
const requiredLicenseFiles = ["SLICK2D.txt", "LWJGL-2.txt", "JINPUT.txt", "LGPL-2.0.txt", "JORBIS-NOTICE.txt"];
const requiredRuntimeSourceFiles = ["jorbis-0.0.17-sources.jar"];
const jinputUtilityPluginClass = "net/java/games/util/plugins/Plugins.class";
const executableDistributionEntries = [`${distributionName}/run-linux.sh`, `${distributionName}/run-macos.sh`];

function assertDesktopTargetPath(label, path) {
    return assertLocalGeneratedOutputPath(label, path, targetDir);
}

function assertDesktopTargetDirectory(path, label) {
    const resolvedPath = assertDesktopTargetPath(label, path);
    if (existsSync(resolvedPath)) {
        assertRealDirectory(resolvedPath, label);
    }
    return resolvedPath;
}

function ensureDesktopTargetDirectory(path, label) {
    const resolvedPath = assertDesktopTargetDirectory(path, label);
    mkdirSync(resolvedPath, { recursive: true });
    return resolvedPath;
}

function cleanDesktopTargetDirectory(path, label) {
    const resolvedPath = assertDesktopTargetPath(label, path);
    if (existsSync(resolvedPath)) {
        assertRealDirectory(resolvedPath, label);
    }
    rmSync(resolvedPath, { recursive: true, force: true });
    mkdirSync(resolvedPath, { recursive: true });
    return resolvedPath;
}

function removeDesktopTargetFile(path, label) {
    const resolvedPath = assertDesktopTargetPath(label, path);
    if (existsSync(resolvedPath)) {
        assertRealFile(resolvedPath, label);
        rmSync(resolvedPath, { force: true });
    }
}

function commandExists(command) {
    const finder = process.platform === "win32" ? "where.exe" : "which";
    const result = spawnSync(finder, [command], { stdio: "ignore" });
    return result.status === 0;
}

function run(command, args, cwd = rootDir) {
    const result = spawnSync(command, args, {
        cwd,
        stdio: "inherit"
    });
    if (result.status !== 0) {
        throw new Error(`Command failed with exit code ${result.status ?? "unknown"}: ${command} ${args.join(" ")}`);
    }
}

function runCapture(command, args, cwd = rootDir) {
    return spawnSync(command, args, {
        cwd,
        encoding: "utf8"
    });
}

function parseJavaFeatureVersion(output) {
    const match = output.match(/(?:javac|(?:openjdk|java) version)\s+"?(\d+)(?:\.(\d+))?/i);
    if (!match) {
        return null;
    }
    const major = Number(match[1]);
    if (major === 1 && match[2] !== undefined) {
        return Number(match[2]);
    }
    return major;
}

function getJavacFeatureVersion() {
    const result = runCapture("javac", ["-version"]);
    if (result.error || result.status !== 0) {
        return null;
    }
    return parseJavaFeatureVersion(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}

function collectJavaFiles(dir, files = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = assertRealFileOrDirectory(full, "desktop source entry");
        if (stat.isDirectory()) {
            collectJavaFiles(full, files);
        } else if (stat.isFile() && entry.endsWith(".java")) {
            files.push(full);
        }
    }
    return files;
}

function copyResources(source, target) {
    for (const entry of readdirSync(source)) {
        const sourcePath = join(source, entry);
        const targetPath = join(target, entry);
        const stat = assertRealFileOrDirectory(sourcePath, "desktop resource entry");
        if (stat.isDirectory()) {
            ensureDesktopTargetDirectory(targetPath, "desktop resource target directory");
            copyResources(sourcePath, targetPath);
        } else if (stat.isFile() && !entry.endsWith(".java")) {
            assertDesktopTargetPath("desktop resource target file", targetPath);
            ensureDesktopTargetDirectory(dirname(targetPath), "desktop resource target parent");
            copyFileSync(sourcePath, targetPath);
        }
    }
}

function copyDirectoryContents(source, target) {
    assertRealDirectory(source, "desktop copy source directory");
    cleanDesktopTargetDirectory(target, "desktop copy target directory");
    for (const entry of readdirSync(source)) {
        const sourcePath = join(source, entry);
        const targetPath = join(target, entry);
        const stat = assertRealFileOrDirectory(sourcePath, "desktop copy source entry");
        if (stat.isDirectory()) {
            copyDirectoryContents(sourcePath, targetPath);
        } else {
            assertDesktopTargetPath("desktop copy target file", targetPath);
            ensureDesktopTargetDirectory(dirname(targetPath), "desktop copy target parent");
            copyFileSync(sourcePath, targetPath);
        }
    }
}

function formatManifestAttribute(name, value) {
    const maxLineLength = 68;
    const parts = value.split(" ");
    let current = `${name}:`;
    let output = "";

    for (const part of parts) {
        const candidate = `${current} ${part}`;
        if (Buffer.byteLength(candidate, "utf8") > maxLineLength && current !== `${name}:`) {
            output += `${current} \n`;
            current = ` ${part}`;
        } else {
            current = candidate;
        }
    }

    return `${output}${current}\n`;
}

function writeManifest() {
    const classPath = runtimeJars.map((name) => `lib/${name}`).join(" ");
    const manifest = ["Manifest-Version: 1.0\n", "Main-Class: jackal.Main\n", formatManifestAttribute("Class-Path", classPath), "\n"].join("");
    assertDesktopTargetPath("desktop manifest", manifestPath);
    ensureDesktopTargetDirectory(dirname(manifestPath), "desktop manifest parent");
    writeFileSync(manifestPath, manifest);
}

function jarContainsEntry(jarPath, entryName) {
    return listZipEntries(jarPath).some((entry) => entry.name === entryName);
}

function verifyJInputUtilityDependency() {
    const jinputJar = join(libDir, "jinput.jar");
    const jutilsJar = join(libDir, "jutils.jar");
    assertRealFile(jinputJar, "desktop runtime jar jinput.jar");
    if (jarContainsEntry(jinputJar, jinputUtilityPluginClass) || (existsSync(jutilsJar) && runtimeJars.includes("jutils.jar"))) {
        return;
    }

    throw new Error(`desktop runtime jar jinput.jar must embed ${jinputUtilityPluginClass} or desktop/lib/jutils.jar must be added to runtimeJars`);
}

function verifyRuntimeDependencies() {
    for (const jar of runtimeJars) {
        assertRealFile(join(libDir, jar), `desktop runtime jar ${jar}`);
    }
    assertRealDirectory(nativeDir, "desktop native directory");

    for (const [platform, files] of Object.entries(requiredNatives)) {
        const platformDir = join(nativeDir, platform);
        assertRealDirectory(platformDir, `${platform} native directory`);
        for (const name of files) {
            assertRealFile(join(platformDir, name), `${platform} native library ${name}`);
        }
    }

    assertRealDirectory(licenseDir, "desktop third-party licenses directory");
    for (const licenseFile of requiredLicenseFiles) {
        assertRealFile(join(licenseDir, licenseFile), `desktop third-party license ${licenseFile}`);
    }
    assertRealDirectory(runtimeSourceDir, "desktop third-party sources directory");
    for (const sourceFile of requiredRuntimeSourceFiles) {
        assertRealFile(join(runtimeSourceDir, sourceFile), `desktop third-party source ${sourceFile}`);
    }
    verifyJInputUtilityDependency();
}

function copyRuntimeToTarget() {
    cleanDesktopTargetDirectory(targetLibDir, "desktop target runtime library directory");
    for (const jar of runtimeJars) {
        copyFileSync(join(libDir, jar), assertDesktopTargetPath("desktop target runtime jar", join(targetLibDir, jar)));
    }

    cleanDesktopTargetDirectory(targetNativeDir, "desktop target native directory");
    for (const [platform, files] of Object.entries(requiredNatives)) {
        const platformTargetDir = ensureDesktopTargetDirectory(join(targetNativeDir, platform), `${platform} target native directory`);
        for (const name of files) {
            copyFileSync(join(nativeDir, platform, name), assertDesktopTargetPath(`${platform} target native library`, join(platformTargetDir, name)));
        }
    }
}

function removeVersionedTargetArtifacts() {
    if (!existsSync(targetDir)) {
        return;
    }

    assertRealDirectory(targetDir, "desktop target directory");
    const versionedArtifactPattern = new RegExp(`^${distributionName}-\\d.*\\.(?:jar|zip)$`);
    for (const entry of readdirSync(targetDir)) {
        if (versionedArtifactPattern.test(entry)) {
            const artifactPath = assertDesktopTargetPath("versioned desktop artifact", join(targetDir, entry));
            assertRealFile(artifactPath, "versioned desktop artifact");
            rmSync(artifactPath, { force: true });
        }
    }
}

function createDistribution() {
    const distributionDir = join(distributionRoot, distributionName);
    cleanDesktopTargetDirectory(distributionRoot, "desktop distribution root");
    ensureDesktopTargetDirectory(distributionDir, "desktop distribution directory");
    assertRealFile(stableJarPath, "stable desktop JAR");
    copyFileSync(stableJarPath, assertDesktopTargetPath("desktop distribution JAR", join(distributionDir, `${distributionName}.jar`)));
    copyDirectoryContents(targetLibDir, join(distributionDir, "lib"));
    copyDirectoryContents(targetNativeDir, join(distributionDir, "natives"));

    for (const name of ["run-windows.cmd", "run-windows.ps1", "run-linux.sh", "run-macos.sh", "README.md", "RUNTIME_DEPENDENCIES.md"]) {
        const sourcePath = join(desktopDir, name);
        const targetPath = assertDesktopTargetPath("desktop distribution file", join(distributionDir, name));
        assertRealFile(sourcePath, "desktop distribution source file");
        copyFileSync(sourcePath, targetPath);
    }
    copyDirectoryContents(licenseDir, join(distributionDir, "licenses"));
    copyDirectoryContents(runtimeSourceDir, join(distributionDir, "sources"));
    const licensePath = join(rootDir, "LICENSE");
    const noticesPath = join(rootDir, "THIRD_PARTY_NOTICES.md");
    assertRealFile(licensePath, "license file");
    assertRealFile(noticesPath, "third-party notices");
    copyFileSync(licensePath, assertDesktopTargetPath("desktop distribution license", join(distributionDir, "LICENSE")));
    copyFileSync(noticesPath, assertDesktopTargetPath("desktop distribution third-party notices", join(distributionDir, "THIRD_PARTY_NOTICES.md")));

    removeDesktopTargetFile(stableZipPath, "stable desktop ZIP");
    writeZipFromDirectory(distributionDir, assertDesktopTargetPath("stable desktop ZIP", stableZipPath), {
        executableEntries: executableDistributionEntries,
        rootName: distributionName
    });
}

function buildWithJdk() {
    if (!commandExists("javac")) {
        throw new Error("The desktop build requires javac on PATH.");
    }
    if (!commandExists("jar")) {
        throw new Error("The desktop build requires jar on PATH.");
    }

    console.log("Building desktop archive with JDK tools.");
    cleanDesktopTargetDirectory(classesDir, "desktop classes directory");
    ensureDesktopTargetDirectory(targetDir, "desktop target directory");
    copyRuntimeToTarget();

    const sources = collectJavaFiles(sourceDir);
    assertDesktopTargetPath("desktop sources list", sourcesFile);
    writeFileSync(sourcesFile, sources.map((source) => source.replaceAll("\\", "/")).join("\n"));

    const classpath = runtimeJars.map((name) => join(libDir, name)).join(process.platform === "win32" ? ";" : ":");
    const javacVersion = getJavacFeatureVersion();
    const releaseArgs = javacVersion !== null && javacVersion >= 9 ? ["--release", "8"] : ["-source", "1.8", "-target", "1.8"];

    run("javac", ["-encoding", "UTF-8", "-Xlint:-options", ...releaseArgs, "-cp", classpath, "-d", classesDir, `@${sourcesFile}`]);
    runDesktopInputTests({ classesDir, classpath, releaseArgs });

    copyResources(sourceDir, classesDir);
    writeManifest();
    run("jar", ["cfm", stableJarPath, manifestPath, "-C", classesDir, "."]);
    createDistribution();
}

await withReleaseOperationLock(() => {
    assertDesktopTargetDirectory(targetDir, "desktop target directory");
    verifyRuntimeDependencies();
    removeVersionedTargetArtifacts();
    buildWithJdk();

    console.log(`Built ${relative(rootDir, stableJarPath)}`);
    console.log(`Built ${relative(rootDir, stableZipPath)}`);
});
