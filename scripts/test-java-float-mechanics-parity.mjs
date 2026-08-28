import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

function toolAvailable(command, args) {
    return spawnSync(command, args, { encoding: "utf8" }).status === 0;
}

function write(path, text) {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text, "utf8");
}

function parseRows(text) {
    return text.trim().split(/\r?\n/).filter(Boolean);
}

function runJava(workDir) {
    const sourceRoot = join(workDir, "src");
    const classRoot = join(workDir, "classes");
    mkdirSync(join(sourceRoot, "jackal"), { recursive: true });
    mkdirSync(join(sourceRoot, "org", "newdawn", "slick"), { recursive: true });
    mkdirSync(classRoot, { recursive: true });

    for (const name of ["RotatingGun", "StatueSeekerMissile", "SwampMissile", "JeepYeahPlane", "Chinook"]) {
        copyFileSync(join(rootDir, "desktop", "src", "jackal", `${name}.java`), join(sourceRoot, "jackal", `${name}.java`));
    }

    write(join(sourceRoot, "org", "newdawn", "slick", "Image.java"), `package org.newdawn.slick; public class Image {}`);
    write(join(sourceRoot, "org", "newdawn", "slick", "Color.java"), `package org.newdawn.slick; public class Color {}`);
    write(
        join(sourceRoot, "org", "newdawn", "slick", "Graphics.java"),
        `package org.newdawn.slick; public class Graphics { public void setWorldClip(float a,float b,float c,float d){} public void clearWorldClip(){} }`
    );
    write(join(sourceRoot, "jackal", "AttackSource.java"), `package jackal; public final class AttackSource { public static final int PLAYER_EXPLOSION = 3; }`);
    write(join(sourceRoot, "jackal", "BossGarageManager.java"), `package jackal; public class BossGarageManager {}`);
    write(
        join(sourceRoot, "jackal", "Player.java"),
        `package jackal; public class Player { public float x; public float y; public boolean longRange; public void makeInvincible(){} }`
    );
    write(
        join(sourceRoot, "jackal", "GameMode.java"),
        `package jackal;
public class GameMode {
  public Player player = new Player(); public float cameraX; public float cameraY; public boolean playing; public org.newdawn.slick.Graphics g = new org.newdawn.slick.Graphics();
  public void add(GameElement e){} public boolean isOutsideOfFrame(float x,float y){ return false; }
}`
    );
    write(
        join(sourceRoot, "jackal", "Main.java"),
        `package jackal;
import java.util.Random;
import org.newdawn.slick.Image;
public class Main {
  public static final int DISPLAY_WIDTH = 1024, DISPLAY_HEIGHT = 768;
  public static Main main; public static GameMode gameMode;
  public Image[] grayGuns={new Image(),new Image()}, greenGuns={new Image(),new Image()}, brownGuns={new Image(),new Image()};
  public Image[] statueMissiles={new Image()}, swampMissiles={new Image()}, chinooks={new Image(),new Image(),new Image(),new Image()};
  public Image blackPlane=new Image(), bulletHitSound=new Image(), helicopterSound=new Image();
  public Random random=new Random(1); public boolean continued; public int friendlySoldiersPickedUp;
  public void drawRotated(Object... values){} public void drawRotatedScaled(Object... values){} public void drawOffset(Object... values){}
  public void rotateGraphics(Object... values){} public void popGraphics(){} public void addPoints(int p){}
  public void playHitExplodeSound(){} public void playExplodeSound2(){} public void playSoundAlways(Object s){}
  public void playSoundIfNotPlaying(Object s,float v){} public void stopSong(){} public void requestSong(Object s){}
}`
    );
    write(
        join(sourceRoot, "jackal", "GameElement.java"),
        `package jackal;
public abstract class GameElement {
  public Main main; public GameMode gameMode; public boolean remove; public float x,y; public int layer;
  public GameElement(){ main=Main.main; gameMode=Main.gameMode; init(); gameMode.add(this); }
  public void remove(){ remove=true; } public abstract void init(); public abstract void update(); public abstract void render();
}`
    );
    write(
        join(sourceRoot, "jackal", "Enemy.java"),
        `package jackal;
public abstract class Enemy extends GameElement {
  public boolean solid,mine,enemy,enemyBullet,playSoundOnRemove=true; public float angle;
  public float hitX1,hitY1,hitX2,hitY2,solidX1,solidY1,solidX2,solidY2,mineX1,mineY1,mineX2,mineY2,explosionX,explosionY;
  public int bulletHits,points;
  public void init(){ enemy=true; } public boolean hit(float a,float b,float c,float d){return false;}
  public boolean attack(float a,float b,float c,float d,int s){return false;} public boolean bulletAttack(float a,float b,float c,float d){return false;}
  public boolean bump(float a,float b,float c,float d,boolean i){return false;} public void remove(){remove=true;}
}`
    );
    write(
        join(sourceRoot, "jackal", "EnemyBullet.java"),
        `package jackal;
public class EnemyBullet { public static final float SPEED=2.5f; public static int count;
  public EnemyBullet(float x,float y,float vx,float vy,int t,boolean white){count++;}
}`
    );
    write(
        join(sourceRoot, "jackal", "Explosion.java"),
        `package jackal;
public class Explosion { public Explosion(float x,float y){} public Explosion setTiny(boolean... v){return this;} }
`
    );
    write(
        join(sourceRoot, "jackal", "IntroPlayer.java"),
        `package jackal;
public class IntroPlayer { public static final float FINAL_X=0, FINAL_Y=0; public IntroPlayer(float x,float y,Chinook c){} public void remove(){} }
`
    );
    write(
        join(sourceRoot, "jackal", "FloatParityHarness.java"),
        `package jackal;
public final class FloatParityHarness {
  private static int mix(int h,float v){ return 31*h + Float.floatToIntBits(v); }
  private static String bits(float v){ return Integer.toUnsignedString(Float.floatToIntBits(v)); }
  private static void rotating(){
    float[][] targets={{-1000f,0f},{0f,1000f},{1000f,0f},{0f,-1000f},{-750f,750f},{750f,-750f},{123f,987f}};
    float[] starts={0f,45f,90f,135f,180f,270f};
    for(int s=0;s<starts.length;s++) for(int q=0;q<targets.length;q++){
      Main.gameMode.player.x=targets[q][0]; Main.gameMode.player.y=targets[q][1]; EnemyBullet.count=0;
      RotatingGun gun=new RotatingGun(0f,0f,true); gun.state=RotatingGun.State.TRACKING; gun.angle=starts[s]; gun.pause=0;
      int tick=0; while(EnemyBullet.count==0 && tick<500){gun.update();tick++;}
      System.out.println("R|"+s+"|"+q+"|"+tick+"|"+bits(gun.angle));
    }
  }
  private static void missiles(){
    float[] coordinates={-256f,-128f,-64f,0f,64f,128f,256f};
    for(int kind=0;kind<2;kind++) for(float tx:coordinates) for(float ty:coordinates){
      Main.gameMode.player.x=tx; Main.gameMode.player.y=ty; int hash=1; float angle,x,y,vx,vy;
      if(kind==0){
        StatueSeekerMissile m=new StatueSeekerMissile(0f,0f); m.entryDelay=0;
        for(int tick=0;tick<200;tick++){m.update();hash=mix(mix(mix(mix(mix(hash,m.angle),m.x),m.y),m.vx),m.vy);} angle=m.angle;x=m.x;y=m.y;vx=m.vx;vy=m.vy;
      }else{
        SwampMissile m=new SwampMissile(0f,0f); m.entryDelay=0;
        for(int tick=0;tick<200;tick++){m.update();hash=mix(mix(mix(mix(mix(hash,m.angle),m.x),m.y),m.vx),m.vy);} angle=m.angle;x=m.x;y=m.y;vx=m.vx;vy=m.vy;
      }
      System.out.println("M|"+kind+"|"+bits(tx)+"|"+bits(ty)+"|"+Integer.toUnsignedString(hash)+"|"+bits(angle)+"|"+bits(x)+"|"+bits(y)+"|"+bits(vx)+"|"+bits(vy));
    }
  }
  private static void plane(){
    for(boolean left:new boolean[]{false,true}){ JeepYeahPlane p=new JeepYeahPlane(left); int hash=1,tick=0;
      while(p.z<=0 && tick<2000){p.update();tick++;hash=mix(mix(hash,p.z),p.angle);} System.out.println("P|"+left+"|"+tick+"|"+Integer.toUnsignedString(hash)+"|"+bits(p.z)+"|"+bits(p.angle)); }
  }
  private static void chinook(){
    Chinook c=new Chinook(); int hash=1,tick=0;
    while(c.state==Chinook.STATE_FOWARDS && tick<1000){c.update();tick++;hash=mix(mix(mix(mix(mix(hash,c.vt),c.t),c.x),c.y),c.z);}
    System.out.println("C|"+tick+"|"+Integer.toUnsignedString(hash)+"|"+bits(c.vt)+"|"+bits(c.t)+"|"+bits(c.x)+"|"+bits(c.y)+"|"+bits(c.z));
  }
  private static void bossMath(){
    final int time=23; final float max=2.5f; final float acceleration=max/time; float vx=0,x=0; int ticks=0;
    while(vx<max){vx+=acceleration;x+=vx;ticks++;}
    System.out.println("T|"+ticks+"|"+bits(acceleration)+"|"+bits(x)+"|"+bits(vx));
  }
  public static void main(String[] args){ Main.main=new Main(); Main.gameMode=new GameMode(); rotating(); missiles(); plane(); chinook(); bossMath(); }
}
`
    );

    const sources = [];
    const collect = (dir) => {
        for (const name of ["Image.java", "Color.java", "Graphics.java"]) {
            const path = join(sourceRoot, "org", "newdawn", "slick", name);
            if (!sources.includes(path)) sources.push(path);
        }
        for (const name of [
            "AttackSource",
            "BossGarageManager",
            "Player",
            "GameMode",
            "Main",
            "GameElement",
            "Enemy",
            "EnemyBullet",
            "Explosion",
            "IntroPlayer",
            "RotatingGun",
            "StatueSeekerMissile",
            "SwampMissile",
            "JeepYeahPlane",
            "Chinook",
            "FloatParityHarness"
        ]) {
            sources.push(join(sourceRoot, "jackal", `${name}.java`));
        }
    };
    collect(sourceRoot);
    const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", classRoot, ...sources], { encoding: "utf8" });
    assert.equal(compile.status, 0, `javac failed:\n${compile.stdout}\n${compile.stderr}`);
    const run = spawnSync("java", ["-cp", classRoot, "jackal.FloatParityHarness"], { encoding: "utf8" });
    assert.equal(run.status, 0, `Java float harness failed:\n${run.stdout}\n${run.stderr}`);
    return parseRows(run.stdout);
}

