import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const nativeDirectories = [join(rootDir, "pwa", "src", "app"), join(rootDir, "pwa", "src", "java"), join(rootDir, "pwa", "src", "jackal", "persistence")];
const nativeFiles = [
    join(rootDir, "pwa", "src", "main.ts"),
    join(rootDir, "pwa", "vite.config.ts"),
    join(rootDir, "pwa", "src", "jackal", "index.ts"),
    join(rootDir, "pwa", "src", "jackal", "JackalMath.ts"),
    join(rootDir, "pwa", "src", "jackal", "JackalResources.ts"),
    join(rootDir, "pwa", "src", "jackal", "MainRuntimeState.ts")
];

function collectTypeScriptFiles(directory) {
    const result = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            result.push(...collectTypeScriptFiles(path));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
            result.push(path);
        }
    }
    return result;
}

const auditedFiles = [...nativeDirectories.flatMap(collectTypeScriptFiles), ...nativeFiles];
const auditedFileSet = new Set(auditedFiles.map((path) => normalize(path)));

test("TypeScript-native modules reject translation-only escape hatches", () => {
    const failures = [];

    for (const path of auditedFiles) {
        const source = readFileSync(path, "utf8");
        const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

        function visit(node) {
            if (ts.isNonNullExpression(node)) {
                failures.push(`${path}: postfix non-null assertion`);
            }
            if (node.kind === ts.SyntaxKind.AnyKeyword) {
                failures.push(`${path}: explicit any`);
            }
            if (
                ts.isBinaryExpression(node) &&
                (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken || node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)
            ) {
                failures.push(`${path}: coercive equality`);
            }
            if (
                ts.isPropertyAccessExpression(node) &&
                node.expression.kind === ts.SyntaxKind.Identifier &&
                node.expression.text === "arguments" &&
                node.name.text === "length"
            ) {
                failures.push(`${path}: arguments.length dispatch`);
            }
            if (
                ts.isAsExpression(node) &&
                node.type.kind !== ts.SyntaxKind.UnknownKeyword &&
                ts.isAsExpression(node.expression) &&
                node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
            ) {
                failures.push(`${path}: double assertion through unknown`);
            }
            ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        assert.doesNotMatch(source, /@ts-(?:ignore|nocheck)/, `${path} must not suppress TypeScript diagnostics.`);
    }

    assert.deepEqual(failures, []);
});

test("TypeScript-native modules have no unused declarations", () => {
    const configPath = join(rootDir, "pwa", "tsconfig.json");
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    assert.equal(configFile.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        join(rootDir, "pwa"),
        {
            noEmit: true,
            noUnusedLocals: true,
            noUnusedParameters: true
        },
        configPath
    );
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .filter((diagnostic) => diagnostic.file !== undefined && auditedFileSet.has(normalize(diagnostic.file.fileName)))
        .filter((diagnostic) => diagnostic.code === 6133 || diagnostic.code === 6192 || diagnostic.code === 6196);

    assert.deepEqual(
        diagnostics.map((diagnostic) => {
            const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
            return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
        }),
        []
    );
});

test("JavaScript tooling modules have no unused declarations", () => {
    const scriptsDirectory = join(rootDir, "scripts");
    const scriptFiles = readdirSync(scriptsDirectory)
        .filter((name) => name.endsWith(".js") || name.endsWith(".mjs"))
        .map((name) => join(scriptsDirectory, name));
    const program = ts.createProgram(scriptFiles, {
        allowJs: true,
        checkJs: true,
        noEmit: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        types: ["node"],
        skipLibCheck: true
    });
    const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .filter((diagnostic) => diagnostic.file?.fileName.startsWith(scriptsDirectory))
        .filter((diagnostic) => diagnostic.code === 6133 || diagnostic.code === 6192 || diagnostic.code === 6196);

    assert.deepEqual(
        diagnostics.map((diagnostic) => {
            const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
            return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`;
        }),
        []
    );
});

test("lint exceptions are scoped to the direct Java translation", () => {
    const config = readFileSync(join(rootDir, "eslint.config.js"), "utf8");
    assert.match(config, /files:\s*\["pwa\/src\/jackal\/\*\.ts"\]/);
    assert.match(config, /"pwa\/src\/jackal\/persistence\/\*\*\/\*\.ts"/);
    assert.match(config, /const typescriptNativeFiles/);
    assert.match(config, /const javascriptNativeFiles/);
    assert.match(config, /"@typescript-eslint\/no-unused-vars"/);
    assert.match(config, /"no-empty": "error"/);
});
