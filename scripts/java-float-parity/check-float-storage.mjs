import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repo = path.resolve(process.argv[2]);
const metadataPath = path.resolve(process.argv[3]);
const apply = process.argv.includes("--apply");
const metadata = fs.readFileSync(metadataPath, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const exceptions = JSON.parse(fs.readFileSync(path.join(repo, "scripts", "java-ts-parity-exceptions.json"), "utf8"));
const signatureMap = JSON.parse(fs.readFileSync(path.join(repo, "scripts", "java-ts-signature-map.json"), "utf8"));
const classMap = new Map(metadata.filter((entry) => entry.fullName === entry.name).map((entry) => [entry.name, entry]));

const norm = (type) => String(type ?? "").replace(/\s+/g, "");
const isFloatScalar = (type) => norm(type) === "float";
const isFloatArray = (type) => /^float\[/.test(norm(type));
const mappedFieldName = (className, javaName) => exceptions.fieldExceptions?.[`${className}.${javaName}`]?.target ?? javaName;

const fieldCache = new Map();
function fieldsFor(className) {
    if (fieldCache.has(className)) return fieldCache.get(className);
    const result = new Map();
    const info = classMap.get(className);
    if (info?.parent && classMap.has(info.parent)) {
        for (const [name, field] of fieldsFor(info.parent)) result.set(name, field);
    }
    if (info) {
        for (const field of info.fields) {
            result.set(mappedFieldName(className, field.name), { ...field, owner: className });
        }
    }
    fieldCache.set(className, result);
    return result;
}
function fieldInfo(className, name) {
    return fieldsFor(className).get(name) ?? null;
}

function walk(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else if (entry.isFile() && full.endsWith(".ts")) files.push(full);
    }
    return files;
}
const files = walk(path.join(repo, "pwa", "src"));
const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    useDefineForClassFields: false,
    strict: true,
    skipLibCheck: true,
    noEmit: true
});
const checker = program.getTypeChecker();

function classNameForType(type) {
    if (!type) return null;
    if (type.isUnion?.()) {
        for (const member of type.types) {
            const name = classNameForType(member);
            if (name) return name;
        }
        return null;
    }
    const symbol = type.getSymbol?.() ?? type.aliasSymbol;
    const name = symbol?.getName?.();
    if (name && classMap.has(name)) return name;
    for (const base of type.getBaseTypes?.() ?? []) {
        const name2 = classNameForType(base);
        if (name2) return name2;
    }
    return null;
}
function expressionClassName(node) {
    try {
        return classNameForType(checker.getTypeAtLocation(node));
    } catch {
        return null;
    }
}

function methodsFor(className, name) {
    return (classMap.get(className)?.methods ?? []).filter((method) => method.name === name);
}
function mappedSignatureMeta(className, javaName, parameterTypes, mappingKey) {
    if (!Array.isArray(parameterTypes)) {
        throw new Error(`${mappingKey} must identify its Java signature by parameter types.`);
    }
    const matches = methodsFor(className, javaName).filter(
        (method) => method.params.length === parameterTypes.length && method.params.every((parameter, index) => parameter.type === parameterTypes[index])
    );
    if (matches.length !== 1) {
        throw new Error(`${mappingKey} resolved ${matches.length} Java signatures instead of exactly one.`);
    }
    return matches[0];
}
function mappedMethodMeta(className, tsName) {
    const mappingKey = `${className}.${tsName}`;
    const methodMapping = signatureMap.methodMappings?.[mappingKey];
    if (methodMapping) {
        return mappedSignatureMeta(className, methodMapping.javaName, methodMapping.javaParameterTypes, mappingKey);
    }
    const constructorMapping = signatureMap.constructorFactories?.[mappingKey];
    if (constructorMapping) {
        return mappedSignatureMeta(className, "<init>", constructorMapping.javaParameterTypes, mappingKey);
    }
    return null;
}
function methodMeta(className, tsName) {
    const mapped = mappedMethodMeta(className, tsName);
    if (mapped) return mapped;
    const candidates = methodsFor(className, tsName);
    return candidates.length === 1 ? candidates[0] : null;
}
function staticMeta(className, index) {
    return methodsFor(className, "<static>").find((method) => method.overloadIndex === index) ?? null;
}

