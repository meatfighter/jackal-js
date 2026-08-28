import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

function toolAvailable(command, args) {
    const result = spawnSync(command, args, { encoding: "utf8" });
    return result.status === 0;
}

function writeText(path, text) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text, "utf8");
}

function parseBoolean(value) {
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }
    throw new Error(`Invalid boolean value ${value}.`);
}

function parseJavaRows(text) {
    const rows = [];
    for (const line of text.trim().split(/\r?\n/)) {
        if (!line) {
            continue;
        }

        const columns = line.split("|");
        const scenario = columns[0];
        const tick = Number(columns[1]);
        if (scenario === "B") {
            rows.push({
                scenario,
                tick,
                x: Number(columns[2]),
                y: Number(columns[3]),
                vx: Number(columns[4]),
                vy: Number(columns[5]),
                angle: Number(columns[6]),
                scale: Number(columns[7]),
                remove: parseBoolean(columns[8])
            });
        } else {
            rows.push({
                scenario,
                tick,
                x: Number(columns[2]),
                y: Number(columns[3]),
                size: Number(columns[4]),
                scale: Number(columns[5]),
                spriteIndex: Number(columns[6]),
                delay: Number(columns[7]),
                alpha: Number(columns[8]),
                remove: parseBoolean(columns[9]),
                tiny: parseBoolean(columns[10]),
                damagesEnemies: parseBoolean(columns[11])
            });
        }
    }
    return rows;
}

function runJavaHarness(workDir) {
    const sourceRoot = join(workDir, "src");
    const classRoot = join(workDir, "classes");
    mkdirSync(join(sourceRoot, "jackal"), { recursive: true });
    mkdirSync(join(sourceRoot, "org", "newdawn", "slick"), { recursive: true });
    mkdirSync(classRoot, { recursive: true });

    copyFileSync(join(rootDir, "desktop", "src", "jackal", "JeepYeahBullet.java"), join(sourceRoot, "jackal", "JeepYeahBullet.java"));
    copyFileSync(join(rootDir, "desktop", "src", "jackal", "JeepYeahExplosion.java"), join(sourceRoot, "jackal", "JeepYeahExplosion.java"));

    writeText(join(sourceRoot, "org", "newdawn", "slick", "Placeholder.java"), "package org.newdawn.slick;\npublic final class Placeholder {}\n");
    writeText(join(sourceRoot, "jackal", "Enemy.java"), "package jackal;\npublic class Enemy { public float x; public float y; }\n");
    writeText(
        join(sourceRoot, "jackal", "Main.java"),
        `package jackal;
public class Main {
  public Object jeepYeahBullet;
  public Object[] explosions = new Object[3];
  public void drawRotated(Object image, float x, float y, float centerX, float centerY, float angle, float scale) {}
  public void drawScaled(Object image, float x, float y, float scale) {}
  public void drawScaled(Object image, float x, float y, float scale, float alpha) {}
}
`
    );
    writeText(
        join(sourceRoot, "jackal", "MechanicsHarness.java"),
        `package jackal;

public final class MechanicsHarness {
  private static void printBullet(int tick, JeepYeahBullet value) {
    System.out.println("B|" + tick + "|" + value.x + "|" + value.y + "|" + value.vx + "|" + value.vy + "|" + value.angle + "|" + value.scale + "|" + value.remove);
  }

  private static void printExplosion(String scenario, int tick, JeepYeahExplosion value) {
    System.out.println(scenario + "|" + tick + "|" + value.x + "|" + value.y + "|" + value.size + "|" + value.scale + "|" + value.spriteIndex + "|" + value.delay + "|" + value.alpha + "|" + value.remove + "|" + value.tiny + "|" + value.damagesEnemies);
  }

  public static void main(String[] args) {
    JeepYeahBullet bullet = new JeepYeahBullet();
    printBullet(0, bullet);
    for (int tick = 1; tick <= 80; tick++) {
      bullet.update();
      printBullet(tick, bullet);
    }

    JeepYeahExplosion normal = new JeepYeahExplosion(100f, 200f);
    printExplosion("N", 0, normal);
    for (int tick = 1; tick <= 55; tick++) {
      normal.update();
      printExplosion("N", tick, normal);
    }

    JeepYeahExplosion tiny = new JeepYeahExplosion(110f, 210f);
    tiny.setTiny(true);
    printExplosion("T", 0, tiny);
    for (int tick = 1; tick <= 35; tick++) {
      tiny.update();
      printExplosion("T", tick, tiny);
    }

    Enemy enemy = new Enemy();
    enemy.x = 20f;
    enemy.y = 30f;
    JeepYeahExplosion delayed = new JeepYeahExplosion(120f, 220f);
    delayed.enemy = enemy;
    delayed.enemyX = enemy.x;
    delayed.enemyY = enemy.y;
    delayed.setDelayed(3);
    printExplosion("D", 0, delayed);
    for (int tick = 1; tick <= 12; tick++) {
      enemy.x += 1.25f;
      enemy.y -= 0.75f;
      delayed.update();
      printExplosion("D", tick, delayed);
    }
  }
}
`
    );

    const sourceFiles = [
        join(sourceRoot, "org", "newdawn", "slick", "Placeholder.java"),
        join(sourceRoot, "jackal", "Enemy.java"),
        join(sourceRoot, "jackal", "Main.java"),
        join(sourceRoot, "jackal", "JeepYeahBullet.java"),
        join(sourceRoot, "jackal", "JeepYeahExplosion.java"),
        join(sourceRoot, "jackal", "MechanicsHarness.java")
    ];
    const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", classRoot, ...sourceFiles], { encoding: "utf8" });
    assert.equal(compile.status, 0, `javac failed:\n${compile.stdout}\n${compile.stderr}`);

    const run = spawnSync("java", ["-cp", classRoot, "jackal.MechanicsHarness"], { encoding: "utf8" });
    assert.equal(run.status, 0, `Java mechanics harness failed:\n${run.stdout}\n${run.stderr}`);
    return parseJavaRows(run.stdout);
}

