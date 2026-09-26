import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";
export const renderTargets = Object.keys(JSON.parse(readFileSync(new URL("./fixtures/render-pause-original.json", import.meta.url), "utf8")));
const hash = (text) => createHash("sha256").update(text.replace(/\s+/g, "")).digest("hex");
export function renderInventory() {
    const rows = [];
    for (const name of readdirSync(join(rootDir, "pwa/src/jackal"))
        .filter((n) => n.endsWith(".ts"))
        .sort()) {
        const source = readFileSync(join(rootDir, "pwa/src/jackal", name), "utf8");
        const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
        for (const declaration of file.statements.filter(ts.isClassDeclaration)) {
            const methods = declaration.members.filter((m) => ts.isMethodDeclaration(m) && m.body);
            const render = methods.find((m) => m.name.getText(file) === "render");
            if (!render) continue;
            const entries = [];
            const seen = new Set();
            function visitMethod(method) {
                const methodName = method.name.getText(file);
                if (seen.has(methodName)) return;
                seen.add(methodName);
                const writes = new Set(),
                    calls = new Set();
                function visit(node) {
                    let target;
                    if (
                        ts.isBinaryExpression(node) &&
                        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
                        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
                    )
                        target = node.left;
                    if (
                        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
                        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)
                    )
                        target = node.operand;
                    if (target && !ts.isIdentifier(target)) writes.add(target.getText(file));
                    if (ts.isCallExpression(node)) calls.add(node.expression.getText(file));
                    ts.forEachChild(node, visit);
                }
                visit(method.body);
                entries.push({
                    name: methodName,
                    writes: [...writes].sort(),
                    calls: [...calls].sort(),
                    ...(renderTargets.includes(declaration.name.text) && method === render ? {} : { hash: hash(method.getText(file)) })
                });
                for (const call of calls)
                    if (call.startsWith("this.")) {
                        const helper = methods.find((m) => `this.${m.name.getText(file)}` === call);
                        if (helper) visitMethod(helper);
                    }
            }
            visitMethod(render);
            const row = { class: declaration.name.text, extends: declaration.heritageClauses?.map((c) => c.getText(file)) ?? [], methods: entries };
            if (renderTargets.includes(row.class)) row.nonRenderHash = hash(source.slice(0, render.pos) + source.slice(render.end));
            rows.push(row);
        }
    }
    return rows;
}

export function javaRenderInventory() {
    const result = [];
    for (const name of readdirSync(join(rootDir, "desktop/src/jackal"))
        .filter((n) => n.endsWith(".java"))
        .sort()) {
        const source = readFileSync(join(rootDir, "desktop/src/jackal", name), "utf8");
        for (const match of source.matchAll(/public\s+void\s+render\s*\([^)]*\)\s*(?:throws[^\{]+)?\{/g)) {
            const start = match.index,
                bodyStart = source.indexOf("{", start);
            let end = bodyStart + 1,
                depth = 1;
            while (depth > 0 && end < source.length) {
                if (source[end] === "{") depth++;
                if (source[end] === "}") depth--;
                end++;
            }
            if (depth !== 0) throw new Error(`Unbalanced native render ${name}`);
            const body = source.slice(start, end);
            const row = { class: name.slice(0, -5), calls: [...new Set([...body.matchAll(/([\w.]+)\s*\(/g)].map((m) => m[1]))].sort() };
            if (renderTargets.includes(row.class)) row.nonRenderHash = hash(source.slice(0, start) + source.slice(end));
            else row.renderHash = hash(body);
            result.push(row);
        }
    }
    return result;
}
