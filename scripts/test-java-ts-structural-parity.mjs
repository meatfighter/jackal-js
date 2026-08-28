import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const javaRoot = join(rootDir, "desktop", "src", "jackal");
const tsRoot = join(rootDir, "pwa", "src", "jackal");
const exceptions = JSON.parse(readFileSync(join(rootDir, "scripts", "java-ts-parity-exceptions.json"), "utf8"));

function stripJavaCommentsAndStrings(source) {
    const output = source.split("");
    let state = "code";

    for (let i = 0; i < source.length; i++) {
        if (state === "code") {
            if (source[i] === "/" && source[i + 1] === "/") {
                output[i] = " ";
                output[i + 1] = " ";
                i++;
                state = "line";
            } else if (source[i] === "/" && source[i + 1] === "*") {
                output[i] = " ";
                output[i + 1] = " ";
                i++;
                state = "block";
            } else if (source[i] === '"' || source[i] === "'") {
                output[i] = " ";
                state = source[i];
            }
        } else if (state === "line") {
            if (source[i] === "\n") {
                state = "code";
            } else {
                output[i] = " ";
            }
        } else if (state === "block") {
            if (source[i] === "*" && source[i + 1] === "/") {
                output[i] = " ";
                output[i + 1] = " ";
                i++;
                state = "code";
            } else if (source[i] !== "\n") {
                output[i] = " ";
            }
        } else if (source[i] === "\\") {
            output[i] = " ";
            if (i + 1 < source.length) {
                output[++i] = " ";
            }
        } else if (source[i] === state) {
            output[i] = " ";
            state = "code";
        } else if (source[i] !== "\n") {
            output[i] = " ";
        }
    }

    return output.join("");
}

function braceDepths(source) {
    const depths = new Int32Array(source.length);
    let depth = 0;
    for (let i = 0; i < source.length; i++) {
        depths[i] = depth;
        if (source[i] === "{") {
            depth++;
        } else if (source[i] === "}") {
            depth--;
        }
    }
    return depths;
}

function javaDeclaration(source, className) {
    const stripped = stripJavaCommentsAndStrings(source);
    const kindMatch = new RegExp(`\\b(?:public\\s+)?(class|interface|enum)\\s+${className}\\b`).exec(stripped);
    assert.ok(kindMatch, `Missing Java declaration ${className}.`);

    const kind = kindMatch[1];
    const depths = braceDepths(stripped);
    const fields = new Set();
    const methods = new Set();
    const enumMembers = new Set();

    if (kind === "class" || kind === "interface") {
        const fieldPattern =
            /\b(?:public|protected|private)\s+(?:(?:static|final|transient|volatile)\s+)*(?:[A-Za-z_$][\w$]*(?:\s*<[^;{}()]*>)?(?:\s*\[\s*\])?(?:\s*\.\.\.)?\s+)+([A-Za-z_$][\w$]*)\s*(?:=[^;{}]*)?;/g;
        for (const match of stripped.matchAll(fieldPattern)) {
            if (depths[match.index] === 1 && !match[0].includes("(")) {
                fields.add(match[1]);
            }
        }

        const methodPattern =
            /\b(?:public|protected|private)\s+(?:(?:static|final|synchronized|native|abstract)\s+)*(?:[A-Za-z_$][\w$]*(?:\s*<[^;{}()]*>)?(?:\s*\[\s*\])?(?:\s*\.\.\.)?\s+)+([A-Za-z_$][\w$]*)\s*\(/g;
        for (const match of stripped.matchAll(methodPattern)) {
            if (depths[match.index] === 1 && match[1] !== className) {
                methods.add(match[1]);
            }
        }
    } else if (kind === "enum") {
        const open = stripped.indexOf("{", kindMatch.index);
        const semicolon = stripped.indexOf(";", open);
        const close = stripped.indexOf("}", open);
        const end = semicolon >= 0 && semicolon < close ? semicolon : close;
        const body = stripped.slice(open + 1, end);
        for (const match of body.matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
            enumMembers.add(match[1]);
        }
    }

    return { kind, fields, methods, enumMembers };
}

function tsDeclaration(path, name) {
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const declaration = sourceFile.statements.find(
        (statement) =>
            (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name?.text === name
    );
    assert.ok(declaration, `Missing TypeScript declaration ${name}.`);

    const fields = new Set();
    const methods = new Set();
    const enumMembers = new Set();

    if (ts.isEnumDeclaration(declaration)) {
        for (const member of declaration.members) {
            if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
                enumMembers.add(member.name.text);
            }
        }
    } else {
        for (const member of declaration.members) {
            const memberName = member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ? member.name.text : null;
            if (memberName === null) {
                continue;
            }
            if (
                ts.isPropertyDeclaration(member) ||
                ts.isPropertySignature(member) ||
                ts.isGetAccessorDeclaration(member) ||
                ts.isSetAccessorDeclaration(member)
            ) {
                fields.add(memberName);
            }
            if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
                methods.add(memberName);
            }
        }
    }

    return { fields, methods, enumMembers };
}