async function loadTypeScriptMechanics() {
    const paths = [join(rootDir, "pwa", "src", "jackal", "JeepYeahBullet.ts"), join(rootDir, "pwa", "src", "jackal", "JeepYeahExplosion.ts")];

    let output = "";
    for (const path of paths) {
        const source = readFileSync(path, "utf8");
        output += ts.transpileModule(source, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
                useDefineForClassFields: false,
                sourceMap: false,
                removeComments: true
            },
            fileName: path
        }).outputText;
    }

    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function explosionRow(scenario, tick, value) {
    return {
        scenario,
        tick,
        x: value.x,
        y: value.y,
        size: value.size,
        scale: value.scale,
        spriteIndex: value.spriteIndex,
        delay: value.delay,
        alpha: value.alpha,
        remove: value.remove,
        tiny: value.tiny,
        damagesEnemies: value.damagesEnemies
    };
}

async function runTypeScriptHarness() {
    const { JeepYeahBullet, JeepYeahExplosion } = await loadTypeScriptMechanics();
    const rows = [];

    const bullet = new JeepYeahBullet();
    const pushBullet = (tick) =>
        rows.push({
            scenario: "B",
            tick,
            x: bullet.x,
            y: bullet.y,
            vx: bullet.vx,
            vy: bullet.vy,
            angle: bullet.angle,
            scale: bullet.scale,
            remove: bullet.remove
        });
    pushBullet(0);
    for (let tick = 1; tick <= 80; tick++) {
        bullet.update();
        pushBullet(tick);
    }

    const normal = new JeepYeahExplosion(100, 200);
    rows.push(explosionRow("N", 0, normal));
    for (let tick = 1; tick <= 55; tick++) {
        normal.update();
        rows.push(explosionRow("N", tick, normal));
    }

    const tiny = new JeepYeahExplosion(110, 210);
    tiny.setTiny(true);
    rows.push(explosionRow("T", 0, tiny));
    for (let tick = 1; tick <= 35; tick++) {
        tiny.update();
        rows.push(explosionRow("T", tick, tiny));
    }

    const enemy = { x: 20, y: 30 };
    const delayed = new JeepYeahExplosion(120, 220);
    delayed.enemy = enemy;
    delayed.enemyX = enemy.x;
    delayed.enemyY = enemy.y;
    delayed.setDelayed(3);
    rows.push(explosionRow("D", 0, delayed));
    for (let tick = 1; tick <= 12; tick++) {
        enemy.x += 1.25;
        enemy.y -= 0.75;
        delayed.update();
        rows.push(explosionRow("D", tick, delayed));
    }

    return rows;
}

function firstRemovalTick(rows, scenario) {
    return rows.find((row) => row.scenario === scenario && row.remove)?.tick ?? null;
}

function compareRows(javaRows, tsRows) {
    assert.equal(tsRows.length, javaRows.length);
    for (let i = 0; i < javaRows.length; i++) {
        const javaRow = javaRows[i];
        const tsRow = tsRows[i];
        assert.equal(tsRow.scenario, javaRow.scenario, `Scenario mismatch at row ${i}.`);
        assert.equal(tsRow.tick, javaRow.tick, `Tick mismatch at row ${i}.`);
        assert.deepEqual(Object.keys(tsRow), Object.keys(javaRow), `State shape mismatch for ${javaRow.scenario} tick ${javaRow.tick}.`);

        for (const key of Object.keys(javaRow)) {
            if (key === "scenario" || key === "tick") {
                continue;
            }

            const expected = javaRow[key];
            const actual = tsRow[key];
            if (typeof expected === "number") {
                assert.ok(Math.abs(actual - expected) <= 0.001, `${javaRow.scenario} tick ${javaRow.tick} ${key}: Java=${expected}, TypeScript=${actual}`);
            } else {
                assert.equal(actual, expected, `${javaRow.scenario} tick ${javaRow.tick} ${key} differs.`);
            }
        }
    }

    for (const scenario of ["B", "N", "T"]) {
        assert.equal(firstRemovalTick(tsRows, scenario), firstRemovalTick(javaRows, scenario), `${scenario} removal frame differs.`);
    }
}

test("actual Java and TypeScript JeepYeah mechanics stay synchronized", async (t) => {
    if (!toolAvailable("javac", ["-version"]) || !toolAvailable("java", ["-version"])) {
        t.skip("A JDK is not available; Java/TypeScript differential mechanics test skipped.");
        return;
    }

    const workDir = mkdtempSync(join(tmpdir(), "jackal-mechanics-"));
    try {
        compareRows(runJavaHarness(workDir), await runTypeScriptHarness());
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
});
