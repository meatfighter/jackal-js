import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const scannedExtensions = new Set([".ts", ".tsx", ".mts", ".cts"]);
const scanRoots = [join(rootDir, "pwa", "src"), join(rootDir, "pwa", "vite.config.ts")];
const failures = [];

function scanPath(path) {
    let entries;
    try {
        entries = readdirSync(path, { withFileTypes: true });
    } catch (error) {
        if (error?.code === "ENOTDIR") {
            scanFile(path);
            return;
        }
        throw error;
    }

    for (const entry of entries) {
        const child = join(path, entry.name);
        if (entry.isDirectory()) {
            scanPath(child);
        } else if (entry.isFile()) {
            scanFile(child);
        }
    }
}

function scanFile(path) {
    if (!scannedExtensions.has(extname(path))) {
        return;
    }

    const sourceText = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true);

    function visit(node) {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
            const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            failures.push(`${relative(rootDir, path).replaceAll("\\", "/")}:${position.line + 1}:${position.character + 1}`);
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

for (const scanRoot of scanRoots) {
    scanPath(scanRoot);
}

if (failures.length > 0) {
    console.error(`Explicit TypeScript any is not permitted (${failures.length} occurrence${failures.length === 1 ? "" : "s"}):`);
    console.error(failures.join("\n"));
    process.exitCode = 1;
} else {
    console.log("Explicit TypeScript any occurrences: 0");
}
