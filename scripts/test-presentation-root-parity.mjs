import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";

// Extract the actual maintained methods; no independent implementation of the renderer.
function method(language, name, member) {
    const path = language === "java" ? `desktop/src/jackal/${name}.java` : `pwa/src/jackal/${name}.ts`;
    const source = readFileSync(path, "utf8");
    if (language === "ts") {
        const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
        const declaration = tree.statements.find(ts.isClassDeclaration);
        return declaration.members.find((m) => m.name?.getText(tree) === member).getText(tree);
    }
    const match = new RegExp(`(?:public|private) (?:void|boolean) ${member}\\([^)]*\\)[^{]*\\{`).exec(source);
    assert.ok(match, `${name}.${member}`);
    let depth = 1,
        end = match.index + match[0].length;
    while (depth) {
        const ch = source[end++];
        if (ch === "{") depth++;
        if (ch === "}") depth--;
    }
    return source.slice(match.index, end);
}
function loadTS(name, members, globals) {
    const code = ts.transpileModule(`class ${name} {${members.map((m) => method("ts", name, m)).join("\n")}}; return ${name};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText;
    return new Function(...Object.keys(globals), code)(...Object.values(globals));
}
function traces() {
    const rows = [];
    let current = [];
    const add = (name, ...args) => current.push([name, ...args.map((v) => (typeof v === "object" ? v.id : v))]);
    const images = Array.from({ length: 256 }, (_, id) => ({ id, setAlpha() {} }));
    const main = { playerWakes: images, players: images, yellowBullet: images[10], playerMissile: images[11], grenade: images[12] };
    for (const [tsName, javaName] of Object.entries({
        drawImage: "draw",
        drawImageAlpha: "draw",
        drawVehicle: "drawVehicle",
        drawRotatedAlpha: "drawRotatedAlpha",
        drawCenteredAt: "drawCentered",
        drawRotated: "drawRotated",
        drawImageRotatedScaled: "draw"
    }))
        main[tsName] = (...args) => add(javaName, ...args);
    const gl = { glPushMatrix: () => add("push"), glPopMatrix: () => add("pop"), glTranslatef: (...args) => add("translate", ...args) };
    const Player = loadTS("Player", ["render"], {});
    Player.RUMBLE = [0.6];
    Player.WAKE_ALPHAS = [0.75];
    const player = Object.assign(new Player(), {
        main,
        x: 256,
        y: 384,
        rumble: 0,
        respawning: 0,
        invincible: 0,
        invincibleColor: 0,
        inSwamp: true,
        targetAngle: 0,
        angleSteps: 0,
        nextAngle: 0,
        displayAngle: 37,
        gameMode: { paused: false }
    });
    const GameMode = loadTS("GameMode", ["drawBackground", "drawSprites", "render"], { GL11: gl, javaInt: Math.trunc });
    GameMode.WATER_ALPHAS = [0.5];
    const game = Object.assign(new GameMode(), {
        main,
        cameraX: 0,
        cameraY: 0,
        mapWidth: 64,
        mapHeight: 64,
        stageIndex: 2,
        waterAlphaIndex: 0,
        tiles: images,
        tileMap: Array.from({ length: 64 }, (_, y) => Array.from({ length: 64 }, (_, x) => ((x + y) % 3 === 0 ? 0 : (x + y) % 3 === 1 ? 32 : 225))),
        elements: Array.from({ length: 8 }, () => ({ size: () => 0 })),
        player,
        playing: false
    });
    const capture = (kind, fn) => {
        current = [];
        fn();
        rows.push({ kind, trace: current });
    };
    for (const phase of [0, 0.25, 0.5, 0.75])
        for (const direction of [0, 45, 90, 135, 180, 225, 270, 315]) {
            player.x = 256 + phase;
            player.y = 384 + phase;
            player.nextAngle = direction;
            capture("player", () => player.render());
            const body = current.at(-1);
            assert.equal(body[2], 256);
            assert.equal(body[3], 384.6);
            assert.equal(body[4], 37);
            assert.equal(player.x, 256 + phase);
            assert.equal(player.y, 384 + phase);
        }
    player.inSwamp = false;
    player.respawning = 1;
    capture("respawn", () => player.render());
    assert.equal(current.length, 0);
    player.respawning = 0;
    for (const name of ["PlayerBullet", "PlayerMissile", "Grenade"]) {
        const C = loadTS(name, ["render"], {}),
            weapon = Object.assign(new C(), { main, angle: 37, scale: 0.6, x: 0, y: 0 });
        for (const v of [-0.25, 0, 0.25, 31.75]) {
            weapon.x = v;
            weapon.y = v + 1.5;
            capture(name, () => weapon.render());
            assert.equal(current[0][2], Math.floor(v));
            assert.equal(current[0][3], Math.floor(v + 1.5));
            assert.equal(weapon.x, v);
        }
    }
    player.render = () => add("player");
    for (const stage of [0, 1, 2])
        for (const camera of [0, 0.25, 0.5, 0.75, 31.75, 32, 32.25, 1024]) {
            game.stageIndex = stage;
            game.cameraX = camera;
            game.cameraY = camera === 1024 ? 1056 : camera;
            capture("camera", () => game.render(null, {}));
            const translation = current.find((r) => r[0] === "translate");
            assert.deepEqual(translation.slice(1), [-Math.floor(game.cameraX), -Math.floor(game.cameraY), 0]);
            const tiles = current.filter((r) => r[0] === "draw");
            assert.ok(tiles.every((r) => Number.isInteger(r[2]) && Number.isInteger(r[3])));
            assert.equal(current.filter((r) => r[0] === "push").length, 1);
            assert.equal(current.filter((r) => r[0] === "pop").length, 1);
            assert.equal(game.cameraX, camera);
        }
    for (const margin of [256, 768, 384, 768])
        for (const phase of [0, 0.25, 0.5, 0.75]) assert.equal(Math.floor(64 + phase + margin) - Math.floor(64 + phase), margin);
    return rows;
}
test("actual selective render methods preserve base, local geometry and Java float parity", () => {
    const expected = traces(),
        dir = mkdtempSync(join(tmpdir(), "jackal-root-parity-"));
    const drawNames = ["draw", "drawVehicle", "drawRotatedAlpha", "drawCentered", "drawRotated"];
    const source = `import java.util.*;
class Image { int id; Image(int v){id=v;} void setAlpha(float a){} public String toString(){return Integer.toString(id);} }
class Graphics {} class GameContainer {} class SlickException extends Exception {}
class GL11 { static void glPushMatrix(){Probe.add("push");} static void glPopMatrix(){Probe.add("pop");} static void glTranslatef(float x,float y,float z){Probe.add("translate",x,y,z);} }
class Main { Image[] playerWakes=Probe.images,players=Probe.images; Image yellowBullet=Probe.images[10],playerMissile=Probe.images[11],grenade=Probe.images[12]; ${drawNames.map((n) => `void ${n}(Object... a){Probe.add("${n}",a);}`).join("\n")} }
class GameElement { boolean remove; void render(){} }
class Player extends GameElement { Main main=new Main(); GameMode gameMode; float x,y,displayAngle=37; int rumble,respawning,invincible,invincibleColor,targetAngle,angleSteps,nextAngle; boolean inSwamp=true; static float[] RUMBLE={.6f},WAKE_ALPHAS={.75f}; ${method("java", "Player", "render")} }
${["PlayerBullet", "PlayerMissile", "Grenade"].map((n) => `class ${n} {Main main=new Main();float x,y,angle=37,scale=.6f; ${method("java", n, "render")} }`).join("\n")}
class GameMode { Main main=new Main(); float cameraX,cameraY; int mapWidth=64,stageIndex,waterAlphaIndex; boolean playing,paused; Graphics g; Image[] tiles=Probe.images;int[][]tileMap=new int[64][64]; static float[] WATER_ALPHAS={.5f}; ArrayList<GameElement>[] elements=new ArrayList[8]; Player player=new Player();void drawScore(){} ${["drawBackground", "drawSprites", "render"].map((n) => method("java", "GameMode", n)).join("\n")} }
public class Probe {
 static Image[] images=new Image[256];static ArrayList<String> trace=new ArrayList<>();
 static void add(String name,Object... values){String s="[\\\""+name+"\\\"";for(Object v:values)s+=","+v;trace.add(s+"]");}
 static void emit(){System.out.println("["+String.join(",",trace)+"]");trace.clear();}
 public static void main(String[]args)throws Exception {
 for(int i=0;i<256;i++)images[i]=new Image(i);
 GameMode g=new GameMode(); Player p=g.player;p.gameMode=g;
 for(float phase:new float[]{0,.25f,.5f,.75f})for(int direction:new int[]{0,45,90,135,180,225,270,315}){p.x=256+phase;p.y=384+phase;p.nextAngle=direction;p.render();emit();}
 p.inSwamp=false;p.respawning=1;p.render();emit();
 ${["PlayerBullet", "PlayerMissile", "Grenade"].map((n) => `{${n} w=new ${n}();for(float v:new float[]{-.25f,0,.25f,31.75f}){w.x=v;w.y=v+1.5f;w.render();emit();}}`).join("\n")}
 for(int i=0;i<8;i++)g.elements[i]=new ArrayList<>();g.player=new Player(){public void render(){add("player");}};
 for(int y=0;y<64;y++)for(int x=0;x<64;x++)g.tileMap[y][x]=(x+y)%3==0?0:(x+y)%3==1?32:225;
 for(int stage:new int[]{0,1,2})for(float camera:new float[]{0,.25f,.5f,.75f,31.75f,32,32.25f,1024}){g.stageIndex=stage;g.cameraX=camera;g.cameraY=camera==1024?1056:camera;g.render(null,new Graphics());emit();}
 }
}`;
    try {
        writeFileSync(join(dir, "Probe.java"), source);
        const compile = spawnSync("javac", ["-d", dir, join(dir, "Probe.java")], { encoding: "utf8", windowsHide: true });
        assert.equal(compile.status, 0, compile.stderr);
        const run = spawnSync("java", ["-cp", dir, "Probe"], { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
        assert.equal(run.status, 0, run.stderr);
        const actual = run.stdout.trim().split(/\r?\n/).map(JSON.parse);
        assert.equal(actual.length, expected.length);
        for (let i = 0; i < actual.length; i++) {
            assert.equal(actual[i].length, expected[i].trace.length, `row ${i}`);
            for (let j = 0; j < actual[i].length; j++)
                for (let k = 0; k < actual[i][j].length; k++) {
                    const a = actual[i][j][k],
                        e = expected[i].trace[j][k];
                    if (typeof e === "number") assert.ok(Math.abs(a - e) < 0.0001, `${i}/${j}/${k}: ${a} != ${e}`);
                    else assert.equal(a, e);
                }
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test("actual loading fallback retains normal INTRO in dev and release and preserves restore ownership", () => {
    const source = method("ts", "Main", "loadNext");
    const body = source
        .slice(source.indexOf("case 41:"), source.lastIndexOf("break;") + 6)
        .replace("case 41:", "")
        .replace(/break;$/, "");
    for (const handled of [false, true])
        for (const dev of [false, true]) {
            const calls = [],
                main = {
                    gc: {},
                    loadingCompleteHandler: () => {
                        calls.push("restore");
                        return handled;
                    },
                    notifyLoadingFinished: () => calls.push("notify"),
                    requestMode: (mode) => calls.push(mode)
                };
            const js = ts.transpileModule(body.replaceAll("import.meta.env.DEV", String(dev)), {
                compilerOptions: { target: ts.ScriptTarget.ES2022 }
            }).outputText;
            new Function("Modes", js).call(main, { INTRO: "intro" });
            assert.deepEqual(calls, handled ? ["restore", "notify"] : ["restore", "notify", "intro"]);
        }
});
test("actual camera/player calls retain tracking margins, clamp freedom and paused color behavior", () => {
    const Player = loadTS("Player", ["render"], {});
    Player.RUMBLE = [0.6];
    Player.WAKE_ALPHAS = [0.75];
    let body, background, spriteCamera;
    const player = Object.assign(new Player(), {
        main: {
            players: [0, 1, 2, 3],
            drawVehicle: (...args) => {
                body = args;
            }
        },
        gameMode: { paused: true },
        respawning: 0,
        invincible: 2,
        invincibleColor: 3,
        inSwamp: false,
        rumble: 0,
        displayAngle: 37
    });
    const GameMode = loadTS("GameMode", ["render"], {});
    const world = Object.assign(new GameMode(), {
        playing: false,
        drawBackground: (...args) => {
            background = args;
        },
        drawSprites: (...args) => {
            spriteCamera = args;
            player.render();
        }
    });
    for (const margin of [256, 768, 384, 768])
        for (const phase of [0, 0.25, 0.5, 0.75]) {
            world.cameraX = 64 + phase;
            world.cameraY = 96 + phase;
            player.x = world.cameraX + margin;
            player.y = world.cameraY + margin;
            world.render(null, {});
            assert.deepEqual(background, spriteCamera);
            assert.equal(body[1] - spriteCamera[0], margin);
            assert.ok(Math.abs(body[2] - spriteCamera[1] - margin - 0.6) < 1e-10);
            assert.equal(player.invincibleColor, 3);
            assert.equal(player.x, 64 + phase + margin);
        }
    world.cameraX = 0;
    world.cameraY = 0;
    player.x = 8.75;
    player.y = 12.25;
    world.render(null, {});
    assert.equal(body[1], 8);
    assert.equal(body[2], 12.6);
    player.gameMode.paused = false;
    player.render();
    assert.equal(player.invincibleColor, 0);
});