function skipBody(className, methodName) {
    if (/^(?:render|draw)/.test(methodName)) return true;
    if (methodName === "displayHit") return true;
    if (className === "Main" && /^(?:draw|render|rotateGraphics|translateGraphics|scaleGraphics|pushGraphics|popGraphics|setWorldClip)/.test(methodName))
        return true;
    return false;
}

function isJavaFloatCall(node, sf) {
    return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "javaFloat";
}
function numericLiteralValue(node) {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (
        ts.isPrefixUnaryExpression(node) &&
        (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) &&
        ts.isNumericLiteral(node.operand)
    ) {
        return (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
    }
    return null;
}
function isExactFloatLiteral(node) {
    const value = numericLiteralValue(node);
    return value !== null && Math.fround(value) === value;
}
function lineIndent(source, position) {
    const lineStart = source.lastIndexOf("\n", position - 1) + 1;
    return /^[\t ]*/.exec(source.slice(lineStart, position))?.[0] ?? "";
}
function assignmentOperator(kind) {
    return (
        new Map([
            [ts.SyntaxKind.PlusEqualsToken, "+"],
            [ts.SyntaxKind.MinusEqualsToken, "-"],
            [ts.SyntaxKind.AsteriskEqualsToken, "*"],
            [ts.SyntaxKind.SlashEqualsToken, "/"],
            [ts.SyntaxKind.PercentEqualsToken, "%"]
        ]).get(kind) ?? null
    );
}
function addJavaFloatImport(source) {
    if (/import\s*\{[^}]*\bjavaFloat\b[^}]*\}\s*from\s*["']\.\.\/java\/JavaRuntime\.js["'];/s.test(source)) return source;
    const runtimePattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']\.\.\/java\/JavaRuntime\.js["'];/;
    const match = runtimePattern.exec(source);
    if (match) {
        const insertion = match.index + match[0].indexOf("{") + 1;
        return source.slice(0, insertion) + "\n    javaFloat," + source.slice(insertion);
    }
    const imports = [...source.matchAll(/^import[^;]+;\s*$/gm)];
    const last = imports.at(-1);
    const at = last ? last.index + last[0].length : 0;
    return source.slice(0, at) + `${at ? "\n" : ""}import { javaFloat } from "../java/JavaRuntime.js";\n` + source.slice(at);
}

