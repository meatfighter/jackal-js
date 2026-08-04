import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const javaRoot = "C:/NetBeansProjects/SlickJackal/src/jackal";
const outRoot = "src/jackal";
const appManifestPath = "src/app/ResourceManifest.ts";
const assetRoot = "C:/NetBeansProjects/SlickJackal/src";

const slickImports = [
    "AppGameContainer",
    "ApplicationGameContainer",
    "BasicGame",
    "Color",
    "Cursor",
    "Display",
    "GameContainer",
    "GL11",
    "Graphics",
    "Image",
    "Input",
    "Music",
    "Mouse",
    "ResourceLoader",
    "ScalableGame",
    "SlickException",
    "Sound",
    "SoundStore",
    "Sys",
    "XMLPackedSheet"
];

const runtimeImports = [
    "ArrayList",
    "Arrays",
    "BufferedInputStream",
    "Class",
    "Collections",
    "DataInputStream",
    "HashMap",
    "Integer",
    "JavaString",
    "Point2D",
    "Random",
    "System",
    "java2DArray",
    "java3DArray",
    "java4DArray",
    "javaArray"
];

const primitiveTypes = new Set([
    "boolean",
    "byte",
    "char",
    "double",
    "float",
    "int",
    "long",
    "short",
    "String"
]);

const numericTypes = new Set(["byte", "char", "double", "float", "int", "long", "short"]);
const booleanTypes = new Set(["boolean"]);
const stringTypes = new Set(["String"]);
const reservedWords = new Set([
    "abstract",
    "any",
    "as",
    "async",
    "await",
    "boolean",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "new",
    "null",
    "number",
    "of",
    "private",
    "protected",
    "public",
    "readonly",
    "return",
    "static",
    "string",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "undefined",
    "void",
    "while"
]);

await mkdir(outRoot, { recursive: true });
await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const javaFiles = (await readdir(javaRoot))
    .filter((file) => file.endsWith(".java"))
    .sort();
const classNames = javaFiles.map((file) => path.basename(file, ".java"));
const classNameSet = new Set(classNames);
const sourceByClass = new Map();

for (const file of javaFiles) {
    const className = path.basename(file, ".java");
    sourceByClass.set(className, await readFile(path.join(javaRoot, file), "utf8"));
}

const metadataByClass = new Map();
for (const className of classNames) {
    metadataByClass.set(className, buildMetadata(sourceByClass.get(className), className));
}
const topLevelEnumValueMap = new Map();
for (const [className, metadata] of metadataByClass.entries()) {
    if (metadata.kind === "enum") {
        for (const member of metadata.enumMembers) {
            topLevelEnumValueMap.set(member, className);
        }
    }
}

for (const file of javaFiles) {
    const className = path.basename(file, ".java");
    const source = sourceByClass.get(className);
    const ts = convertJavaFile(source, className);
    await writeFile(path.join(outRoot, `${className}.ts`), ts, "utf8");
}

const indexLines = classNames.map((name) => `export * from "./${name}.js";`);
await writeFile(path.join(outRoot, "index.ts"), `${indexLines.join("\n")}\n`, "utf8");
await writeFile(appManifestPath, buildManifestSource(await collectAssets(assetRoot)), "utf8");

function convertJavaFile(source, className) {
    const importMatches = Array.from(source.matchAll(/^\s*import\s+([^;]+);/gm), (match) => match[1]);
    const javaBody = stripPackageAndImports(source);
    const converted = convertTopLevel(javaBody, className);
    const dependencyImports = buildDependencyImports(converted, className);
    const header = [
        "// @ts-nocheck",
        `// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/${className}.java.`,
        `// Original Java imports: ${importMatches.length ? importMatches.join(", ") : "none"}.`,
        `import { ${slickImports.join(", ")} } from "slick2d-ts";`,
        `import { ${runtimeImports.join(", ")} } from "../java/JavaRuntime.js";`,
        ...dependencyImports,
        ""
    ].join("\n");

    return `${header}${converted.trim()}\n`;
}

