import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const sourceRoot = resolve(rootDir, "pwa/src");

function collectTypeScriptFiles(directory, files = []) {
    for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) collectTypeScriptFiles(path, files);
        else if (extname(path) === ".ts") files.push(resolve(path));
    }
    return files;
}

function runtimeImports(path, knownFiles) {
    const source = readFileSync(path, "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const imports = [];
    for (const statement of file.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        if (!specifier.startsWith(".")) continue;
        const clause = statement.importClause;
        if (clause?.isTypeOnly) continue;
        if (
            clause?.namedBindings &&
            ts.isNamedImports(clause.namedBindings) &&
            clause.namedBindings.elements.length > 0 &&
            clause.namedBindings.elements.every((element) => element.isTypeOnly)
        ) {
            continue;
        }
        const target = resolve(dirname(path), specifier.replace(/\.js$/, ".ts"));
        if (knownFiles.has(target)) imports.push(target);
    }
    return imports;
}

function stronglyConnectedComponents(graph) {
    let nextIndex = 0;
    const stack = [];
    const indexes = new Map();
    const lowLinks = new Map();
    const onStack = new Set();
    const components = [];

    function visit(node) {
        indexes.set(node, nextIndex);
        lowLinks.set(node, nextIndex++);
        stack.push(node);
        onStack.add(node);
        for (const target of graph.get(node) ?? []) {
            if (!indexes.has(target)) {
                visit(target);
                lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(target)));
            } else if (onStack.has(target)) {
                lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(target)));
            }
        }
        if (lowLinks.get(node) !== indexes.get(node)) return;
        const component = [];
        let member;
        do {
            member = stack.pop();
            onStack.delete(member);
            component.push(member);
        } while (member !== node);
        components.push(component);
    }

    for (const node of graph.keys()) if (!indexes.has(node)) visit(node);
    return components;
}

test("pwa runtime imports have no ES-module cycles", () => {
    const files = collectTypeScriptFiles(sourceRoot);
    const knownFiles = new Set(files);
    const graph = new Map(files.map((path) => [path, runtimeImports(path, knownFiles)]));
    const cycles = stronglyConnectedComponents(graph)
        .filter((component) => component.length > 1 || (graph.get(component[0]) ?? []).includes(component[0]))
        .map((component) => component.map((path) => relative(sourceRoot, path)).sort());
    assert.deepEqual(cycles, []);
});