function assertException(kind, className, memberName, tsMembers) {
    const key = `${className}.${memberName}`;
    const entry = exceptions[kind][key];
    assert.ok(entry, `Undocumented Java-to-TypeScript ${kind === "fieldExceptions" ? "field" : "method"} difference: ${key}.`);
    if (entry.target !== undefined) {
        assert.ok(tsMembers.has(entry.target), `${key} maps to missing TypeScript member ${entry.target}.`);
    } else {
        assert.ok(typeof entry.reason === "string" && entry.reason.length > 0, `${key} must include a reason.`);
    }
}

test("Java and TypeScript gameplay files remain one-to-one except documented platform boundaries", () => {
    const javaFiles = new Set(
        readdirSync(javaRoot)
            .filter((name) => name.endsWith(".java"))
            .map((name) => basename(name, ".java"))
    );
    const tsFiles = new Set(
        readdirSync(tsRoot)
            .filter((name) => name.endsWith(".ts"))
            .map((name) => basename(name, ".ts"))
    );

    for (const name of javaFiles) {
        if (!tsFiles.has(name)) {
            assert.ok(exceptions.javaOnlyFiles[name], `Undocumented Java-only gameplay file: ${name}.java`);
        }
    }
    for (const name of tsFiles) {
        if (!javaFiles.has(name)) {
            assert.ok(exceptions.typescriptOnlyFiles[name], `Undocumented TypeScript-only gameplay file: ${name}.ts`);
        }
    }

    assert.deepEqual([...javaFiles].filter((name) => !tsFiles.has(name)).sort(), Object.keys(exceptions.javaOnlyFiles).sort());
    assert.deepEqual([...tsFiles].filter((name) => !javaFiles.has(name)).sort(), Object.keys(exceptions.typescriptOnlyFiles).sort());
});

test("Java gameplay fields, methods, and enum members are present or explicitly documented", () => {
    for (const entry of readdirSync(javaRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".java")) {
            continue;
        }

        const className = basename(entry.name, ".java");
        if (exceptions.javaOnlyFiles[className]) {
            continue;
        }

        const java = javaDeclaration(readFileSync(join(javaRoot, entry.name), "utf8"), className);
        const typescript = tsDeclaration(join(tsRoot, `${className}.ts`), className);

        for (const field of java.fields) {
            if (!typescript.fields.has(field)) {
                assertException("fieldExceptions", className, field, typescript.fields);
            }
        }
        for (const method of java.methods) {
            if (!typescript.methods.has(method)) {
                assertException("methodExceptions", className, method, typescript.methods);
            }
        }
        for (const member of java.enumMembers) {
            if (!typescript.enumMembers.has(member)) {
                const key = `${className}.${member}`;
                assert.ok(exceptions.enumMemberExceptions[key], `Undocumented Java-to-TypeScript enum difference: ${key}.`);
            }
        }
    }
});