const warnings = [];
for (const file of files) {
    const className = path.basename(file, ".ts");
    if (!classMap.has(className)) continue;
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const originalSource = fs.readFileSync(file, "utf8");
    const edits = [];
    let needsImport = false;
    let staticIndex = 0;
    const classInfo = classMap.get(className);

    function declarationTypeMap(body, meta, methodName) {
        const types = new Map();
        if (meta && !meta.constructorAggregate) {
            const paramsByName = new Map((meta.params ?? []).map((param) => [param.name, norm(param.type)]));
            for (const param of body.parent.parameters ?? []) {
                if (ts.isIdentifier(param.name) && paramsByName.has(param.name.text)) types.set(param, paramsByName.get(param.name.text));
            }
            const javaByName = new Map();
            for (const local of meta.locals ?? []) {
                if (!javaByName.has(local.name)) javaByName.set(local.name, []);
                javaByName.get(local.name).push(norm(local.type));
            }
            const tsByName = new Map();
            function collect(node) {
                if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                    if (!tsByName.has(node.name.text)) tsByName.set(node.name.text, []);
                    tsByName.get(node.name.text).push(node);
                }
                ts.forEachChild(node, collect);
            }
            collect(body);
            for (const [name, declarations] of tsByName) {
                const javaTypes = javaByName.get(name) ?? [];
                if (javaTypes.length && javaTypes.length !== declarations.length) {
                    warnings.push(
                        `${path.relative(repo, file)} ${methodName}: local count differs for ${name}: Java ${javaTypes.length}, TS ${declarations.length}`
                    );
                }
                for (let i = 0; i < Math.min(javaTypes.length, declarations.length); i++) types.set(declarations[i], javaTypes[i]);
            }
        } else if (meta?.constructorAggregate) {
            const paramTypes = new Map();
            for (const ctor of meta.methods) {
                for (const param of ctor.params ?? []) {
                    if (!paramTypes.has(param.name)) paramTypes.set(param.name, new Set());
                    paramTypes.get(param.name).add(norm(param.type));
                }
            }
            function collect(node) {
                if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                    const match = /^(.*)Local\d*$/.exec(node.name.text);
                    if (match) {
                        const candidates = paramTypes.get(match[1]);
                        if (candidates?.size === 1) types.set(node, [...candidates][0]);
                        else if (candidates?.has("float")) types.set(node, "float");
                    }
                }
                ts.forEachChild(node, collect);
            }
            collect(body);
        }
        return types;
    }

    function declarationForIdentifier(node) {
        try {
            const symbol = checker.getSymbolAtLocation(node);
            return symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
        } catch {
            return null;
        }
    }

    function processBody(body, methodName, meta) {
        if (skipBody(className, methodName)) return;
        const declarationTypes = declarationTypeMap(body, meta, methodName);

        function declaredType(identifier) {
            const declaration = declarationForIdentifier(identifier);
            return declaration ? (declarationTypes.get(declaration) ?? null) : null;
        }
        function targetType(lhs) {
            if (ts.isParenthesizedExpression(lhs)) return targetType(lhs.expression);
            if (ts.isIdentifier(lhs)) return declaredType(lhs);
            if (ts.isPropertyAccessExpression(lhs)) {
                let owner = null;
                if (ts.isIdentifier(lhs.expression) && classMap.has(lhs.expression.text)) owner = lhs.expression.text;
                else owner = expressionClassName(lhs.expression);
                return owner ? norm(fieldInfo(owner, lhs.name.text)?.type) : null;
            }
            if (ts.isElementAccessExpression(lhs)) {
                const base = lhs.expression;
                let type = null;
                if (ts.isIdentifier(base)) type = declaredType(base);
                else if (ts.isPropertyAccessExpression(base)) {
                    const owner = expressionClassName(base.expression);
                    type = owner ? norm(fieldInfo(owner, base.name.text)?.type) : null;
                }
                if (type?.startsWith("float[")) return "float";
            }
            return null;
        }
        function isKnownFloat(node) {
            if (isJavaFloatCall(node, sf) || isExactFloatLiteral(node)) return true;
            if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
                return isKnownFloat(node.expression);
            if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken))
                return isKnownFloat(node.operand);
            if (ts.isIdentifier(node)) return declaredType(node) === "float";
            if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return targetType(node) === "float";
            if (ts.isConditionalExpression(node)) return isKnownFloat(node.whenTrue) && isKnownFloat(node.whenFalse);
            return false;
        }
        function assignmentRoot(node) {
            let current = node;
            while (current.parent && ts.isParenthesizedExpression(current.parent)) current = current.parent;
            while (
                current.parent &&
                ts.isBinaryExpression(current.parent) &&
                current.parent.right === current &&
                current.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
            )
                current = current.parent;
            return current;
        }
        function renderAssignment(node) {
            const lhs = node.left.getText(sf);
            const type = targetType(node.left);
            if (type !== "float") return node.getText(sf);
            if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                if (ts.isBinaryExpression(node.right) && node.right.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    const inner = renderAssignment(node.right);
                    return targetType(node.right.left) === "float" ? `${lhs} = ${inner}` : `${lhs} = javaFloat(${inner})`;
                }
                const rhs = node.right.getText(sf);
                return isKnownFloat(node.right) ? `${lhs} = ${rhs}` : `${lhs} = javaFloat(${rhs})`;
            }
            const op = assignmentOperator(node.operatorToken.kind);
            return op ? `${lhs} = javaFloat(${lhs} ${op} ${node.right.getText(sf)})` : node.getText(sf);
        }

        const handledAssignments = new Set();
        function visit(node) {
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
                const type = declarationTypes.get(node);
                if (type === "float" && !isKnownFloat(node.initializer)) {
                    edits.push({
                        start: node.initializer.getStart(sf),
                        end: node.initializer.getEnd(),
                        text: `javaFloat(${node.initializer.getText(sf)})`,
                        kind: "local"
                    });
                    needsImport = true;
                }
            }
            if (ts.isBinaryExpression(node)) {
                const root = assignmentRoot(node);
                if (
                    root === node &&
                    !handledAssignments.has(node) &&
                    targetType(node.left) === "float" &&
                    (node.operatorToken.kind === ts.SyntaxKind.EqualsToken || assignmentOperator(node.operatorToken.kind))
                ) {
                    const rendered = renderAssignment(node);
                    if (rendered !== node.getText(sf)) {
                        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: rendered, kind: "assignment" });
                        needsImport = true;
                        handledAssignments.add(node);
                        return;
                    }
                }
            }
            if (
                (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
                (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
                targetType(node.operand) === "float"
            ) {
                const lhs = node.operand.getText(sf);
                const sign = node.operator === ts.SyntaxKind.PlusPlusToken ? "+" : "-";
                const assignment = `${lhs} = javaFloat(${lhs} ${sign} 1)`;
                const replacement = ts.isExpressionStatement(node.parent)
                    ? assignment
                    : ts.isPrefixUnaryExpression(node)
                      ? `(${assignment})`
                      : `(() => { const previous = ${lhs}; ${assignment}; return previous; })()`;
                edits.push({ start: node.getStart(sf), end: node.getEnd(), text: replacement, kind: "unary" });
                needsImport = true;
                return;
            }
            if (meta && norm(meta.returnType) === "float" && ts.isReturnStatement(node) && node.expression && !isKnownFloat(node.expression)) {
                edits.push({
                    start: node.expression.getStart(sf),
                    end: node.expression.getEnd(),
                    text: `javaFloat(${node.expression.getText(sf)})`,
                    kind: "return"
                });
                needsImport = true;
                return;
            }
            ts.forEachChild(node, visit);
        }
        visit(body);
    }

    function processClass(node) {
        if (!node.name || node.name.text !== className) return;
        const directFields = new Map(classInfo.fields.map((field) => [mappedFieldName(className, field.name), field]));
        for (const member of node.members) {
            if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.initializer) {
                const javaField = directFields.get(member.name.text);
                if (javaField && isFloatScalar(javaField.type) && !isJavaFloatCall(member.initializer, sf) && !isExactFloatLiteral(member.initializer)) {
                    edits.push({
                        start: member.initializer.getStart(sf),
                        end: member.initializer.getEnd(),
                        text: `javaFloat(${member.initializer.getText(sf)})`,
                        kind: "field"
                    });
                    needsImport = true;
                }
            }
        }
        for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.body && member.name && ts.isIdentifier(member.name))
                processBody(member.body, member.name.text, methodMeta(className, member.name.text));
            else if (ts.isConstructorDeclaration(member) && member.body) {
                const constructors = methodsFor(className, "<init>");
                const meta = constructors.length === 1 ? constructors[0] : null;
                processBody(member.body, "constructor", meta);
            } else if (ts.isClassStaticBlockDeclaration(member)) processBody(member.body, "<static>", staticMeta(className, staticIndex++));
        }
    }
    sf.forEachChild((node) => {
        if (ts.isClassDeclaration(node)) processClass(node);
    });

    if (!edits.length) continue;
    edits.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    for (const edit of edits) {
        const previous = kept.at(-1);
        if (previous && edit.start < previous.end) {
            if (edit.end <= previous.end) continue;
            warnings.push(`${path.relative(repo, file)} overlapping edits ${JSON.stringify(previous)} / ${JSON.stringify(edit)}`);
            continue;
        }
        kept.push(edit);
    }
    let output = originalSource;
    for (const edit of [...kept].sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    if (needsImport) output = addJavaFloatImport(output);
    if (apply) fs.writeFileSync(file, output);
    const counts = Object.groupBy(kept, (edit) => edit.kind);
    console.log(
        `${path.relative(repo, file)}: ${kept.length} ${Object.entries(counts)
            .map(([kind, list]) => `${kind}=${list.length}`)
            .join(" ")}`
    );
}
if (warnings.length) {
    console.error(warnings.join("\n"));
    process.exitCode = 2;
}