function stripPackageAndImports(source) {
    return source
        .replace(/\r\n/g, "\n")
        .replace(/^\s*package\s+jackal;\s*/m, "")
        .replace(/^\s*import\s+[^;]+;\s*/gm, "")
        .replace(/^\s*@Override\s*$/gm, "")
        .replace(/\bthrows\s+[A-Za-z0-9_.,\s]+(?=[{;])/g, "")
        .replace(/\bString\.format\(/g, "JavaString.format(")
        .replace(/\bInteger\.toString\(/g, "Integer.toString(")
        .replace(/\bMain\.class\.getClassLoader\(\)/g, "({ getResourceAsStream: (ref) => ResourceLoader.getResourceAsStream(ref) })")
        .replace(/(\w+)\.printStackTrace\(\);/g, "console.error($1);")
        .replace(/catch\s*\(\s*(?:Throwable|Exception)\s+(\w+)\s*\)/g, "catch ($1)")
        .replace(/new\s+int\s*\[\]\s*\{([^}]*)\}/g, "[$1]")
        .replace(/new\s+float\s*\[\]\s*\{([^}]*)\}/g, "[$1]")
        .replace(/new\s+String\s*\[\]\s*\{([^}]*)\}/g, "[$1]")
        .replace(/new\s+int\s*\[\]\s*\{/g, "[")
        .replace(/new\s+float\s*\[\]\s*\{/g, "[")
        .replace(/new\s+String\s*\[\]\s*\{/g, "[");
}

function convertTopLevel(source, className) {
    const enumOnlyMatch = source.match(/\bpublic\s+enum\s+(\w+)\s*\{([\s\S]*)\}\s*$/m);
    if (enumOnlyMatch && enumOnlyMatch[1] === className) {
        return `export enum ${className} {${enumOnlyMatch[2]}}\n`;
    }

    const interfaceMatch = source.match(/\bpublic\s+interface\s+(\w+)\s*\{([\s\S]*)\}\s*$/m);
    if (interfaceMatch && interfaceMatch[1] === className) {
        return convertInterface(interfaceMatch[2], className);
    }

    let text = source;
    const metadata = metadataByClass.get(className);
    text = sanitizeGenericTypeSpacing(text);
    text = convertNestedEnums(text, className);
    text = collapseSplitFieldInitializers(text);
    text = convertArrayInitializers(text);
    text = replaceAnonymousComparator(text);
    text = convertConstructors(text, className);
    text = convertClassDeclaration(text);
    text = convertMethodDeclarations(text);
    text = convertAbstractMembers(text);
    text = convertFieldDeclarations(text, metadata);
    text = convertArrayAllocations(text);
    text = convertLocalDeclarations(text);
    text = convertCasts(text);
    text = convertJavaTokens(text);
    text = convertDataInputStreamBuffer(text);
    text = renameJavaMainMethod(text, className);
    text = rewriteMemberAccess(text, className);
    text = rewriteQualifiedBackingFieldAccess(text);
    text = collapseDuplicateMethods(text, className);
    return text;
}

function convertInterface(body, className) {
    const hasMethods = /\)\s*;/.test(body);
    if (!hasMethods) {
        const convertedConstants = body.replace(
            /^(\s*)(?:public\s+static\s+final\s+)?([A-Za-z0-9_<>,.\[\]]+)\s+(\w+)\s*(=\s*[^;]+)?;/gm,
            (_match, indentText, javaType, name, initializer) => {
                const value = initializer ? initializer.replace(/^=\s*/, "") : defaultValue(javaType);
                return `${indentText}public static readonly ${name}: ${convertType(javaType)} = ${value};`;
            }
        );
        let text = `export class ${className} {\n${convertedConstants}\n}`;
        text = convertArrayAllocations(text);
        text = convertJavaTokens(text);
        return text;
    }

    const converted = body
        .replace(/^\s*public\s+/gm, "    ")
        .replace(/\bthrows\s+[A-Za-z0-9_.,\s]+(?=;)/g, "")
        .replace(/^\s*(void|boolean|byte|char|double|float|int|long|short|String|[A-Z]\w*(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)\s*;/gm, (_match, returnType, name, params) => {
            return `    ${name}(${convertParams(params)}): ${convertReturnType(returnType)};`;
        });
    return `export interface ${className} {\n${converted.trim()}\n}\n`;
}

function buildMetadata(source, className) {
    const stripped = collapseSplitFieldInitializers(stripPackageAndImportsForMetadata(source));
    const enumMatch = stripped.match(new RegExp(`\\bpublic\\s+enum\\s+${className}\\s*\\{([\\s\\S]*)\\}\\s*$`));
    if (enumMatch) {
        return {
            className,
            kind: "enum",
            parent: null,
            fields: [],
            methods: [],
            nestedEnums: new Map(),
            enumMembers: parseEnumMembers(enumMatch[1])
        };
    }

    const classMatch = stripped.match(new RegExp(`\\bpublic\\s+(?:abstract\\s+|final\\s+)?class\\s+${className}(?:\\s+extends\\s+(\\w+))?`));
    const interfaceMatch = stripped.match(new RegExp(`\\bpublic\\s+interface\\s+${className}`));
    const fields = [];
    const methods = [];
    const nestedEnums = new Map();

    for (const match of stripped.matchAll(/\b(?:public|private|protected)\s+enum\s+(\w+)\s*\{([^}]*)\}/g)) {
        nestedEnums.set(`${className}${match[1]}`, parseEnumMembers(match[2]));
    }

    const fieldRegex = /^[ \t]{0,2}(?:(public|private|protected)\s+)?(static\s+)?(?:final\s+)?([A-Za-z_][A-Za-z0-9_<>,.\[\]\s]*?)\s+(\w+)\s*(?:=|;)/gm;
    for (const match of stripped.matchAll(fieldRegex)) {
        const type = sanitizeTypeForMetadata(match[3]);
        const name = match[4];
        if (!type || type.includes("class") || type.includes("enum") || type.includes("interface") || name === className) {
            continue;
        }
        if (!match[1] && !interfaceMatch) {
            continue;
        }
        fields.push({ name, type, static: Boolean(match[2]) || Boolean(interfaceMatch) });
    }

    const methodRegex = /^[ \t]{0,2}(public|private|protected)\s+(static\s+)?(?:final\s+)?(?:abstract\s+)?([A-Za-z_][A-Za-z0-9_<>,.\[\]\s]*?)\s+(\w+)\s*\(([^)]*)\)/gm;
    for (const match of stripped.matchAll(methodRegex)) {
        const name = match[4];
        if (name === className) {
            continue;
        }
        methods.push({
            name,
            static: Boolean(match[2]),
            params: parseParams(match[5]).map((param) => param.type)
        });
    }

    return {
        className,
        kind: interfaceMatch ? "interface" : "class",
        parent: classMatch?.[1] ?? null,
        fields,
        methods,
        nestedEnums,
        enumMembers: []
    };
}

function stripPackageAndImportsForMetadata(source) {
    return source
        .replace(/\r\n/g, "\n")
        .replace(/^\s*package\s+jackal;\s*/m, "")
        .replace(/^\s*import\s+[^;]+;\s*/gm, "");
}

function sanitizeTypeForMetadata(type) {
    return type.replace(/\s+/g, "").trim();
}

function parseEnumMembers(body) {
    return body
        .split(",")
        .map((part) => part.replace(/\/\/.*$/gm, "").trim())
        .filter(Boolean)
        .map((part) => part.replace(/=.*$/, "").trim())
        .filter((part) => /^[A-Z_][A-Z0-9_]*$/.test(part));
}

function convertNestedEnums(text, className) {
    const nested = [];
    text = text.replace(/\s*(public|private|protected)\s+enum\s+(\w+)\s*\{([^}]*)\}/g, (_match, _access, name, members) => {
        const enumName = `${className}${name}`;
        nested.push(`enum ${enumName} {${members}}`);
        const memberPattern = new RegExp(`\\b${name}\\.`, "g");
        text = text.replace(memberPattern, `${enumName}.`);
        const typePattern = new RegExp(`\\b${name}\\s+(\\w+)`, "g");
        text = text.replace(typePattern, `${enumName} $1`);
        return "";
    });
    if (nested.length === 0) {
        return text;
    }
    return `${nested.join("\n")}\n${text}`;
}

