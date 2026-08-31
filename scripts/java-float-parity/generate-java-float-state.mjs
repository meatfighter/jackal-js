import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(scriptDir, "..", "..");
const metadataPath = join(scriptDir, "java-float-metadata.jsonl");
const registryPath = join(rootDir, "pwa", "src", "jackal", "persistence", "GameElementTypeRegistry.ts");
const outputPath = join(rootDir, "pwa", "src", "jackal", "persistence", "JavaFloatState.ts");
const checkOnly = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");

const metadata = readFileSync(metadataPath, "utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const classes = new Map(metadata.filter((entry) => entry.fullName === entry.name).map((entry) => [entry.name, entry]));

const registrySource = readFileSync(registryPath, "utf8");
const registryMatch = /export const GAME_ELEMENT_TYPES = \{([\s\S]*?)\} as const/.exec(registrySource);
assert.ok(registryMatch, "Unable to locate GAME_ELEMENT_TYPES.");
const entityNames = [...registryMatch[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*,?\s*$/gm)].map((match) => match[1]);

function floatFieldsFor(className) {
    const result = [];
    const positions = new Map();
    const visited = new Set();
    function visit(name) {
        if (!name || visited.has(name)) return;
        visited.add(name);
        const info = classes.get(name);
        if (!info) return;
        visit(info.parent);
        for (const field of info.fields) {
            if (field.static || !field.float) continue;
            const item = [field.name, (field.type.match(/\[\]/g) ?? []).length];
            const existing = positions.get(field.name);
            if (existing === undefined) {
                positions.set(field.name, result.length);
                result.push(item);
            } else {
                result[existing] = item;
            }
        }
    }
    visit(className);
    return result;
}

function renderSpec(fields, itemIndent = "    ", closingIndent = "") {
    if (fields.length === 0) return "[]";
    if (fields.length === 1) {
        const [name, depth] = fields[0];
        return `[["${name}", ${depth}]]`;
    }
    return `[\n${fields.map(([name, depth]) => `${itemIndent}["${name}", ${depth}]`).join(",\n")}\n${closingIndent}]`;
}

function constantName(className) {
    return `${className.replace(/(?<!^)(?=[A-Z])/g, "_").toUpperCase()}_JAVA_FLOAT_FIELDS`;
}

const standaloneClasses = [
    "Main",
    "GameMode",
    "Player",
    "Menu",
    "IntroMode",
    "ContinueMode",
    "DifficultyMode",
    "OptionsMode",
    "InputMode",
    "IntroMapMode",
    "MapMode",
    "JeepHereMode",
    "JeepYeahMode",
    "JeepYeahPlane",
    "JeepYeahExplosion",
    "JeepYeahFireLeft",
    "JeepYeahFireRight",
    "JeepYeahBullet",
    "SunsetMode",
    "HardEndingMode"
];
const modes = [
    ["INTRO", "INTRO_MODE_JAVA_FLOAT_FIELDS"],
    ["HERE", "JEEP_HERE_MODE_JAVA_FLOAT_FIELDS"],
    ["YEAH", "JEEP_YEAH_MODE_JAVA_FLOAT_FIELDS"],
    ["WE_MADE_IT", "JEEP_YEAH_MODE_JAVA_FLOAT_FIELDS"],
    ["SUNSET", "SUNSET_MODE_JAVA_FLOAT_FIELDS"],
    ["HARD_ENDING", "HARD_ENDING_MODE_JAVA_FLOAT_FIELDS"],
    ["MAP", "MAP_MODE_JAVA_FLOAT_FIELDS"],
    ["CONTINUE", "CONTINUE_MODE_JAVA_FLOAT_FIELDS"],
    ["DIFFICULTY", "DIFFICULTY_MODE_JAVA_FLOAT_FIELDS"],
    ["OPTIONS", "OPTIONS_MODE_JAVA_FLOAT_FIELDS"],
    ["INPUT", "INPUT_MODE_JAVA_FLOAT_FIELDS"],
    ["INTRO_MAP", "INTRO_MAP_MODE_JAVA_FLOAT_FIELDS"]
];

const sections = [
    `import { javaFloat } from "../../java/JavaRuntime.js";\nimport type { GameElementTypeId } from "./GameElementTypeIds.js";\nimport type { StandaloneModeId } from "./GameStateFields.js";\n\n/**\n * Java rounds every assignment to a float field or float-array element to IEEE-754 binary32.\n * Production updates already preserve those storage boundaries. These tables normalize snapshots\n * written by older PWA builds, whose Number values may still contain binary64-only state.\n *\n * This code runs only while restoring a save; it adds no work to the 100 TPS gameplay loop.\n */\nexport type JavaFloatStateField = readonly [name: string, arrayDepth: number];\nexport type JavaFloatStateSpec = readonly JavaFloatStateField[];\n`
];

for (const className of standaloneClasses) {
    sections.push(`export const ${constantName(className)}: JavaFloatStateSpec = ${renderSpec(floatFieldsFor(className))};\n`);
}

sections.push("\nexport const GAME_ELEMENT_JAVA_FLOAT_FIELDS: Readonly<Record<GameElementTypeId, JavaFloatStateSpec>> = {\n");
sections.push(entityNames.map((className) => `    ${className}: ${renderSpec(floatFieldsFor(className), "        ", "    ")}`).join(",\n"));
sections.push("\n};\n");

sections.push("\nexport const STANDALONE_MODE_JAVA_FLOAT_FIELDS: Readonly<Record<StandaloneModeId, JavaFloatStateSpec>> = {\n");
sections.push(modes.map(([mode, spec]) => `    ${mode}: ${spec}`).join(",\n"));
sections.push("\n};\n");

sections.push(
    `\nexport function normalizeJavaFloatFields(target: object, fields: JavaFloatStateSpec): void {\n    for (const [name, arrayDepth] of fields) {\n        if (!Object.hasOwn(target, name)) {\n            continue;\n        }\n        Reflect.set(target, name, normalizeJavaFloatValue(Reflect.get(target, name), arrayDepth));\n    }\n}\n\nfunction normalizeJavaFloatValue(value: unknown, arrayDepth: number): unknown {\n    if (arrayDepth === 0) {\n        return typeof value === "number" ? javaFloat(value) : value;\n    }\n    if (!Array.isArray(value)) {\n        return value;\n    }\n    for (let i = 0; i < value.length; i++) {\n        value[i] = normalizeJavaFloatValue(value[i], arrayDepth - 1);\n    }\n    return value;\n}\n`
);

const generated = sections.join("");
if (checkOnly) {
    const committed = readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n");
    assert.equal(committed, generated, "Java float save-state metadata is stale. Run `npm run generate:java-float-state` and review the serializer coverage.");
    if (!quiet) console.log("Java float save-state metadata matches the current desktop source and entity registry.");
} else {
    writeFileSync(outputPath, generated, "utf8");
    console.log(`Wrote ${outputPath}.`);
}
