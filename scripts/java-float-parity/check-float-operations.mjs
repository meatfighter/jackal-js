import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repo = path.resolve(process.argv[2]);
const metadataPath = path.resolve(process.argv[3]);
const apply = process.argv.includes("--apply");
const metadata = fs.readFileSync(metadataPath, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const exceptions = JSON.parse(fs.readFileSync(path.join(repo, "scripts", "java-ts-parity-exceptions.json"), "utf8"));
const classMap = new Map(metadata.filter((entry) => entry.fullName === entry.name).map((entry) => [entry.name, entry]));
const norm = (type) => String(type ?? "").replace(/\s+/g, "");
const mappedFieldName = (className, javaName) => exceptions.fieldExceptions?.[`${className}.${javaName}`]?.target ?? javaName;

const fieldCache = new Map();
function fieldsFor(className) {
    if (fieldCache.has(className)) return fieldCache.get(className);
    const result = new Map();
    const info = classMap.get(className);
    if (info?.parent && classMap.has(info.parent)) for (const [name, field] of fieldsFor(info.parent)) result.set(name, field);
    if (info) for (const field of info.fields) result.set(mappedFieldName(className, field.name), { ...field, owner: className });
    fieldCache.set(className, result);
    return result;
}
const fieldType = (className, name) => norm(fieldsFor(className).get(name)?.type);
function walk(dir) {
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) result.push(...walk(full));
        else if (entry.isFile() && full.endsWith(".ts")) result.push(full);
    }
    return result;
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
function methodMeta(className, tsName) {
    if (tsName === "constructor") return null;
    if (tsName === `__construct_${className}`) return { constructorAggregate: true, methods: methodsFor(className, "<init>") };
    const match = /^(.*)__overload(\d+)$/.exec(tsName);
    if (match) return methodsFor(className, match[1]).find((method) => method.overloadIndex === Number(match[2])) ?? null;
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
function arithmetic(kind) {
    return (
        new Map([
            [ts.SyntaxKind.PlusToken, "+"],
            [ts.SyntaxKind.MinusToken, "-"],
            [ts.SyntaxKind.AsteriskToken, "*"],
            [ts.SyntaxKind.SlashToken, "/"],
            [ts.SyntaxKind.PercentToken, "%"]
        ]).get(kind) ?? null
    );
}
function isJavaFloatCall(node) {
    return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "javaFloat";
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
function parseJavaLiteral(raw) {
    const text = String(raw)
        .replace(/_/g, "")
        .replace(/[fFdDlL]$/, "");
    if (/^'.*'$/.test(text)) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
}
function collectNumericLiterals(node) {
    const result = [];
    function visit(current) {
        if (ts.isClassDeclaration(current) && current !== node) return;
        if (ts.isNumericLiteral(current)) result.push(current);
        ts.forEachChild(current, visit);
    }
    visit(node);
    return result;
}
function literalFloatMap(node, javaLiterals) {
    const tsLiterals = collectNumericLiterals(node);
    const java = (javaLiterals ?? []).map((entry) => ({ ...entry, value: parseJavaLiteral(entry.raw) })).filter((entry) => entry.value !== null);
    const n = java.length,
        m = tsLiterals.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            const same = Object.is(java[i].value, Number(tsLiterals[j].text));
            dp[i][j] = same ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const result = new Map();
    let i = 0,
        j = 0;
    while (i < n && j < m) {
        if (Object.is(java[i].value, Number(tsLiterals[j].text)) && dp[i][j] === 1 + dp[i + 1][j + 1]) {
            result.set(tsLiterals[j], java[i].float ? "float" : Number.isInteger(java[i].value) ? "int" : "double");
            i++;
            j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
        else j++;
    }
    return result;
}
function promote(a, b) {
    if (a === "double" || b === "double") return "double";
    if (a === "float" || b === "float") return "float";
    if (a === "long" || b === "long") return "long";
    if (a === "int" && b === "int") return "int";
    if (a === "unknown") return b;
    if (b === "unknown") return a;
    return "unknown";
}

const warnings = [];
for (const file of files) {
    const className = path.basename(file, ".ts");
    const classInfo = classMap.get(className);
    if (!classInfo) continue;
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const originalSource = fs.readFileSync(file, "utf8");
    const edits = [];
    let needsImport = false;
    let staticIndex = 0;

    function declarationForIdentifier(node) {
        try {
            const symbol = checker.getSymbolAtLocation(node);
            return symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? null;
        } catch {
            return null;
        }
    }
    function buildDeclarationTypes(container, meta, methodName) {
        const result = new Map();
        if (meta && !meta.constructorAggregate) {
            const params = new Map((meta.params ?? []).map((param) => [param.name, norm(param.type)]));
            const parameterNodes = container.parent?.parameters ?? [];
            for (const parameter of parameterNodes)
                if (ts.isIdentifier(parameter.name) && params.has(parameter.name.text)) result.set(parameter, params.get(parameter.name.text));
            const javaByName = new Map();
            for (const local of meta.locals ?? []) {
                if (!javaByName.has(local.name)) javaByName.set(local.name, []);
                javaByName.get(local.name).push(norm(local.type));
            }
            const tsByName = new Map();
            function visit(node) {
                if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                    if (!tsByName.has(node.name.text)) tsByName.set(node.name.text, []);
                    tsByName.get(node.name.text).push(node);
                }
                ts.forEachChild(node, visit);
            }
            visit(container);
            for (const [name, declarations] of tsByName) {
                const javaTypes = javaByName.get(name) ?? [];
                if (javaTypes.length && javaTypes.length !== declarations.length)
                    warnings.push(
                        `${path.relative(repo, file)} ${methodName}: local count differs for ${name}: Java ${javaTypes.length}, TS ${declarations.length}`
                    );
                for (let i = 0; i < Math.min(javaTypes.length, declarations.length); i++) result.set(declarations[i], javaTypes[i]);
            }
        } else if (meta?.constructorAggregate) {
            const paramTypes = new Map();
            for (const ctor of meta.methods) {
                for (const param of ctor.params ?? []) {
                    if (!paramTypes.has(param.name)) paramTypes.set(param.name, new Set());
                    paramTypes.get(param.name).add(norm(param.type));
                }
            }
            function visit(node) {
                if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
                    const match = /^(.*)Local\d*$/.exec(node.name.text);
                    if (match) {
                        const candidates = paramTypes.get(match[1]);
                        if (candidates?.size === 1) result.set(node, [...candidates][0]);
                        else if (candidates?.has("float")) result.set(node, "float");
                    }
                }
                ts.forEachChild(node, visit);
            }
            visit(container);
        }
        return result;
    }

    function processContainer(container, methodName, meta, javaLiterals) {
        if (skipBody(className, methodName)) return;
        const declarationTypes = buildDeclarationTypes(container, meta, methodName);
        const literalTypes = literalFloatMap(container, javaLiterals);
        function declaredType(identifier) {
            const declaration = declarationForIdentifier(identifier);
            return declaration ? (declarationTypes.get(declaration) ?? "unknown") : "unknown";
        }
        function targetType(lhs) {
            if (ts.isParenthesizedExpression(lhs) || ts.isNonNullExpression(lhs) || ts.isAsExpression(lhs) || ts.isTypeAssertionExpression(lhs))
                return targetType(lhs.expression);
            if (ts.isIdentifier(lhs)) return declaredType(lhs);
            if (ts.isPropertyAccessExpression(lhs)) {
                let owner = null;
                if (ts.isIdentifier(lhs.expression) && classMap.has(lhs.expression.text)) owner = lhs.expression.text;
                else owner = expressionClassName(lhs.expression);
                return owner ? fieldType(owner, lhs.name.text) || "unknown" : "unknown";
            }
            if (ts.isElementAccessExpression(lhs)) {
                const base = lhs.expression;
                let type = "unknown";
                if (ts.isIdentifier(base)) type = declaredType(base);
                else if (ts.isPropertyAccessExpression(base)) {
                    const owner = expressionClassName(base.expression);
                    if (owner) type = fieldType(owner, base.name.text);
                }
                if (type.startsWith("float[")) return "float";
                if (type.startsWith("double[")) return "double";
                if (type.startsWith("int[")) return "int";
            }
            return "unknown";
        }
        function javaType(node) {
            if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
                return javaType(node.expression);
            if (ts.isNumericLiteral(node)) {
                const mapped = literalTypes.get(node);
                if (mapped) return mapped;
                const value = Number(node.text);
                return Number.isInteger(value) ? "int" : "float";
            }
            if (ts.isBigIntLiteral(node)) return "long";
            if (ts.isIdentifier(node)) return declaredType(node);
            if (ts.isPropertyAccessExpression(node)) {
                const text = node.getText(sf);
                if (text === "Math.PI" || text === "Math.E") return "double";
                if (node.name.text === "length" || node.name.text === "size") return "int";
                return targetType(node);
            }
            if (ts.isElementAccessExpression(node)) return targetType(node);
            if (ts.isPrefixUnaryExpression(node)) {
                if (node.operator === ts.SyntaxKind.ExclamationToken) return "boolean";
                if (node.operator === ts.SyntaxKind.TildeToken) return "int";
                return javaType(node.operand);
            }
            if (ts.isPostfixUnaryExpression(node)) return javaType(node.operand);
            if (ts.isConditionalExpression(node)) return promote(javaType(node.whenTrue), javaType(node.whenFalse));
            if (ts.isBinaryExpression(node)) {
                if (arithmetic(node.operatorToken.kind)) return promote(javaType(node.left), javaType(node.right));
                if (
                    node.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
                    node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken ||
                    node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken ||
                    node.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken ||
                    node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken ||
                    node.operatorToken.kind === ts.SyntaxKind.PercentEqualsToken
                )
                    return targetType(node.left);
                return "boolean";
            }
            if (ts.isCallExpression(node)) {
                const text = node.expression.getText(sf);
                if (text === "javaFloat" || text.endsWith(".nextFloat")) return "float";
                if (text === "javaDouble") return "double";
                if (/^(?:javaInt|javaIntDiv|javaRoundFloat|javaByte|javaShort|javaChar)$/.test(text) || text.endsWith(".nextInt")) return "int";
                if (text === "javaLong") return "long";
                if (text.startsWith("Math.")) {
                    const name = text.slice(5);
                    if (name === "abs" || name === "min" || name === "max") return node.arguments.reduce((type, arg) => promote(type, javaType(arg)), "int");
                    if (name === "round") return javaType(node.arguments[0]) === "float" ? "int" : "long";
                    return "double";
                }
                if (ts.isPropertyAccessExpression(node.expression)) {
                    let owner = null;
                    if (ts.isIdentifier(node.expression.expression) && classMap.has(node.expression.expression.text)) owner = node.expression.expression.text;
                    else owner = expressionClassName(node.expression.expression);
                    if (owner) {
                        const javaName = node.expression.name.text.replace(/__overload\d+$/, "");
                        const candidates = methodsFor(owner, javaName).filter((method) => (method.params ?? []).length === node.arguments.length);
                        const returnTypes = new Set(candidates.map((method) => norm(method.returnType)));
                        if (returnTypes.size === 1) return [...returnTypes][0] || "unknown";
                    }
                }
                return "unknown";
            }
            return "unknown";
        }

        const wraps = new Map();
        function addWrap(node, reason) {
            const key = `${node.getStart(sf)}:${node.getEnd()}`;
            if (!wraps.has(key)) wraps.set(key, { start: node.getStart(sf), end: node.getEnd(), reason });
        }
        function exactFloatLiteral(node) {
            let value = null;
            if (ts.isNumericLiteral(node)) value = Number(node.text);
            else if (
                ts.isPrefixUnaryExpression(node) &&
                (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken) &&
                ts.isNumericLiteral(node.operand)
            )
                value = (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1) * Number(node.operand.text);
            return value !== null && Math.fround(value) === value;
        }
        function guaranteedFloatValue(node) {
            if (isJavaFloatCall(node) || exactFloatLiteral(node)) return true;
            if (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
                return guaranteedFloatValue(node.expression);
            if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken))
                return guaranteedFloatValue(node.operand);
            if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return javaType(node) === "float";
            if (ts.isBinaryExpression(node) && arithmetic(node.operatorToken.kind) && javaType(node) === "float") return true;
            if (ts.isConditionalExpression(node)) return guaranteedFloatValue(node.whenTrue) && guaranteedFloatValue(node.whenFalse);
            if (ts.isCallExpression(node) && javaType(node) === "float") return true;
            return false;
        }
        function parameterTypesForCall(node) {
            let owner = null;
            let javaName = null;
            let candidates = [];
            if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && classMap.has(node.expression.text)) {
                owner = node.expression.text;
                javaName = "<init>";
                candidates = methodsFor(owner, javaName).filter((method) => (method.params ?? []).length === (node.arguments?.length ?? 0));
            } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                if (ts.isIdentifier(node.expression.expression) && classMap.has(node.expression.expression.text)) owner = node.expression.expression.text;
                else owner = expressionClassName(node.expression.expression);
                javaName = node.expression.name.text.replace(/__overload\d+$/, "");
                if (owner) candidates = methodsFor(owner, javaName).filter((method) => (method.params ?? []).length === node.arguments.length);
            }
            if (!owner || !candidates.length) return null;
            const count = ts.isNewExpression(node) ? (node.arguments?.length ?? 0) : node.arguments.length;
            const result = [];
            for (let index = 0; index < count; index++) {
                const types = new Set(candidates.map((method) => norm(method.params[index]?.type)));
                result.push(types.size === 1 ? [...types][0] : "unknown");
            }
            return result;
        }
        function roundedByExistingJavaFloat(node) {
            let current = node;
            while (
                current.parent &&
                (ts.isParenthesizedExpression(current.parent) ||
                    ts.isNonNullExpression(current.parent) ||
                    ts.isAsExpression(current.parent) ||
                    ts.isTypeAssertionExpression(current.parent))
            )
                current = current.parent;
            return Boolean(current.parent && isJavaFloatCall(current.parent) && current.parent.arguments[0] === current);
        }
        function scan(node) {
            if (ts.isNumericLiteral(node) && literalTypes.get(node) === "float" && !exactFloatLiteral(node) && !roundedByExistingJavaFloat(node)) {
                addWrap(node, "literal");
            }
            if (ts.isBinaryExpression(node) && arithmetic(node.operatorToken.kind) && javaType(node) === "float" && !roundedByExistingJavaFloat(node)) {
                addWrap(node, "operation");
            }
            if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
                const params = parameterTypesForCall(node);
                const args = node.arguments ?? [];
                if (params) {
                    for (let index = 0; index < Math.min(params.length, args.length); index++) {
                        if (params[index] === "float" && !guaranteedFloatValue(args[index])) addWrap(args[index], "argument");
                    }
                }
            }
            ts.forEachChild(node, scan);
        }
        scan(container);
        for (const wrap of wraps.values()) edits.push({ ...wrap, kind: "wrap" });
    }

    function processClass(node) {
        if (!node.name || node.name.text !== className) return;
        const directFields = new Map(classInfo.fields.map((field) => [mappedFieldName(className, field.name), field]));
        for (const member of node.members) {
            if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name) && member.initializer) {
                const field = directFields.get(member.name.text);
                if (field) processContainer(member.initializer, `<field:${member.name.text}>`, null, field.literals ?? []);
            }
        }
        for (const member of node.members) {
            if (ts.isMethodDeclaration(member) && member.body && member.name && ts.isIdentifier(member.name)) {
                const meta = methodMeta(className, member.name.text);
                processContainer(member.body, member.name.text, meta, meta?.literals ?? []);
            } else if (ts.isConstructorDeclaration(member) && member.body) {
                processContainer(member.body, "constructor", null, []);
            } else if (ts.isClassStaticBlockDeclaration(member)) {
                const meta = staticMeta(className, staticIndex++);
                processContainer(member.body, "<static>", meta, meta?.literals ?? []);
            }
        }
    }
    sf.forEachChild((node) => {
        if (ts.isClassDeclaration(node)) processClass(node);
    });
    if (!edits.length) continue;
    const unique = new Map(edits.map((edit) => [`${edit.start}:${edit.end}`, edit]));
    const wraps = [...unique.values()];
    const events = new Map();
    function eventAt(position) {
        if (!events.has(position)) events.set(position, { opens: [], closes: [] });
        return events.get(position);
    }
    for (const wrap of wraps) {
        eventAt(wrap.start).opens.push(wrap);
        eventAt(wrap.end).closes.push(wrap);
    }
    for (const event of events.values()) {
        event.opens.sort((a, b) => b.end - a.end || a.start - b.start);
        event.closes.sort((a, b) => b.start - a.start || a.end - b.end);
    }
    let output = "";
    for (let position = 0; position <= originalSource.length; position++) {
        const event = events.get(position);
        if (event) {
            if (event.closes.length) output += ")".repeat(event.closes.length);
            if (event.opens.length) output += "javaFloat(".repeat(event.opens.length);
        }
        if (position < originalSource.length) output += originalSource[position];
    }
    needsImport = wraps.length > 0;
    if (needsImport) output = addJavaFloatImport(output);
    if (apply) fs.writeFileSync(file, output);
    console.log(`${path.relative(repo, file)}: ${wraps.length} float operations`);
}
if (warnings.length) {
    console.error(warnings.join("\n"));
    process.exitCode = 2;
}