function collapseSplitFieldInitializers(text) {
    return text.replace(
        /^(\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,.\[\]]+\s+\w+)\s*\n\s*=/gm,
        "$1 ="
    );
}

function sanitizeGenericTypeSpacing(text) {
    return text.replace(/<([^>\n]+)>/g, (match) => match.replace(/\s+/g, ""));
}

function convertArrayInitializers(text) {
    let output = "";
    let i = 0;
    while (i < text.length) {
        const start = text.indexOf("= {", i);
        if (start < 0) {
            output += text.slice(i);
            break;
        }
        output += text.slice(i, start) + "= [";
        let depth = 0;
        let j = start + 3;
        for (; j < text.length; j++) {
            const ch = text[j];
            if (ch === "{") {
                depth++;
                output += "[";
            } else if (ch === "}") {
                if (depth === 0) {
                    output += "]";
                    j++;
                    break;
                }
                depth--;
                output += "]";
            } else {
                output += ch;
            }
        }
        i = j;
    }
    return output;
}

function replaceAnonymousComparator(text) {
    return text.replace(
        /Arrays\.sort\(\s*map\s*,\s*new\s+Comparator<int\[\]>\(\)\s*\{\s*public\s+int\s+compare\s*\(\s*int\[\]\s+cell1\s*,\s*int\[\]\s+cell2\s*\)\s*\{\s*return\s+cell1\[0\]\s*-\s*cell2\[0\]\s*;\s*\}\s*\}\s*\);/g,
        "Arrays.sort(map, (cell1: any, cell2: any) => cell1[0] - cell2[0]);"
    );
}

