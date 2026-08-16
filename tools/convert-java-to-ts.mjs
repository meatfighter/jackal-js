import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.env.SLICKJACKAL_JAVA_SOURCE_ROOT ?? "desktop/src";
const javaRoot = path.join(sourceRoot, "jackal");
const outRoot = "src/jackal";
const appManifestPath = "src/app/ResourceManifest.ts";
const assetRoot = sourceRoot;

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
    "Log",
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
    "Character",
    "Class",
    "Collections",
    "DataInputStream",
    "HashMap",
    "Integer",
    "JAVA_LONG_LOW_3_BITS",
    "JAVA_LONG_PACKED_3BIT_SHIFTS",
    "JavaString",
    "Point2D",
    "Random",
    "System",
    "java2DArray",
    "java3DArray",
    "java4DArray",
    "javaArray",
    "javaByte",
    "javaChar",
    "javaDouble",
    "javaFloat",
    "javaInt",
    "javaIntDiv",
    "javaLong",
    "javaRoundFloat",
    "javaShort",
    "rotatePoint"
];

const mainConstantNames = new Set([
    "DISPLAY_WIDTH",
    "DISPLAY_HEIGHT",
    "FONT_WHITE",
    "FONT_GRAY",
    "FONT_ORANGE",
    "FONT_ORANGE_GRAY",
    "ISQRT2",
    "I_QUARTER_WIDTH",
    "I_WIDTH",
    "MINIMUM_SOUND_TIME",
    "CHARS",
    "TILES"
]);

const primitiveTypes = new Set(["boolean", "byte", "char", "double", "float", "int", "long", "short", "String"]);

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

const javaFiles = (await readdir(javaRoot)).filter((file) => file.endsWith(".java")).sort();
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
    const javaBody = stripPackageAndImports(source);
    const converted = convertTopLevel(javaBody, className);
    const dependencyImports = buildDependencyImports(converted, className);
    const header = [
        "// @ts-nocheck",
        `import { ${slickImports.join(", ")} } from "slick2d-ts";`,
        `import { ${runtimeImports.join(", ")} } from "../java/JavaRuntime.js";`,
        ...dependencyImports,
        ""
    ].join("\n");

    return normalizeBlankLines(`${header}${converted.trim()}\n`);
}

function normalizeBlankLines(source) {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const normalized = [];
    let previousBlank = false;
    for (const line of lines) {
        const trimmedLine = line.trimEnd();
        const blank = trimmedLine.length === 0;
        if (blank) {
            if (!previousBlank) {
                normalized.push("");
            }
        } else {
            normalized.push(trimmedLine);
        }
        previousBlank = blank;
    }
    return normalized.join("\n");
}