function stripImports(source) {
    return source.replace(/^import[\s\S]*?;\s*$/gm, "");
}

async function loadTypeScriptClasses() {
    const stubs = `
const javaFloat = Math.fround;
const javaInt = (value) => value < 0 ? Math.ceil(value) : Math.floor(value);
const javaArray = (length, initial) => Array.from({length}, () => initial);
const runtime = {
  main: null,
  gameMode: null
};
class MainConstants { static DISPLAY_WIDTH=1024; static DISPLAY_HEIGHT=768; }
class GameElement {
  constructor(){ this.main=runtime.main; this.gameMode=runtime.gameMode; this.x=0; this.y=0; this.removeFlag=false; this.layer=0; this.__initializeJavaSubclassDefaults(); this.init(); this.gameMode.add(this); }
  __initializeJavaSubclassDefaults(){ this.x=0; this.y=0; }
  init(){} update(){} render(){} remove(){this.removeFlag=true;}
}
class Enemy extends GameElement {
  __initializeJavaSubclassDefaults(){ super.__initializeJavaSubclassDefaults(); this.angle=0; this.playSoundOnRemove=true; this.explosionX=0; this.explosionY=0; }
  init(){} hit(){return false;} attack(){return false;} bulletAttack(){return false;} bump(){return false;} remove(){this.removeFlag=true;}
}
class EnemyBullet { static SPEED=2.5; static count=0; constructor(){EnemyBullet.count++;} }
class Explosion { constructor(){} setTiny(){return this;} }
class AttackSource { static PLAYER_EXPLOSION=3; }
class IntroPlayer { static FINAL_X=0; static FINAL_Y=0; constructor(){} remove(){} }
`;
    let output = ts.transpileModule(stubs, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false, removeComments: true }
    }).outputText;
    for (const name of ["RotatingGun", "StatueSeekerMissile", "SwampMissile", "JeepYeahPlane", "Chinook"]) {
        const path = join(rootDir, "pwa", "src", "jackal", `${name}.ts`);
        output += ts.transpileModule(stripImports(readFileSync(path, "utf8")), {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false, removeComments: true },
            fileName: path
        }).outputText;
    }
    output += `\nexport { runtime, EnemyBullet };\n`;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