function convertConstructors(text, className) {
    const classDecl = text.match(new RegExp(`\\bpublic\\s+(?:abstract\\s+)?class\\s+${className}\\b([\\s\\S]*?)\\{`));
    const hasExtends = classDecl ? /\bextends\b/.test(classDecl[0]) : false;
    const constructors = findConstructors(text, className);
    if (constructors.length === 0) {
        return text;
    }

    let superCall = hasExtends ? "super();" : "";
    const branches = [];
    for (let index = 0; index < constructors.length; index++) {
        const ctor = constructors[index];
        const params = parseParams(ctor.params);
        let body = ctor.body
            .replace(/^\s*this\s*\(/m, "this.__construct(")
            .replace(/^\s*super\s*\(([^;]*)\);\s*/m, (_match, args) => {
                superCall = `super(${args});`;
                return "";
            });
        body = indent(body.trim(), 12);
        branches.push(buildConstructorBranch(params, body, index));
    }

    let stripped = text;
    for (const ctor of constructors.slice().reverse()) {
        stripped = stripped.slice(0, ctor.start) + stripped.slice(ctor.end);
    }

    const insertAt = stripped.indexOf("{", classDecl?.index ?? 0) + 1;
    const dispatch = [
        "",
        "  public constructor(...args: any[]) {",
        superCall ? `    ${superCall}` : "",
        "    this.__construct(...args);",
        "  }",
        "",
        "  private __construct(...args: any[]): void {",
        branches.join(" else "),
        "    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);",
        "  }",
        ""
    ].filter((line) => line !== "").join("\n");
    return `${stripped.slice(0, insertAt)}${dispatch}${stripped.slice(insertAt)}`;
}

function findConstructors(text, className) {
    const constructors = [];
    const regex = new RegExp(`\\b(public|private|protected)\\s+${className}\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^\\{]+)?\\{`, "gs");
    let match;
    while ((match = regex.exec(text)) !== null) {
        const openBrace = regex.lastIndex - 1;
        const closeBrace = findMatchingBrace(text, openBrace);
        constructors.push({
            start: match.index,
            end: closeBrace + 1,
            params: match[2],
            body: text.slice(openBrace + 1, closeBrace)
        });
        regex.lastIndex = closeBrace + 1;
    }
    return constructors;
}

function buildConstructorBranch(params, body, index) {
    const fixedParams = params.filter((param) => !param.varargs);
    const minimumLength = fixedParams.length;
    const lengthCheck = params.some((param) => param.varargs)
        ? `args.length >= ${minimumLength}`
        : `args.length === ${params.length}`;
    const guards = fixedParams
        .map((param, paramIndex) => primitiveGuard(param.type, paramIndex))
        .filter(Boolean);
    const condition = [lengthCheck, ...guards].join(" && ");
    const declarations = params.map((param, paramIndex) => {
        if (param.varargs) {
            return `let ${param.name} = args.slice(${paramIndex});`;
        }
        return `let ${param.name} = args[${paramIndex}];`;
    });
    return [
        `    if (${condition}) {`,
        ...declarations.map((line) => `        ${line}`),
        body,
        `        return;`,
        `    }`
    ].filter(Boolean).join("\n");
}

function primitiveGuard(type, index) {
    const normalized = normalizeType(type);
    if (numericTypes.has(normalized)) {
        return `typeof args[${index}] === "number"`;
    }
    if (booleanTypes.has(normalized)) {
        return `typeof args[${index}] === "boolean"`;
    }
    if (stringTypes.has(normalized)) {
        return `typeof args[${index}] === "string"`;
    }
    return "";
}

function convertClassDeclaration(text) {
    return text
        .replace(/\bpublic\s+abstract\s+class\s+(\w+)/g, "export abstract class $1")
        .replace(/\bpublic\s+final\s+class\s+(\w+)/g, "export class $1")
        .replace(/\bpublic\s+class\s+(\w+)/g, "export class $1")
        .replace(/\bimplements\s+([^{]+)/g, (_match, impls) => `implements ${impls.replace(/\s+/g, " ").trim()} `);
}

function convertMethodDeclarations(text) {
    return text.replace(
        /\b(public|private|protected)\s+(static\s+)?(final\s+)?(abstract\s+)?([A-Za-z0-9_<>,.\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*(?=[{;])/gs,
        (_match, access, staticPart, _finalPart, abstractPart, returnType, name, params) => {
            const prefix = [access, staticPart?.trim(), abstractPart?.trim()].filter(Boolean).join(" ");
            return `${prefix} ${name}(${convertParams(params)}): ${convertReturnType(returnType)} `;
        }
    );
}

function convertAbstractMembers(text) {
    return text.replace(
        /\bpublic\s+abstract\s+([A-Za-z0-9_<>,.\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*;/g,
        (_match, returnType, name, params) => `public abstract ${name}(${convertParams(params)}): ${convertReturnType(returnType)};`
    );
}

function convertFieldDeclarations(text, metadata) {
    return text.replace(
        /^(\s*)(public|private|protected)\s+(static\s+)?(final\s+)?([A-Za-z0-9_<>,.\[\]]+)\s+(\w+)\s*(=\s*[^;]+)?;/gm,
        (_match, indentText, access, staticPart, finalPart, javaType, name, initializer) => {
            const readonly = finalPart ? " readonly" : "";
            const staticText = staticPart ? " static" : "";
            const value = initializer ? initializer.replace(/^=\s*/, "") : defaultValue(javaType);
            const emittedName = getBackingFieldName(metadata, name, Boolean(staticPart));
            return `${indentText}${access}${staticText}${readonly} ${emittedName}: ${convertType(javaType)} = ${value};`;
        }
    );
}

function convertArrayAllocations(text) {
    let output = text;
    output = output
        .replace(/new\s+int\s*\[stage\.tileMap\.length\]\s*\[stage\.tileMap\[0\]\.length\]/g, "java2DArray(stage.tileMap.length, stage.tileMap[0].length, 0)")
        .replace(/new\s+int\s*\[stage\.typesMap\.length\]\s*\[stage\.typesMap\[0\]\.length\]/g, "java2DArray(stage.typesMap.length, stage.typesMap[0].length, 0)");
    output = output.replace(/new\s+([A-Za-z_]\w*(?:\.\w+)?)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]/g, (_match, type, a, b, c, d) => {
        return `java4DArray(${a}, ${b}, ${c}, ${d}, ${defaultArrayValue(type)})`;
    });
    output = output.replace(/new\s+([A-Za-z_]\w*(?:\.\w+)?)\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]/g, (_match, type, a, b, c) => {
        return `java3DArray(${a}, ${b}, ${c}, ${defaultArrayValue(type)})`;
    });
    output = output.replace(/new\s+([A-Za-z_]\w*(?:\.\w+)?)\s*\[([^\]]+)\]\s*\[([^\]]+)\]/g, (_match, type, a, b) => {
        return `java2DArray(${a}, ${b}, ${defaultArrayValue(type)})`;
    });
    output = output.replace(/new\s+([A-Za-z_]\w*(?:\.\w+)?)\s*\[([^\]]+)\](?:\s*\[\s*\])+/g, (_match, _type, a) => {
        return `javaArray(${a}, null)`;
    });
    output = output.replace(/new\s+([A-Za-z_]\w*(?:\.\w+)?)\s*\[([^\]]+)\]/g, (_match, type, a) => {
        return `javaArray(${a}, ${defaultArrayValue(type)})`;
    });
    return output;
}

function convertLocalDeclarations(text) {
    let output = text;
    output = output.replace(
        /for\s*\(\s*(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*=/g,
        "for(let $2 ="
    );
    output = output.replace(
        /^(\s*)(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n=]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*=/gm,
        (match, indentText, type, name) => {
            if (!isLikelyType(type)) {
                return match;
            }
            return `${indentText}let ${name} =`;
        }
    );
    output = output.replace(
        /^(\s*)(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n=]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*;/gm,
        (match, indentText, type, name) => {
            if (!isLikelyType(type)) {
                return match;
            }
            return `${indentText}let ${name}: any = ${defaultValue(type)};`;
        }
    );
    return output;
}

function convertCasts(text) {
    const javaTypePattern = [
        ...classNames,
        "boolean",
        "byte",
        "char",
        "double",
        "float",
        "int",
        "long",
        "short",
        "String",
        "Image",
        "Music",
        "Sound",
        "Stage",
        "Point2D.Float"
    ].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
    return text.replace(new RegExp(`\\(\\s*(?:${javaTypePattern})(?:\\[\\])*\\s*\\)`, "g"), "");
}

function convertJavaTokens(text) {
    return text
        .replace(/\bnull\b/g, "null")
        .replace(/\btrue\b/g, "true")
        .replace(/\bfalse\b/g, "false")
        .replace(/(\d+(?:\.\d+)?)f\b/g, "$1")
        .replace(/(\d+)L\b/g, "$1")
        .replace(/\.length\(\)/g, ".length")
        .replace(/Math\.toRadians\(([^)]+)\)/g, "(($1) * Math.PI / 180)")
        .replace(/Math\.toDegrees\(([^)]+)\)/g, "(($1) * 180 / Math.PI)")
        .replace(/\bString\[\]\s+args/g, "args: string[]")
        .replace(/\bString\.\s*/g, "JavaString.")
        .replace(/\bMath\.round\(/g, "Math.round(");
}

function convertDataInputStreamBuffer(text) {
    return text.replace(/new\s+DataInputStream\s*\(\s*new\s+BufferedInputStream\s*\(([^)]+)\)\s*\)/g, "new DataInputStream(new BufferedInputStream($1))");
}

function renameJavaMainMethod(text, className) {
    if (className !== "Main") {
        return text;
    }
    return text.replace(/\bpublic\s+static\s+main\s*\(/g, "public static javaMain(");
}

function getBackingFieldName(metadata, name, isStatic) {
    if (!metadata) {
        return name;
    }
    const methodCollision = metadata.methods.some((method) => method.name === name && method.static === isStatic);
    if (!methodCollision) {
        return name;
    }
    const known = new Map([
        ["remove", "removeFlag"],
        ["changeLayer", "changeLayerValue"],
        ["stageCompleted", "stageCompletedFlag"],
        ["stopSong", "stopSongFlag"],
        ["optionSelected", "optionSelectedFlag"],
        ["closeRequested", "closeRequestedFlag"],
        ["main", "mainInstance"]
    ]);
    return known.get(name) ?? `${name}Field`;
}

function rewriteMemberAccess(text, className) {
    const members = collectMembers(className);
    const metadata = metadataByClass.get(className);
    let output = rewriteFieldInitializers(text, className, members);
    output = rewriteStaticBlocks(output, className, members, metadata);
    output = rewriteMethods(output, className, members, metadata);
    return output;
}

function rewriteQualifiedBackingFieldAccess(text) {
    let output = text;
    for (const [className, metadata] of metadataByClass.entries()) {
        for (const field of metadata.fields) {
            const backing = getBackingFieldName(metadata, field.name, field.static);
            if (backing === field.name) {
                continue;
            }
            const regex = new RegExp(`\\b${escapeRegExp(className)}\\.${escapeRegExp(field.name)}\\b`, "g");
            output = output.replace(regex, `${className}.${backing}`);
            if (!field.static && field.name !== "main") {
                const propertyRegex = new RegExp(`\\.${escapeRegExp(field.name)}\\b(?!\\s*\\()`, "g");
                output = output.replace(propertyRegex, `.${backing}`);
            }
        }
    }
    return output;
}

function collectMembers(className, visited = new Set()) {
    if (visited.has(className)) {
        return emptyMembers();
    }
    visited.add(className);
    const metadata = metadataByClass.get(className);
    if (!metadata) {
        return emptyMembers();
    }
    const parentMembers = metadata.parent ? collectMembers(metadata.parent, visited) : emptyMembers();
    const members = {
        instanceFields: new Map(parentMembers.instanceFields),
        staticFields: new Map(parentMembers.staticFields),
        instanceMethods: new Map(parentMembers.instanceMethods),
        staticMethods: new Map(parentMembers.staticMethods),
        nestedEnumValues: new Map(parentMembers.nestedEnumValues)
    };
    for (const field of metadata.fields) {
        const backing = getBackingFieldName(metadata, field.name, field.static);
        if (field.static) {
            members.staticFields.set(field.name, backing);
        } else {
            members.instanceFields.set(field.name, backing);
        }
    }
    for (const method of metadata.methods) {
        if (method.name === "main" && className === "Main" && method.static) {
            members.staticMethods.set("main", "javaMain");
        } else if (method.static) {
            members.staticMethods.set(method.name, method.name);
        } else {
            members.instanceMethods.set(method.name, method.name);
        }
    }
    for (const [enumName, values] of metadata.nestedEnums.entries()) {
        for (const value of values) {
            members.nestedEnumValues.set(value, enumName);
        }
    }
    return members;
}

function emptyMembers() {
    return {
        instanceFields: new Map(),
        staticFields: new Map(),
        instanceMethods: new Map(),
        staticMethods: new Map(),
        nestedEnumValues: new Map()
    };
}

function rewriteFieldInitializers(text, className, members) {
    return text.replace(
        /^(\s*(?:public|private|protected)\s+(?:static\s+)?(?:readonly\s+)?\w+\s*:[^=]+?=\s*)([^;]+);/gm,
        (match, prefix, initializer) => {
            const isStatic = /\sstatic\s/.test(prefix);
            return `${prefix}${replaceIdentifiers(initializer, new Set(), className, members, isStatic)};`;
        }
    );
}

function rewriteStaticBlocks(text, className, members, metadata) {
    let result = "";
    let cursor = 0;
    const regex = /\bstatic\s*\{/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const openBrace = regex.lastIndex - 1;
        const closeBrace = findMatchingBrace(text, openBrace);
        const body = text.slice(openBrace + 1, closeBrace);
        const locals = collectLocalNames(body, "");
        result += text.slice(cursor, openBrace + 1);
        result += replaceIdentifiers(body, locals, className, members, true, metadata);
        cursor = closeBrace;
        regex.lastIndex = closeBrace + 1;
    }
    result += text.slice(cursor);
    return result;
}

function rewriteMethods(text, className, members, metadata) {
    let result = "";
    let cursor = 0;
    const regex = /\b(public|private|protected)\s+(static\s+)?(?:constructor|[\w$]+)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?\s*\{/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const openBrace = regex.lastIndex - 1;
        const closeBrace = findMatchingBrace(text, openBrace);
        const signature = text.slice(match.index, openBrace + 1);
        const body = text.slice(openBrace + 1, closeBrace);
        const isStatic = Boolean(match[2]);
        const locals = collectLocalNames(body, match[3]);
        result += text.slice(cursor, openBrace + 1);
        result += replaceIdentifiers(body, locals, className, members, isStatic, metadata);
        cursor = closeBrace;
        regex.lastIndex = closeBrace + 1;
        void signature;
    }
    result += text.slice(cursor);
    return result;
}

function collectLocalNames(body, params) {
    const names = new Set();
    for (const param of params.split(",")) {
        const name = param.trim().match(/(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*:/)?.[1];
        if (name) {
            names.add(name);
        }
    }
    for (const match of body.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)) {
        names.add(match[1]);
    }
    for (const match of body.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) {
        names.add(match[1]);
    }
    return names;
}

function replaceIdentifiers(source, locals, className, members, isStaticContext, metadata) {
    let result = "";
    let index = 0;
    while (index < source.length) {
        const ch = source[index];
        if (ch === "\"" || ch === "'" || ch === "`") {
            const end = readStringLike(source, index, ch);
            result += source.slice(index, end);
            index = end;
            continue;
        }
        if (ch === "/" && source[index + 1] === "/") {
            const end = source.indexOf("\n", index);
            const next = end < 0 ? source.length : end;
            result += source.slice(index, next);
            index = next;
            continue;
        }
        if (ch === "/" && source[index + 1] === "*") {
            const end = source.indexOf("*/", index + 2);
            const next = end < 0 ? source.length : end + 2;
            result += source.slice(index, next);
            index = next;
            continue;
        }
        if (isIdentifierStart(ch)) {
            const start = index;
            index++;
            while (index < source.length && isIdentifierPart(source[index])) {
                index++;
            }
            const token = source.slice(start, index);
            result += replacementForToken(source, start, index, token, locals, className, members, isStaticContext, metadata);
            continue;
        }
        result += ch;
        index++;
    }
    return result;
}

function replacementForToken(source, start, end, token, locals, className, members, isStaticContext, metadata) {
    if (shouldNeverRewrite(token) || locals.has(token)) {
        return token;
    }
    const previous = previousNonWhitespace(source, start);
    if (previous === "." || previous === "\"" || previous === "'") {
        return token;
    }
    const next = nextNonWhitespace(source, end);
    const isCall = next === "(";

    const nestedEnum = members.nestedEnumValues.get(token);
    if (nestedEnum) {
        return `${nestedEnum}.${token}`;
    }
    const topLevelEnum = topLevelEnumValueMap.get(token);
    if (topLevelEnum) {
        return `${topLevelEnum}.${token}`;
    }

    if (members.staticFields.has(token) && (!isCall || !members.staticMethods.has(token))) {
        return `${className}.${members.staticFields.get(token)}`;
    }
    if (members.staticMethods.has(token) && isCall) {
        return `${className}.${members.staticMethods.get(token)}`;
    }
    if (!isStaticContext) {
        if (members.instanceFields.has(token) && (!isCall || !members.instanceMethods.has(token))) {
            return `this.${members.instanceFields.get(token)}`;
        }
        if (members.instanceMethods.has(token) && isCall) {
            return `this.${members.instanceMethods.get(token)}`;
        }
    }
    void metadata;
    return token;
}

function shouldNeverRewrite(token) {
    return reservedWords.has(token)
        || classNameSet.has(token)
        || slickImports.includes(token)
        || runtimeImports.includes(token)
        || token === "console"
        || token === "Error"
        || token === "Array"
        || token === "Math"
        || token === "Date"
        || token === "Number"
        || token === "String"
        || token === "Boolean"
        || token === "BigInt"
        || token === "ResourceLoader";
}

function previousNonWhitespace(source, index) {
    for (let i = index - 1; i >= 0; i--) {
        if (!/\s/.test(source[i])) {
            return source[i];
        }
    }
    return "";
}

function nextNonWhitespace(source, index) {
    for (let i = index; i < source.length; i++) {
        if (!/\s/.test(source[i])) {
            return source[i];
        }
    }
    return "";
}

function readStringLike(source, start, quote) {
    let escaped = false;
    for (let i = start + 1; i < source.length; i++) {
        const ch = source[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === "\\") {
            escaped = true;
            continue;
        }
        if (ch === quote) {
            return i + 1;
        }
    }
    return source.length;
}

function isIdentifierStart(ch) {
    return /[A-Za-z_$]/.test(ch);
}

function isIdentifierPart(ch) {
    return /[A-Za-z0-9_$]/.test(ch);
}

function collapseDuplicateMethods(text, className) {
    const methods = findTsMethods(text);
    const groups = new Map();
    for (const method of methods) {
        if (method.name === "constructor" || method.name === "__construct") {
            continue;
        }
        const key = `${method.static ? "static:" : "instance:"}${method.name}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(method);
    }

    const duplicateGroups = Array.from(groups.values()).filter((group) => group.length > 1);
    if (duplicateGroups.length === 0) {
        return text;
    }

    const duplicateMethods = new Map();
    const dispatcherByStart = new Map();
    for (const group of duplicateGroups) {
        const sortedGroup = [...group].sort((a, b) => a.start - b.start);
        const metadata = metadataByClass.get(className);
        const overloadMetadata = metadata?.methods.filter((method) => method.name === sortedGroup[0].name && method.static === sortedGroup[0].static) ?? [];
        dispatcherByStart.set(sortedGroup[0].start, buildMethodDispatcher(sortedGroup, overloadMetadata, className));
        for (let i = 0; i < sortedGroup.length; i++) {
            const method = sortedGroup[i];
            const renamed = method.source.replace(
                new RegExp(`\\b${escapeRegExp(method.name)}\\s*\\(`),
                `${method.name}__overload${i}(`
            );
            duplicateMethods.set(method.start, { ...method, source: renamed });
        }
    }

    let output = "";
    let cursor = 0;
    const sortedMethods = Array.from(duplicateMethods.values()).sort((a, b) => a.start - b.start);
    for (const method of sortedMethods) {
        output += text.slice(cursor, method.start);
        const dispatcher = dispatcherByStart.get(method.start);
        if (dispatcher) {
            output += dispatcher;
        }
        output += method.source;
        cursor = method.end;
    }
    output += text.slice(cursor);
    return output;
}

function findTsMethods(text) {
    const methods = [];
    const regex = /\b(public|private|protected)\s+(static\s+)?([\w$]+|constructor)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*\{/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const openBrace = regex.lastIndex - 1;
        const closeBrace = findMatchingBrace(text, openBrace);
        methods.push({
            start: match.index,
            end: closeBrace + 1,
            access: match[1],
            static: Boolean(match[2]),
            name: match[3],
            params: match[4],
            returnType: match[5]?.trim() ?? "void",
            source: text.slice(match.index, closeBrace + 1)
        });
        regex.lastIndex = closeBrace + 1;
    }
    return methods;
}

function buildMethodDispatcher(group, overloadMetadata, className) {
    const first = group[0];
    const staticText = first.static ? " static" : "";
    const receiver = first.static ? className : "this";
    const lines = [
        `  ${first.access}${staticText} ${first.name}(...args: any[]): any {`
    ];
    for (let i = 0; i < group.length; i++) {
        const method = group[i];
        const params = splitTopLevel(method.params, ",").filter((param) => param.trim().length > 0);
        const metaParams = overloadMetadata[i]?.params ?? [];
        const guards = buildOverloadGuards(metaParams);
        const condition = [`args.length === ${params.length}`, ...guards].join(" && ");
        const callArgs = params.map((_param, index) => `args[${index}]`).join(", ");
        lines.push(`    if (${condition}) {`);
        lines.push(`      return ${receiver}.${first.name}__overload${i}(${callArgs});`);
        lines.push("    }");
    }
    lines.push(`    throw new Error(\`No Java method overload matched ${first.name}: \${args.length}\`);`);
    lines.push("  }");
    lines.push("");
    return `${lines.join("\n")}`;
}

function buildOverloadGuards(types) {
    return types.map((type, index) => {
        const normalized = normalizeType(type);
        if (numericTypes.has(normalized)) {
            return `typeof args[${index}] === "number"`;
        }
        if (normalized === "boolean") {
            return `typeof args[${index}] === "boolean"`;
        }
        if (normalized === "String") {
            return `typeof args[${index}] === "string"`;
        }
        if (normalized.endsWith("[]")) {
            return `Array.isArray(args[${index}])`;
        }
        const bare = normalized.replace(/<.*>/g, "");
        if (classNameSet.has(bare) || slickImports.includes(bare)) {
            return `(args[${index}] === null || args[${index}] instanceof ${bare})`;
        }
        return "";
    }).filter(Boolean);
}

function convertParams(params) {
    const parsed = parseParams(params);
    return parsed.map((param) => {
        if (param.varargs) {
            return `...${param.name}: any[]`;
        }
        return `${param.name}: any`;
    }).join(", ");
}

function parseParams(params) {
    const trimmed = params.trim();
    if (!trimmed) {
        return [];
    }
    return splitTopLevel(trimmed, ",").map((param) => {
        const clean = param.trim().replace(/\bfinal\s+/g, "");
        const varargs = clean.includes("...");
        const parts = clean.replace("...", " ... ").trim().split(/\s+/);
        const name = parts[parts.length - 1];
        const type = parts.slice(0, -1).join(" ").replace(/\s+\.\.\.\s*$/, "");
        return {
            type: type.replace("...", "").trim(),
            name,
            varargs
        };
    });
}

function splitTopLevel(text, delimiter) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === "<" || ch === "(" || ch === "[") {
            depth++;
        } else if (ch === ">" || ch === ")" || ch === "]") {
            depth--;
        } else if (ch === delimiter && depth === 0) {
            parts.push(text.slice(start, i));
            start = i + 1;
        }
    }
    parts.push(text.slice(start));
    return parts;
}

function convertReturnType(returnType) {
    const type = normalizeType(returnType);
    if (type === "void") {
        return "void";
    }
    if (type === "boolean") {
        return "boolean";
    }
    if (numericTypes.has(type)) {
        return "number";
    }
    if (type === "String") {
        return "string";
    }
    return "any";
}

function convertType(javaType) {
    const type = normalizeType(javaType);
    if (type.endsWith("[]")) {
        return "any[]";
    }
    if (numericTypes.has(type)) {
        return "number";
    }
    if (type === "boolean") {
        return "boolean";
    }
    if (type === "String") {
        return "string";
    }
    return "any";
}

function defaultValue(javaType) {
    const type = normalizeType(javaType);
    if (type.endsWith("[]")) {
        return "null as any";
    }
    if (numericTypes.has(type)) {
        return "0";
    }
    if (type === "boolean") {
        return "false";
    }
    return "null as any";
}

function defaultArrayValue(javaType) {
    const type = normalizeType(javaType);
    if (numericTypes.has(type)) {
        return type === "long" ? "0n" : "0";
    }
    if (type === "boolean") {
        return "false";
    }
    return "null";
}

function normalizeType(type) {
    return String(type)
        .trim()
        .replace(/\s+/g, "")
        .replace(/<.*>/g, "")
        .replace(/\[\s*\]/g, "[]");
}

function isLikelyType(type) {
    const normalized = normalizeType(type);
    return primitiveTypes.has(normalized)
        || normalized.endsWith("[]")
        || classNameSet.has(normalized)
        || slickImports.includes(normalized)
        || runtimeImports.includes(normalized)
        || /^[A-Z]\w*(?:\.\w+)?$/.test(normalized);
}

function findMatchingBrace(text, openIndex) {
    let depth = 0;
    let stringQuote = "";
    let escaped = false;
    for (let i = openIndex; i < text.length; i++) {
        const ch = text[i];
        if (stringQuote) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === stringQuote) {
                stringQuote = "";
            }
            continue;
        }
        if (ch === "\"" || ch === "'") {
            stringQuote = ch;
            continue;
        }
        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    throw new Error(`No matching brace after ${openIndex}`);
}

function buildDependencyImports(text, className) {
    const imports = [];
    for (const name of classNames) {
        if (name === className) {
            continue;
        }
        const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
        if (pattern.test(text)) {
            imports.push(`import { ${name} } from "./${name}.js";`);
        }
    }
    return imports;
}

function indent(text, spaces) {
    if (!text) {
        return "";
    }
    const pad = " ".repeat(spaces);
    return text.split("\n").map((line) => line.trim() ? `${pad}${line}` : line).join("\n");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function collectAssets(root) {
    const assets = [];
    await walk(root, assets);
    return assets
        .filter((file) => !file.endsWith(".java"))
        .map((file) => file.replaceAll("\\", "/").replace(root.replaceAll("\\", "/") + "/", ""))
        .sort();
}

async function walk(dir, out) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(full, out);
        } else if (entry.isFile()) {
            out.push(full);
        }
    }
}

function buildManifestSource(assets) {
    const lines = assets.map((asset) => `    ${JSON.stringify(asset)}`);
    return `export const RESOURCE_MANIFEST: string[] = [\n${lines.join(",\n")}\n];\n`;
}