function stripPackageAndImports(source) {
    return source
        .replace(/\r\n/g, "\n")
        .replace(/^\s*package\s+jackal;\s*/m, "")
        .replace(/^\s*import\s+[^;]+;\s*/gm, "")
        .replace(/^\s*@Override\s*$/gm, "")
        .replace(/\bthrows\s+[A-Za-z0-9_.,\s]+(?=[{;])/g, "")
        .replace(/\bString\.format\(/g, "JavaString.format(")
        .replace(/\bString\.valueOf\(/g, "JavaString.valueOf(")
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
    text = rewriteQualifiedNestedEnumReferences(text);
    text = collapseSplitFieldInitializers(text);
    text = convertArrayInitializers(text);
    text = replaceAnonymousComparator(text);
    text = convertConstructors(text, className);
    text = convertClassDeclaration(text);
    text = convertMethodDeclarations(text);
    text = convertAbstractMembers(text);
    text = convertFieldDeclarations(text, metadata, className);
    text = convertArrayAllocations(text);
    text = convertLocalDeclarations(text);
    text = convertCasts(text);
    text = convertJavaTokens(text);
    text = convertDataInputStreamBuffer(text);
    text = renameJavaMainMethod(text, className);
    text = rewriteMemberAccess(text, className);
    text = rewriteQualifiedNestedEnumFieldValues(text, className);
    text = rewriteQualifiedBackingFieldAccess(text);
    text = rewriteMainStaticUtilityAccess(text, className);
    text = applyGameElementFieldDefaultSemantics(text, className);
    text = collapseDuplicateMethods(text, className);
    text = rewriteKnownPackedDirectionLongAccess(text);
    text = rewriteKnownJavaIntDivision(text);
    text = rewriteKnownJavaCharArithmetic(text);
    text = rewriteKnownJavaFloatRound(text);
    return text;
}

function rewriteKnownPackedDirectionLongAccess(text) {
    return text
        .replace(/\blet index = i \/ 21;/g, "let index = (i / 21) | 0;")
        .replace(/\blet shift = 3 \* \(i % 21\);/g, "let shift = JAVA_LONG_PACKED_3BIT_SHIFTS[i % 21];")
        .replace(/javaInt\(\(\(this\.directions\[index\] >> shift\) & 7\)\)/g, "Number((this.directions[index] >> shift) & JAVA_LONG_LOW_3_BITS)")
        .replace(/\(\(this\.directions\[index\] >> shift\) & 7\)/g, "((this.directions[index] >> shift) & JAVA_LONG_LOW_3_BITS)");
}

function rewriteKnownJavaIntDivision(text) {
    return text
        .replace(
            /public static readonly HALF_TIME: number = Bomb\.TRAVEL_TIME \/ 2;/g,
            "public static readonly HALF_TIME: number = javaIntDiv(Bomb.TRAVEL_TIME, 2);"
        )
        .replace(
            /public static readonly HALF_TIME: number = Grenade\.TRAVEL_TIME \/ 2;/g,
            "public static readonly HALF_TIME: number = javaIntDiv(Grenade.TRAVEL_TIME, 2);"
        )
        .replace(/let HALF_TIME = BossHelicopter\.POSITION_DRIFT_TIME \/ 2;/g, "let HALF_TIME = javaIntDiv(BossHelicopter.POSITION_DRIFT_TIME, 2);")
        .replace(
            /public static readonly PERIOD0: number = TravelingExplosion\.TRAVEL_TIME \/ 3;/g,
            "public static readonly PERIOD0: number = javaIntDiv(TravelingExplosion.TRAVEL_TIME, 3);"
        )
        .replace(
            /public static readonly PERIOD1: number = 2 \* TravelingExplosion\.TRAVEL_TIME \/ 3;/g,
            "public static readonly PERIOD1: number = javaIntDiv(2 * TravelingExplosion.TRAVEL_TIME, 3);"
        )
        .replace(/new Color\(0, 0, 0, 255 \* i \/ \(Main\.FADES\.length - 1\)\)/g, "new Color(0, 0, 0, javaIntDiv(255 * i, Main.FADES.length - 1))")
        .replace(
            /\(\(before - 20000\) \/ 50000 != \(this\.score - 20000\) \/ 50000\)/g,
            "(javaIntDiv(before - 20000, 50000) != javaIntDiv(this.score - 20000, 50000))"
        );
}

function rewriteKnownJavaCharArithmetic(text) {
    return text
        .replace(
            /for\(let i = 0; i < digits; i\+\+, x -= 32, value \/= 10\) \{\n\s*font\['0' \+ \(value % 10\)\]\.draw\(x, y\);/g,
            "for(let i = 0; i < digits; i++, x -= 32, value = javaIntDiv(value, 10)) {\n      font[String.fromCharCode('0'.charCodeAt(0) + Math.trunc(value % 10))].draw(x, y);"
        )
        .replace("case '@':\n        return \"copyright\";", "case '@':\n      case '\\u00a9':\n        return \"copyright\";");
}

function rewriteKnownJavaFloatRound(text) {
    return text
        .replace(/javaInt\(Math\.round\(d \/ BossBlueTank\.SPEED\)\)/g, "javaRoundFloat(d / BossBlueTank.SPEED)")
        .replace(/javaInt\(Math\.round\(d \/ BrownTank\.SPEED\)\)/g, "javaRoundFloat(d / BrownTank.SPEED)")
        .replace(/javaInt\(Math\.round\(d \/ FireTank\.SPEED\)\)/g, "javaRoundFloat(d / FireTank.SPEED)")
        .replace(/javaInt\(Math\.round\(d \/ GrayJeep\.SPEED\)\)/g, "javaRoundFloat(d / GrayJeep.SPEED)")
        .replace(/javaInt\(Math\.round\(d \/ GrayTank\.SPEED\)\)/g, "javaRoundFloat(d / GrayTank.SPEED)")
        .replace(/javaInt\(Math\.round\(angle \/ 45\)\)/g, "javaRoundFloat(angle / 45)")
        .replace(/Math\.round\(ang \/ 45\)/g, "javaRoundFloat(ang / 45)");
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
        .replace(
            /^\s*(void|boolean|byte|char|double|float|int|long|short|String|[A-Z]\w*(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)\s*;/gm,
            (_match, returnType, name, params) => {
                return `    ${name}(${convertParams(params)}): ${convertReturnType(returnType)};`;
            }
        );
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

    const methodRegex =
        /^[ \t]{0,2}(public|private|protected)\s+(static\s+)?(?:final\s+)?(?:abstract\s+)?([A-Za-z_][A-Za-z0-9_<>,.\[\]\s]*?)\s+(\w+)\s*\(([^)]*)\)/gm;
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
    const replacements = [];
    const withoutNestedEnums = text.replace(/\s*(public|private|protected)\s+enum\s+(\w+)\s*\{([^}]*)\}/g, (_match, _access, name, members) => {
        const enumName = `${className}${name}`;
        nested.push(`export enum ${enumName} {${members}}`);
        replacements.push({ name, enumName });
        return "";
    });
    if (nested.length === 0) {
        return text;
    }
    let converted = withoutNestedEnums;
    for (const replacement of replacements) {
        const memberPattern = new RegExp(`(^|[^.\\w$])${escapeRegExp(replacement.name)}\\.`, "g");
        converted = converted.replace(memberPattern, `$1${replacement.enumName}.`);
        const typePattern = new RegExp(`(^|[^.\\w$])${escapeRegExp(replacement.name)}\\s+(\\w+)`, "g");
        converted = converted.replace(typePattern, `$1${replacement.enumName} $2`);
    }
    return `${nested.join("\n")}\n${converted}`;
}

function rewriteQualifiedNestedEnumReferences(text) {
    let output = text;
    for (const [ownerClassName, metadata] of metadataByClass.entries()) {
        for (const enumName of metadata.nestedEnums.keys()) {
            const simpleName = enumName.startsWith(ownerClassName) ? enumName.slice(ownerClassName.length) : enumName;
            if (!simpleName) {
                continue;
            }
            const pattern = new RegExp(`\\b${escapeRegExp(ownerClassName)}\\.${escapeRegExp(simpleName)}\\b`, "g");
            output = output.replace(pattern, enumName);
        }
    }
    return output;
}

function rewriteQualifiedNestedEnumFieldValues(text, className) {
    const metadata = metadataByClass.get(className);
    if (!metadata) {
        return text;
    }
    let output = text;
    for (const field of metadata.fields) {
        const qualifiedEnum = normalizeType(field.type).match(/^(\w+)\.(\w+)$/);
        if (!qualifiedEnum) {
            continue;
        }
        const ownerClassName = qualifiedEnum[1];
        const simpleName = qualifiedEnum[2];
        const ownerMetadata = metadataByClass.get(ownerClassName);
        const targetEnumName = `${ownerClassName}${simpleName}`;
        const localEnumName = `${className}${simpleName}`;
        const values = ownerMetadata?.nestedEnums.get(targetEnumName);
        if (!values || !metadata.nestedEnums.has(localEnumName) || targetEnumName === localEnumName) {
            continue;
        }
        for (const value of values) {
            const pattern = new RegExp(`\\b${escapeRegExp(localEnumName)}\\.${escapeRegExp(value)}\\b`, "g");
            output = output.replace(pattern, `${targetEnumName}.${value}`);
        }
    }
    return output;
}

function collapseSplitFieldInitializers(text) {
    return text.replace(/^(\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?[A-Za-z0-9_<>,.\[\]]+\s+\w+)\s*\n\s*=/gm, "$1 =");
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

    const helperName = constructorHelperName(className);
    let superCall = hasExtends ? "super();" : "";
    const branches = [];
    const constructorParamLists = constructors.map((ctor) => parseParams(ctor.params));
    const maxArity = constructorParamLists.reduce((max, params) => {
        const fixedCount = params.filter((param) => !param.varargs).length;
        if (params.some((param) => param.varargs)) {
            return Math.max(max, findMaxConstructorCallArity(className), fixedCount);
        }
        return Math.max(max, fixedCount);
    }, 0);
    const argNames = Array.from({ length: maxArity }, (_value, index) => `arg${index}`);
    const signatureParams = argNames.map((name) => `${name}?: any`).join(", ");
    const helperParams = ["argCount: number", ...argNames.map((name) => `${name}?: any`)].join(", ");
    const helperArgs = ["argCount", ...argNames].join(", ");
    for (let index = 0; index < constructors.length; index++) {
        const ctor = constructors[index];
        const params = constructorParamLists[index];
        let body = ctor.body
            .replace(/^(\s*)this\s*\(([^;]*)\);/m, (_match, leadingWhitespace, args) => {
                const trimmedArgs = args.trim();
                const delegatedArity = trimmedArgs === "" ? 0 : splitTopLevel(trimmedArgs, ",").filter((arg) => arg.trim().length > 0).length;
                const delegatedArgs = trimmedArgs === "" ? "" : `, ${trimmedArgs}`;
                return `${leadingWhitespace}this.${helperName}(${delegatedArity}${delegatedArgs});`;
            })
            .replace(/^\s*super\s*\(([^;]*)\);\s*/m, (_match, args) => {
                superCall = `super(${args});`;
                return "";
            });
        body = indent(body.trim(), 12);
        branches.push(buildConstructorBranch(params, body, index, argNames));
    }

    let stripped = text;
    for (const ctor of constructors.slice().reverse()) {
        stripped = stripped.slice(0, ctor.start) + stripped.slice(ctor.end);
    }

    const insertAt = stripped.indexOf("{", classDecl?.index ?? 0) + 1;
    const dispatch = [
        "",
        `  public constructor(${signatureParams}) {`,
        superCall ? `    ${superCall}` : "",
        "    const argCount = arguments.length;",
        `    this.${helperName}(${helperArgs});`,
        "  }",
        "",
        `  private ${helperName}(${helperParams}): void {`,
        branches.join(" else "),
        "    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);",
        "  }",
        ""
    ]
        .filter((line) => line !== "")
        .join("\n");
    return `${stripped.slice(0, insertAt)}${dispatch}${stripped.slice(insertAt)}`;
}

function constructorHelperName(className) {
    return `__construct_${className}`;
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

function findMaxConstructorCallArity(className) {
    let maxArity = 0;
    const pattern = new RegExp(`\\bnew\\s+${escapeRegExp(className)}\\s*\\(`, "g");
    for (const source of sourceByClass.values()) {
        let match;
        while ((match = pattern.exec(source)) !== null) {
            const openParen = source.indexOf("(", match.index);
            const closeParen = findMatchingParen(source, openParen);
            const args = source.slice(openParen + 1, closeParen).trim();
            const arity = args === "" ? 0 : splitTopLevel(args, ",").filter((arg) => arg.trim().length > 0).length;
            maxArity = Math.max(maxArity, arity);
            pattern.lastIndex = closeParen + 1;
        }
    }
    return maxArity;
}

function buildConstructorBranch(params, body, index, argNames) {
    const fixedParams = params.filter((param) => !param.varargs);
    const minimumLength = fixedParams.length;
    const lengthCheck = params.some((param) => param.varargs) ? `argCount >= ${minimumLength}` : `argCount === ${params.length}`;
    const guards = fixedParams.map((param, paramIndex) => primitiveGuard(param.type, argNames[paramIndex] ?? `arguments[${paramIndex + 1}]`)).filter(Boolean);
    const condition = [lengthCheck, ...guards].join(" && ");
    const declarations = params.map((param, paramIndex) => {
        if (param.varargs) {
            const values = argNames.slice(paramIndex).join(", ");
            return `let ${param.name} = [${values}].slice(0, Math.max(0, argCount - ${paramIndex}));`;
        }
        return `let ${param.name} = ${argNames[paramIndex]};`;
    });
    return [`    if (${condition}) {`, ...declarations.map((line) => `        ${line}`), body, `        return;`, `    }`].filter(Boolean).join("\n");
}

function primitiveGuard(type, argExpression) {
    const normalized = normalizeType(type);
    if (numericTypes.has(normalized)) {
        return `typeof ${argExpression} === "number"`;
    }
    if (booleanTypes.has(normalized)) {
        return `typeof ${argExpression} === "boolean"`;
    }
    if (stringTypes.has(normalized)) {
        return `(${argExpression} === null || typeof ${argExpression} === "string")`;
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

function convertFieldDeclarations(text, metadata, className) {
    const omitGameElementSubclassDefault = isGameElementDescendant(className);
    return text.replace(
        /^(\s*)(public|private|protected)\s+(static\s+)?(final\s+)?([A-Za-z0-9_<>,.\[\]]+)\s+(\w+)\s*(=\s*[^;]+)?;/gm,
        (_match, indentText, access, staticPart, finalPart, javaType, name, initializer) => {
            const readonly = finalPart ? " readonly" : "";
            const staticText = staticPart ? " static" : "";
            if (!staticPart && !initializer && omitGameElementSubclassDefault) {
                return "";
            }
            const value = initializer ? initializer.replace(/^=\s*/, "") : defaultValue(javaType);
            const emittedName = getBackingFieldName(metadata, name, Boolean(staticPart));
            return `${indentText}${access}${staticText}${readonly} ${emittedName}: ${convertType(javaType)} = ${value};`;
        }
    );
}

function applyGameElementFieldDefaultSemantics(text, className) {
    if (className === "GameElement") {
        text = insertClassMember(text, className, ["", "  protected __initializeJavaSubclassDefaults(): void {", "  }", ""].join("\n"));
        return text.replace(
            /(\s*this\.gameMode = Main\.gameMode;\s*\n)(\s*this\.init\(\);)/,
            "$1\n                this.__initializeJavaSubclassDefaults();\n$2"
        );
    }

    if (!isGameElementDescendant(className)) {
        return text;
    }

    const metadata = metadataByClass.get(className);
    const assignments = (metadata?.fields ?? [])
        .filter((field) => !field.static)
        .map((field) => {
            const name = getBackingFieldName(metadata, field.name, false);
            return `    this.${name} = ${defaultValue(field.type)};`;
        });
    const method = [
        "",
        "  protected __initializeJavaSubclassDefaults(): void {",
        "    super.__initializeJavaSubclassDefaults();",
        ...assignments,
        "  }",
        ""
    ].join("\n");
    return insertClassMember(text, className, method);
}

function insertClassMember(text, className, member) {
    const classDecl = text.match(new RegExp(`\\bexport\\s+(?:abstract\\s+)?class\\s+${className}\\b[^{]*\\{`));
    if (!classDecl) {
        return text;
    }
    const insertAt = classDecl.index + classDecl[0].length;
    return `${text.slice(0, insertAt)}${member}${text.slice(insertAt)}`;
}

function isGameElementDescendant(className) {
    let parent = metadataByClass.get(className)?.parent ?? null;
    while (parent) {
        if (parent === "GameElement") {
            return true;
        }
        parent = metadataByClass.get(parent)?.parent ?? null;
    }
    return false;
}

function convertArrayAllocations(text) {
    let output = text;
    output = output
        .replace(/new\s+int\s*\[stage\.tileMap\.length\]\s*\[stage\.tileMap\[0\]\.length\]/g, "java2DArray(stage.tileMap.length, stage.tileMap[0].length, 0)")
        .replace(
            /new\s+int\s*\[stage\.typesMap\.length\]\s*\[stage\.typesMap\[0\]\.length\]/g,
            "java2DArray(stage.typesMap.length, stage.typesMap[0].length, 0)"
        );
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
    output = output.replace(/for\s*\(\s*(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*=/g, "for(let $2 =");
    output = output.replace(/^(\s*)(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n=]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*=/gm, (match, indentText, type, name) => {
        if (!isLikelyType(type)) {
            return match;
        }
        return `${indentText}let ${name} =`;
    });
    output = output.replace(/^(\s*)(?:final\s+)?([A-Za-z_]\w*(?:\.\w+)?(?:<[^;\n=]+>)?(?:\[\])*)\s+([A-Za-z_]\w*)\s*;/gm, (match, indentText, type, name) => {
        if (!isLikelyType(type)) {
            return match;
        }
        return `${indentText}let ${name}: any = ${defaultValue(type)};`;
    });
    return output;
}

function convertCasts(text) {
    const primitiveHelpers = new Map([
        ["byte", "javaByte"],
        ["char", "javaChar"],
        ["double", "javaDouble"],
        ["float", "javaFloat"],
        ["int", "javaInt"],
        ["long", "javaLong"],
        ["short", "javaShort"]
    ]);
    const removableTypes = [...classNames, "boolean", "String", "Image", "Music", "Sound", "Stage", "Point2D.Float"]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join("|");
    const removableCast = new RegExp(`^\\(\\s*(?:${removableTypes})(?:\\[\\])*\\s*\\)`);
    let output = "";
    let index = 0;
    while (index < text.length) {
        const ch = text[index];
        if (ch === '"' || ch === "'" || ch === "`") {
            const end = readStringLike(text, index, ch);
            output += text.slice(index, end);
            index = end;
            continue;
        }
        if (ch === "/" && text[index + 1] === "/") {
            const end = text.indexOf("\n", index);
            const next = end < 0 ? text.length : end;
            output += text.slice(index, next);
            index = next;
            continue;
        }
        if (ch === "/" && text[index + 1] === "*") {
            const end = text.indexOf("*/", index + 2);
            const next = end < 0 ? text.length : end + 2;
            output += text.slice(index, next);
            index = next;
            continue;
        }
        const primitiveMatch = text.slice(index).match(/^\(\s*(byte|char|double|float|int|long|short)\s*\)/);
        if (primitiveMatch) {
            const helper = primitiveHelpers.get(primitiveMatch[1]);
            const expressionStart = skipWhitespace(text, index + primitiveMatch[0].length);
            const expressionEnd = findCastExpressionEnd(text, expressionStart);
            if (helper && expressionEnd > expressionStart) {
                output += `${helper}(${convertCasts(text.slice(expressionStart, expressionEnd))})`;
                index = expressionEnd;
                continue;
            }
        }
        const removableMatch = text.slice(index).match(removableCast);
        if (removableMatch) {
            index += removableMatch[0].length;
            continue;
        }
        output += ch;
        index++;
    }
    return output;
}

function skipWhitespace(text, index) {
    while (index < text.length && /\s/.test(text[index])) {
        index++;
    }
    return index;
}

function findCastExpressionEnd(text, start) {
    let index = skipWhitespace(text, start);
    while (/[+\-!~]/.test(text[index])) {
        index = skipWhitespace(text, index + 1);
    }
    if (text[index] === "(") {
        return findMatchingParen(text, index) + 1;
    }
    if (text.startsWith("new ", index)) {
        index += 4;
    }
    if (/[0-9]/.test(text[index])) {
        index++;
        while (index < text.length && /[0-9A-Fa-f_xX.]/.test(text[index])) {
            index++;
        }
        return index;
    }
    if (!isIdentifierStart(text[index])) {
        return start;
    }
    index++;
    while (index < text.length) {
        while (index < text.length && isIdentifierPart(text[index])) {
            index++;
        }
        if (text[index] === ".") {
            index++;
            continue;
        }
        if (text[index] === "[") {
            index = findMatchingBracket(text, index, "[", "]") + 1;
            continue;
        }
        if (text[index] === "(") {
            index = findMatchingParen(text, index) + 1;
            continue;
        }
        break;
    }
    return index;
}

function findMatchingParen(text, openIndex) {
    return findMatchingBracket(text, openIndex, "(", ")");
}

function findMatchingBracket(text, openIndex, openChar, closeChar) {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            i = readStringLike(text, i, ch) - 1;
            continue;
        }
        if (ch === "/" && text[i + 1] === "/") {
            const end = text.indexOf("\n", i);
            i = end < 0 ? text.length - 1 : end;
            continue;
        }
        if (ch === "/" && text[i + 1] === "*") {
            const end = text.indexOf("*/", i + 2);
            i = end < 0 ? text.length - 1 : end + 1;
            continue;
        }
        if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return openIndex;
}

function convertJavaTokens(text) {
    let output = text
        .replace(/\bnull\b/g, "null")
        .replace(/\btrue\b/g, "true")
        .replace(/\bfalse\b/g, "false")
        .replace(/(\d+(?:\.\d+)?)f\b/g, "$1")
        .replace(/(\d+)L\b/g, "$1")
        .replace(/\.length\(\)/g, ".length");
    output = rewriteMathAngleConversion(output, "toRadians", "Math.PI / 180");
    output = rewriteMathAngleConversion(output, "toDegrees", "180 / Math.PI");
    return output
        .replace(/\bString\[\]\s+args/g, "args: string[]")
        .replace(/\bString\.\s*/g, "JavaString.")
        .replace(/\bMath\.round\(/g, "Math.round(");
}

function rewriteMathAngleConversion(text, methodName, multiplier) {
    const target = `Math.${methodName}(`;
    let output = "";
    let index = 0;
    while (index < text.length) {
        const start = text.indexOf(target, index);
        if (start < 0) {
            output += text.slice(index);
            break;
        }
        const openParen = start + target.length - 1;
        const closeParen = findMatchingParen(text, openParen);
        if (closeParen <= openParen) {
            output += text.slice(index, start + target.length);
            index = start + target.length;
            continue;
        }
        const expression = text.slice(openParen + 1, closeParen);
        output += text.slice(index, start);
        output += `((${expression}) * ${multiplier})`;
        index = closeParen + 1;
    }
    return output;
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
    return text.replace(/^(\s*(?:public|private|protected)\s+(?:static\s+)?(?:readonly\s+)?\w+\s*:[^=]+?=\s*)([^;]+);/gm, (match, prefix, initializer) => {
        const isStatic = /\sstatic\s/.test(prefix);
        return `${prefix}${replaceIdentifiers(initializer, new Set(), className, members, isStatic)};`;
    });
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
        let body = text.slice(openBrace + 1, closeBrace);
        const isStatic = Boolean(match[2]);
        body = renameFieldShadowingLocals(body, members, isStatic);
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

function renameFieldShadowingLocals(body, members, isStaticContext) {
    const fieldNames = new Set(members.staticFields.keys());
    if (!isStaticContext) {
        for (const name of members.instanceFields.keys()) {
            fieldNames.add(name);
        }
    }
    const declarations = [];
    for (const match of body.matchAll(/\blet\s+([A-Za-z_$][\w$]*)\b/g)) {
        const name = match[1];
        if (fieldNames.has(name)) {
            declarations.push({
                name,
                start: match.index,
                end: findLocalScopeEnd(body, match.index)
            });
        }
    }
    let output = body;
    for (const declaration of declarations.reverse()) {
        const replacement = uniqueLocalName(output, declaration.name);
        output = renameIdentifierInRange(output, declaration.name, replacement, declaration.start, declaration.end);
    }
    return output;
}

function uniqueLocalName(source, name) {
    let candidate = `${name}Local`;
    let index = 2;
    while (new RegExp(`\\b${escapeRegExp(candidate)}\\b`).test(source)) {
        candidate = `${name}Local${index++}`;
    }
    return candidate;
}

function findLocalScopeEnd(source, declarationStart) {
    const declarationDepth = braceDepthAt(source, declarationStart);
    let index = declarationStart;
    let depth = declarationDepth;
    while (index < source.length) {
        const ch = source[index];
        if (ch === '"' || ch === "'" || ch === "`") {
            index = readStringLike(source, index, ch);
            continue;
        }
        if (ch === "/" && source[index + 1] === "/") {
            const end = source.indexOf("\n", index);
            index = end < 0 ? source.length : end;
            continue;
        }
        if (ch === "/" && source[index + 1] === "*") {
            const end = source.indexOf("*/", index + 2);
            index = end < 0 ? source.length : end + 2;
            continue;
        }
        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            if (depth === declarationDepth) {
                return index;
            }
            depth--;
        }
        index++;
    }
    return source.length;
}

function braceDepthAt(source, targetIndex) {
    let depth = 0;
    let index = 0;
    while (index < targetIndex) {
        const ch = source[index];
        if (ch === '"' || ch === "'" || ch === "`") {
            index = readStringLike(source, index, ch);
            continue;
        }
        if (ch === "/" && source[index + 1] === "/") {
            const end = source.indexOf("\n", index);
            index = end < 0 ? source.length : end;
            continue;
        }
        if (ch === "/" && source[index + 1] === "*") {
            const end = source.indexOf("*/", index + 2);
            index = end < 0 ? source.length : end + 2;
            continue;
        }
        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
        }
        index++;
    }
    return depth;
}

function renameIdentifierInRange(source, name, replacement, start, end) {
    let result = "";
    let index = 0;
    while (index < source.length) {
        if (index < start || index >= end) {
            result += source[index++];
            continue;
        }
        const ch = source[index];
        if (ch === '"' || ch === "'" || ch === "`") {
            const next = readStringLike(source, index, ch);
            result += source.slice(index, next);
            index = next;
            continue;
        }
        if (ch === "/" && source[index + 1] === "/") {
            const lineEnd = source.indexOf("\n", index);
            const next = lineEnd < 0 ? source.length : lineEnd;
            result += source.slice(index, next);
            index = next;
            continue;
        }
        if (ch === "/" && source[index + 1] === "*") {
            const commentEnd = source.indexOf("*/", index + 2);
            const next = commentEnd < 0 ? source.length : commentEnd + 2;
            result += source.slice(index, next);
            index = next;
            continue;
        }
        if (isIdentifierStart(ch)) {
            const tokenStart = index;
            index++;
            while (index < source.length && isIdentifierPart(source[index])) {
                index++;
            }
            const token = source.slice(tokenStart, index);
            const previous = previousNonWhitespace(source, tokenStart);
            result += token === name && previous !== "." ? replacement : token;
            continue;
        }
        result += ch;
        index++;
    }
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
        if (ch === '"' || ch === "'" || ch === "`") {
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
    if (previous === "." || previous === '"' || previous === "'") {
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
    return (
        reservedWords.has(token) ||
        classNameSet.has(token) ||
        slickImports.includes(token) ||
        runtimeImports.includes(token) ||
        token === "console" ||
        token === "Error" ||
        token === "Array" ||
        token === "Math" ||
        token === "Date" ||
        token === "Number" ||
        token === "String" ||
        token === "Boolean" ||
        token === "BigInt" ||
        token === "ResourceLoader"
    );
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
            const renamed = method.source.replace(new RegExp(`\\b${escapeRegExp(method.name)}\\s*\\(`), `${method.name}__overload${i}(`);
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
    const arities = group.map((method) => splitTopLevel(method.params, ",").filter((param) => param.trim().length > 0).length);
    const maxArity = Math.max(...arities);
    const argNames = Array.from({ length: maxArity }, (_value, index) => `arg${index}`);
    const signatureParams = argNames.map((name) => `${name}?: any`).join(", ");
    const lines = [`  ${first.access}${staticText} ${first.name}(${signatureParams}): any {`, "    const argCount = arguments.length;"];
    for (let i = 0; i < group.length; i++) {
        const method = group[i];
        const params = splitTopLevel(method.params, ",").filter((param) => param.trim().length > 0);
        const metaParams = overloadMetadata[i]?.params ?? [];
        const guards = buildOverloadGuards(metaParams, argNames);
        const condition = [`argCount === ${params.length}`, ...guards].join(" && ");
        const callArgs = argNames.slice(0, params.length).join(", ");
        lines.push(`    if (${condition}) {`);
        lines.push(`      return ${receiver}.${first.name}__overload${i}(${callArgs});`);
        lines.push("    }");
    }
    lines.push(`    throw new Error(\`No Java method overload matched ${first.name}: \${argCount}\`);`);
    lines.push("  }");
    lines.push("");
    return `${lines.join("\n")}`;
}

function buildOverloadGuards(types, argNames) {
    return types
        .map((type, index) => {
            const arg = argNames[index] ?? `arguments[${index}]`;
            const normalized = normalizeType(type);
            if (numericTypes.has(normalized)) {
                return `typeof ${arg} === "number"`;
            }
            if (normalized === "boolean") {
                return `typeof ${arg} === "boolean"`;
            }
            if (normalized === "String") {
                return `typeof ${arg} === "string"`;
            }
            if (normalized.endsWith("[]")) {
                return `Array.isArray(${arg})`;
            }
            const bare = normalized.replace(/<.*>/g, "");
            if (classNameSet.has(bare) || slickImports.includes(bare)) {
                return `(${arg} === null || ${arg} instanceof ${bare})`;
            }
            return "";
        })
        .filter(Boolean);
}

function convertParams(params) {
    const parsed = parseParams(params);
    return parsed
        .map((param) => {
            if (param.varargs) {
                return `...${param.name}: any[]`;
            }
            return `${param.name}: any`;
        })
        .join(", ");
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
        const type = parts
            .slice(0, -1)
            .join(" ")
            .replace(/\s+\.\.\.\s*$/, "");
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
    return (
        primitiveTypes.has(normalized) ||
        normalized.endsWith("[]") ||
        classNameSet.has(normalized) ||
        slickImports.includes(normalized) ||
        runtimeImports.includes(normalized) ||
        /^[A-Z]\w*(?:\.\w+)?$/.test(normalized)
    );
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
        if (ch === '"' || ch === "'") {
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
    if (/\bMainConstants\./.test(text)) {
        imports.push('import { MainConstants } from "../java/MainConstants.js";');
    }
    for (const name of classNames) {
        if (name === className) {
            continue;
        }
        const symbols = [];
        const classPattern = new RegExp(`\\b${escapeRegExp(name)}\\b`);
        if (classPattern.test(text)) {
            symbols.push(name);
        }
        const metadata = metadataByClass.get(name);
        for (const enumName of metadata?.nestedEnums.keys() ?? []) {
            const enumPattern = new RegExp(`\\b${escapeRegExp(enumName)}\\b`);
            if (enumPattern.test(text)) {
                symbols.push(enumName);
            }
        }
        if (symbols.length > 0) {
            imports.push(`import { ${[...new Set(symbols)].join(", ")} } from "./${name}.js";`);
        }
    }
    return imports;
}

function rewriteMainStaticUtilityAccess(text, className) {
    let output = text.replace(/\bMain\.rotate\s*\(/g, "rotatePoint(");
    if (className === "Main") {
        return output;
    }
    for (const name of mainConstantNames) {
        const regex = new RegExp(`\\bMain\\.${escapeRegExp(name)}\\b`, "g");
        output = output.replace(regex, `MainConstants.${name}`);
    }
    return output;
}

function indent(text, spaces) {
    if (!text) {
        return "";
    }
    const pad = " ".repeat(spaces);
    return text
        .split("\n")
        .map((line) => (line.trim() ? `${pad}${line}` : line))
        .join("\n");
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