function floatBits(value) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, value, false);
    return view.getUint32(0, false);
}

function mix(hash, value) {
    return (Math.imul(hash, 31) + floatBits(value)) | 0;
}

function unsigned(value) {
    return String(value >>> 0);
}

async function runTypeScript() {
    const module = await loadTypeScriptClasses();
    const { runtime, EnemyBullet, RotatingGun, RotatingGunState, StatueSeekerMissile, SwampMissile, JeepYeahPlane, Chinook } = module;
    runtime.main = {
        grayGuns: [{}, {}],
        greenGuns: [{}, {}],
        brownGuns: [{}, {}],
        statueMissiles: [{}],
        swampMissiles: [{}],
        chinooks: [{}, {}, {}, {}],
        blackPlane: {},
        helicopterSound: {},
        playExplodeSound2() {},
        playHitExplodeSound() {},
        addPoints() {},
        playSoundIfNotPlaying() {},
        drawRotated() {},
        drawRotatedScaled() {},
        drawOffset() {},
        rotateGraphics() {},
        popGraphics() {}
    };
    runtime.gameMode = {
        player: { x: 0, y: 0, makeInvincible() {} },
        cameraX: 0,
        cameraY: 0,
        playing: true,
        add() {},
        isOutsideOfFrame() {
            return false;
        }
    };
    const rows = [];
    const targets = [
        [-1000, 0],
        [0, 1000],
        [1000, 0],
        [0, -1000],
        [-750, 750],
        [750, -750],
        [123, 987]
    ];
    const starts = [0, 45, 90, 135, 180, 270];
    for (let s = 0; s < starts.length; s++)
        for (let q = 0; q < targets.length; q++) {
            runtime.gameMode.player.x = targets[q][0];
            runtime.gameMode.player.y = targets[q][1];
            EnemyBullet.count = 0;
            const gun = new RotatingGun(0, 0, true);
            gun.state = RotatingGunState.TRACKING;
            gun.angle = starts[s];
            gun.pause = 0;
            let tick = 0;
            while (EnemyBullet.count === 0 && tick < 500) {
                gun.update();
                tick++;
            }
            rows.push(`R|${s}|${q}|${tick}|${floatBits(gun.angle)}`);
        }
    const coordinates = [-256, -128, -64, 0, 64, 128, 256];
    for (let kind = 0; kind < 2; kind++)
        for (const tx of coordinates)
            for (const ty of coordinates) {
                runtime.gameMode.player.x = tx;
                runtime.gameMode.player.y = ty;
                let hash = 1;
                let m;
                if (kind === 0) {
                    m = new StatueSeekerMissile(0, 0);
                } else {
                    m = new SwampMissile(0, 0);
                }
                m.entryDelay = 0;
                for (let tick = 0; tick < 200; tick++) {
                    m.update();
                    hash = mix(mix(mix(mix(mix(hash, m.angle), m.x), m.y), m.vx), m.vy);
                }
                rows.push(
                    `M|${kind}|${floatBits(tx)}|${floatBits(ty)}|${unsigned(hash)}|${floatBits(m.angle)}|${floatBits(m.x)}|${floatBits(m.y)}|${floatBits(m.vx)}|${floatBits(m.vy)}`
                );
            }
    for (const left of [false, true]) {
        const p = new JeepYeahPlane(left);
        let hash = 1,
            tick = 0;
        while (p.z <= 0 && tick < 2000) {
            p.update();
            tick++;
            hash = mix(mix(hash, p.z), p.angle);
        }
        rows.push(`P|${left}|${tick}|${unsigned(hash)}|${floatBits(p.z)}|${floatBits(p.angle)}`);
    }
    const c = new Chinook();
    let hash = 1,
        tick = 0;
    while (c.state === Chinook.STATE_FOWARDS && tick < 1000) {
        c.update();
        tick++;
        hash = mix(mix(mix(mix(mix(hash, c.vt), c.t), c.x), c.y), c.z);
    }
    rows.push(`C|${tick}|${unsigned(hash)}|${floatBits(c.vt)}|${floatBits(c.t)}|${floatBits(c.x)}|${floatBits(c.y)}|${floatBits(c.z)}`);
    const acceleration = Math.fround(2.5 / 23);
    let vx = 0,
        x = 0,
        ticks = 0;
    while (vx < 2.5) {
        vx = Math.fround(vx + acceleration);
        x = Math.fround(x + vx);
        ticks++;
    }
    rows.push(`T|${ticks}|${floatBits(acceleration)}|${floatBits(x)}|${floatBits(vx)}`);
    return rows;
}

