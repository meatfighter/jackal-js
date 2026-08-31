import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const javaRoot = join(rootDir, "desktop", "src", "jackal");
const tsRoot = join(rootDir, "pwa", "src", "jackal");
const exceptions = JSON.parse(readFileSync(join(rootDir, "scripts", "java-ts-parity-exceptions.json"), "utf8"));
const signatureMap = JSON.parse(readFileSync(join(rootDir, "scripts", "java-ts-signature-map.json"), "utf8"));
const floatMetadata = readFileSync(join(rootDir, "scripts", "java-float-parity", "java-float-metadata.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const javaClasses = new Map(floatMetadata.filter((entry) => entry.fullName === entry.name).map((entry) => [entry.name, entry]));
const expectedDispatcherFloatBoundaryMappings = new Set([
    "Enemy.isMineAt",
    "Enemy.isMineBounds",
    "Enemy.isSolidAt",
    "Enemy.isSolidBounds",
    "GameMode.isDriveableBounds",
    "GameMode.isDriveable",
    "GameMode.isOutsideOfFrame",
    "GameMode.isOutsideOfFrameBounds",
    "GameMode.suggestDirectionFromVelocity",
    "GameMode.suggestDirectionWithCurrentAngle",
    "GameMode.suggestDirection",
    "HitElement.hitAt",
    "HitElement.hitBounds",
    "Main.playSoundAtVolume",
    "Main.playSoundIfNotPlayingAtVolume",
    "Player.attackBounds",
    "Player.attackAt"
]);

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

function mappedTypeScriptMethods(className, javaName) {
    const prefix = `${className}.`;
    return Object.entries(signatureMap.methodMappings)
        .filter(([key, mapping]) => key.startsWith(prefix) && mapping.javaName === javaName)
        .map(([key]) => key.slice(prefix.length));
}

function splitMappingKey(key) {
    const separator = key.indexOf(".");
    assert.ok(separator > 0 && separator < key.length - 1, `Invalid Java-to-TypeScript mapping key: ${key}.`);
    return [key.slice(0, separator), key.slice(separator + 1)];
}

function sameJavaParameterTypes(method, parameterTypes) {
    return (
        Array.isArray(parameterTypes) &&
        method.params.length === parameterTypes.length &&
        method.params.every((parameter, index) => parameter.type === parameterTypes[index])
    );
}

function javaSignatureKey(className, methodName, parameterTypes) {
    return `${className}.${methodName}(${parameterTypes.join(",")})`;
}

function findJavaSignature(javaClass, className, methodName, parameterTypes, mappingKey) {
    assert.ok(Array.isArray(parameterTypes), `${mappingKey} must identify its Java signature by parameter types.`);
    const matches = javaClass.methods.filter((method) => method.name === methodName && sameJavaParameterTypes(method, parameterTypes));
    assert.equal(matches.length, 1, `${mappingKey} must resolve exactly one Java signature: ${javaSignatureKey(className, methodName, parameterTypes)}.`);
    return matches[0];
}

function typeScriptMethodDeclaration(path, className, methodName) {
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const declaration = sourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === className);
    assert.ok(declaration, `Missing TypeScript class ${className}.`);

    const methods = declaration.members.filter((member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === methodName);
    assert.equal(methods.length, 1, `${className}.${methodName} must have exactly one TypeScript implementation.`);
    assert.ok(methods[0].body, `${className}.${methodName} must have an implementation body.`);
    return { sourceFile, method: methods[0] };
}

function typeScriptParameterNames(parameters, mappingKey) {
    return parameters.map((parameter) => {
        assert.ok(ts.isIdentifier(parameter.name), `${mappingKey} must use simple named parameters.`);
        return parameter.name.text;
    });
}

function isJavaFloatParameterNarrowing(statement, parameterName) {
    if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) {
        return false;
    }
    const assignment = statement.expression;
    return (
        assignment.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(assignment.left) &&
        assignment.left.text === parameterName &&
        ts.isCallExpression(assignment.right) &&
        ts.isIdentifier(assignment.right.expression) &&
        assignment.right.expression.text === "javaFloat" &&
        assignment.right.arguments.length === 1 &&
        ts.isIdentifier(assignment.right.arguments[0]) &&
        assignment.right.arguments[0].text === parameterName
    );
}

function assertLeadingJavaFloatNarrowing(method, javaMethod, mappingKey, statementOffset = 0) {
    const floatParameters = javaMethod.params.filter((parameter) => parameter.float);
    assert.ok(floatParameters.length > 0, `${mappingKey} is marked for float narrowing but has no Java float parameters.`);
    for (let index = 0; index < floatParameters.length; index++) {
        const parameterName = floatParameters[index].name;
        assert.ok(
            isJavaFloatParameterNarrowing(method.body.statements[statementOffset + index], parameterName),
            `${mappingKey} must begin with ${parameterName} = javaFloat(${parameterName}); to preserve Java invocation conversion.`
        );
    }
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
            if (typescript.methods.has(method)) {
                continue;
            }
            const mappedMethods = mappedTypeScriptMethods(className, method);
            if (mappedMethods.length > 0) {
                for (const target of mappedMethods) {
                    assert.ok(typescript.methods.has(target), `${className}.${method} maps to missing TypeScript method ${target}.`);
                }
            } else {
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

test("renamed overloads and constructor factories cover every Java signature exactly once", () => {
    const mappedMethods = new Map();
    for (const [key, mapping] of Object.entries(signatureMap.methodMappings)) {
        const [className, tsName] = splitMappingKey(key);
        const javaClass = javaClasses.get(className);
        assert.ok(javaClass, `Mapping ${key} refers to a missing Java class.`);
        assert.equal(mapping.overloadIndex, undefined, `${key} must not depend on Java overload declaration order.`);
        const javaMethod = findJavaSignature(javaClass, className, mapping.javaName, mapping.javaParameterTypes, key);

        const tsPath = join(tsRoot, `${className}.ts`);
        const { method } = typeScriptMethodDeclaration(tsPath, className, tsName);
        assert.deepEqual(
            typeScriptParameterNames(method.parameters, key),
            javaMethod.params.map((parameter) => parameter.name),
            `${key} parameters must retain the corresponding Java names and order.`
        );

        const javaKey = javaSignatureKey(className, mapping.javaName, mapping.javaParameterTypes);
        assert.equal(mappedMethods.has(javaKey), false, `Java overload ${javaKey} is mapped more than once.`);
        mappedMethods.set(javaKey, key);
    }

    for (const [className, javaClass] of javaClasses) {
        if (exceptions.javaOnlyFiles[className]) {
            continue;
        }
        const counts = new Map();
        for (const method of javaClass.methods) {
            if (method.name === "<init>" || method.name === "<static>") {
                continue;
            }
            counts.set(method.name, (counts.get(method.name) ?? 0) + 1);
        }
        for (const method of javaClass.methods) {
            if ((counts.get(method.name) ?? 0) <= 1) {
                continue;
            }
            const parameterTypes = method.params.map((parameter) => parameter.type);
            const javaKey = javaSignatureKey(className, method.name, parameterTypes);
            assert.ok(mappedMethods.has(javaKey), `Java overload ${javaKey} lacks an explicit TypeScript mapping.`);
        }
    }

    const mappedConstructors = new Map();
    for (const [key, mapping] of Object.entries(signatureMap.constructorFactories)) {
        const [className, tsName] = splitMappingKey(key);
        const javaClass = javaClasses.get(className);
        assert.ok(javaClass, `Constructor mapping ${key} refers to a missing Java class.`);
        assert.equal(mapping.overloadIndex, undefined, `${key} must not depend on Java constructor declaration order.`);
        const constructor = findJavaSignature(javaClass, className, "<init>", mapping.javaParameterTypes, key);

        const { method } = typeScriptMethodDeclaration(join(tsRoot, `${className}.ts`), className, tsName);
        assert.deepEqual(
            typeScriptParameterNames(method.parameters, key),
            constructor.params.map((parameter) => parameter.name),
            `${key} parameters must retain the corresponding Java constructor names and order.`
        );

        const javaKey = javaSignatureKey(className, "<init>", mapping.javaParameterTypes);
        assert.equal(mappedConstructors.has(javaKey), false, `Java constructor ${javaKey} is mapped more than once.`);
        mappedConstructors.set(javaKey, key);
    }

    for (const [className, javaClass] of javaClasses) {
        if (exceptions.javaOnlyFiles[className]) {
            continue;
        }
        const constructors = javaClass.methods.filter((method) => method.name === "<init>");
        if (constructors.length <= 1) {
            continue;
        }
        for (const constructor of constructors) {
            const parameterTypes = constructor.params.map((parameter) => parameter.type);
            const javaKey = javaSignatureKey(className, "<init>", parameterTypes);
            assert.ok(mappedConstructors.has(javaKey), `Java constructor ${javaKey} lacks an explicit TypeScript factory mapping.`);
        }
    }
});

test("Java float parameter boundaries survive overload cleanup", () => {
    const mappedFloatBoundaries = new Set(
        Object.entries(signatureMap.methodMappings)
            .filter(([, mapping]) => mapping.narrowFloatParameters === true)
            .map(([key]) => key)
    );
    assert.deepEqual(
        [...mappedFloatBoundaries].sort(),
        [...expectedDispatcherFloatBoundaryMappings].sort(),
        "The signature map must retain every float conversion previously performed by an overload dispatcher."
    );

    for (const [key, mapping] of Object.entries(signatureMap.methodMappings)) {
        if (mapping.narrowFloatParameters !== true) {
            continue;
        }
        const [className, tsName] = splitMappingKey(key);
        const javaClass = javaClasses.get(className);
        assert.ok(javaClass, `Float-boundary mapping ${key} refers to a missing Java class.`);
        const javaMethod = findJavaSignature(javaClass, className, mapping.javaName, mapping.javaParameterTypes, key);
        const { method } = typeScriptMethodDeclaration(join(tsRoot, `${className}.ts`), className, tsName);
        assertLeadingJavaFloatNarrowing(method, javaMethod, key);
    }

    const parachuteClass = javaClasses.get("Parachute");
    assert.ok(parachuteClass, "Missing Java Parachute metadata.");
    const constructor = findJavaSignature(
        parachuteClass,
        "Parachute",
        "<init>",
        ["float", "float", "float", "boolean", "BossHelicopter"],
        "Parachute.constructor"
    );
    const sourcePath = join(tsRoot, "Parachute.ts");
    const source = readFileSync(sourcePath, "utf8");
    const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const declaration = sourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === "Parachute");
    assert.ok(declaration, "Missing TypeScript class Parachute.");
    const implementation = declaration.members.find((member) => ts.isConstructorDeclaration(member) && member.body !== undefined);
    assert.ok(implementation?.body, "Parachute must have an implementation constructor.");
    assertLeadingJavaFloatNarrowing(implementation, constructor, "Parachute.constructor", 1);
});