test("actual Java and TypeScript float-sensitive mechanics remain bit-identical", async (t) => {
    if (!toolAvailable("javac", ["-version"]) || !toolAvailable("java", ["-version"])) {
        t.skip("A JDK is not available; Java float differential test skipped.");
        return;
    }
    const workDir = mkdtempSync(join(tmpdir(), "jackal-float-parity-"));
    try {
        const javaRows = runJava(workDir);
        const tsRows = await runTypeScript();
        assert.deepEqual(tsRows, javaRows);
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
});

test("confirmed parity-sensitive production expressions retain Java float boundaries", () => {
    const expectations = new Map([
        ["RotatingGun.ts", ["ROTATION_SPEED: number = javaFloat(0.9)", "this.angle = javaFloat(this.angle + RotatingGun.ROTATION_SPEED)"]],
        ["BossSuperTankGun.ts", ["ROTATION_SPEED: number = javaFloat(0.9)", "this.angle = javaFloat(this.angle + BossSuperTankGun.ROTATION_SPEED)"]],
        ["StatueSeekerMissile.ts", ["this.x = javaFloat(this.x + this.vx)", "this.y = javaFloat(this.y + this.vy)"]],
        ["SwampMissile.ts", ["this.x = javaFloat(this.x + this.vx)", "this.y = javaFloat(this.y + this.vy)"]],
        [
            "BossSuperTank.ts",
            ["ACCELERATION: number = javaFloat(BossSuperTank.MAX_SPEED / BossSuperTank.ACCELERATION_TIME)", "this.vx = javaFloat(this.vx + this.ax)"]
        ],
        ["Chinook.ts", ["this.vt = javaFloat(this.vt - Chinook.AT)", "this.t = javaFloat(this.t + this.vt)"]],
        ["JeepYeahPlane.ts", ["this.z = javaFloat(this.z + javaFloat(0.02))", "this.angle = javaFloat(this.angle + javaFloat(0.1))"]]
    ]);
    for (const [file, fragments] of expectations) {
        const source = readFileSync(join(rootDir, "pwa", "src", "jackal", file), "utf8");
        for (const fragment of fragments) assert.ok(source.includes(fragment), `${file} lost float parity expression: ${fragment}`);
    }
});
