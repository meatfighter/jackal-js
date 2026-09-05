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

function javaSources(workDir) {
    const sourceRoot = join(workDir, "src", "jackal");
    const classRoot = join(workDir, "classes");
    mkdirSync(sourceRoot, { recursive: true });
    mkdirSync(classRoot, { recursive: true });
    copyFileSync(join(rootDir, "desktop", "src", "jackal", "Player.java"), join(sourceRoot, "Player.java"));

    write(
        join(sourceRoot, "IInput.java"),
        `package jackal; public interface IInput { boolean isUp(); boolean isDown(); boolean isLeft(); boolean isRight(); boolean isFire(); boolean isShoot(); }`
    );
    write(
        join(sourceRoot, "Enemy.java"),
        `package jackal; public class Enemy { public boolean bump(float a,float b,float c,float d,boolean invincible){return false;} }`
    );
    write(join(sourceRoot, "FriendlySoldierType.java"), `package jackal; public enum FriendlySoldierType { WEAPON_CARRIER_WANDERER, WANDERER }`);
    write(
        join(sourceRoot, "FriendlySoldier.java"),
        `package jackal; public class FriendlySoldier { public static int count; public static void resetCount(){count=0;} public FriendlySoldier(float x,float y,FriendlySoldierType type){count++;} }`
    );
    write(join(sourceRoot, "Explosion.java"), `package jackal; public class Explosion { public Explosion(float x,float y,boolean player){} }`);
    write(
        join(sourceRoot, "Grenade.java"),
        `package jackal; public class Grenade { public static int count; public Grenade(float x,float y,int angle){count++;} }`
    );
    write(
        join(sourceRoot, "PlayerMissile.java"),
        `package jackal; public class PlayerMissile { public static int count; public PlayerMissile(float x,float y,int angle,int power){count++;} }`
    );
    write(
        join(sourceRoot, "PlayerBullet.java"),
        `package jackal; public class PlayerBullet { public static int count; public PlayerBullet(float x,float y){count++;} }`
    );
    write(join(sourceRoot, "Modes.java"), `package jackal; public enum Modes { CONTINUE }`);
    write(join(sourceRoot, "KonamiCode.java"), `package jackal; public class KonamiCode { public boolean enabled; }`);
    write(
        join(sourceRoot, "InputStub.java"),
        `package jackal; public class InputStub implements IInput { public boolean up,down,left,right,fire,shoot; public boolean isUp(){return up;} public boolean isDown(){return down;} public boolean isLeft(){return left;} public boolean isRight(){return right;} public boolean isFire(){return fire;} public boolean isShoot(){return shoot;} }`
    );
    write(
        join(sourceRoot, "GameMode.java"),
        `package jackal; import java.util.ArrayList; public class GameMode { public static final int TYPE_EMPTY=1,TYPE_SWAMP=4,TYPE_CONVEYOR=5; public ArrayList<Enemy> mines=new ArrayList<Enemy>(); public boolean stageCompleted,bossCameraPan,endingCameraPan,playing=true,paused; public float maxCameraY=4096, conveyorDelta=1; public Object gc; public int tileType=TYPE_EMPTY; public int getTileType(float x,float y){return tileType;} public boolean isDriveable(float x,float y){return true;} }`
    );
    write(
        join(sourceRoot, "Main.java"),
        `package jackal; import java.awt.geom.Point2D; import java.util.Random; public class Main { public static Main main; public static GameMode gameMode; public IInput input; public boolean hasMissiles; public int missilePower,extraLives=4; public KonamiCode konamiCode=new KonamiCode(); public Random random=new Random(1); public Object pickupSound=new Object(),weaponUpgradeSound=new Object(),playerExplodeSound=new Object(); public Object[] playerWakes=new Object[6]; public Object[][] players=new Object[4][5]; public void upgradeWeapon(boolean always){} public void playSound(Object s){} public void stopSong(){} public void requestMode(Modes mode,Object gc){} public void loseLife(){extraLives--;} public void draw(Object image,float x,float y,float alpha){} public void drawRotatedAlpha(Object image,float x,float y,float angle,float alpha){} public void drawVehicle(Object[] images,float x,float y,float angle){} public static Point2D.Float rotate(float x,float y,float angle){float cos=(float)Math.cos(angle);float sin=(float)Math.sin(angle);return new Point2D.Float(x*cos-y*sin,x*sin+y*cos);} }`
    );
    write(
        join(sourceRoot, "PlayerHarness.java"),
        `package jackal; public final class PlayerHarness { static String bits(float v){return Integer.toUnsignedString(Float.floatToIntBits(v));} static void row(String s,int t,Player p){System.out.println(s+"|"+t+"|"+bits(p.x)+"|"+bits(p.y)+"|"+p.angle+"|"+p.nextAngle+"|"+bits(p.displayAngle)+"|"+bits(p.angleVelocity)+"|"+p.angleSteps+"|"+p.diagonalDelay+"|"+p.fireAngle+"|"+p.inSwamp+"|"+Grenade.count+"|"+PlayerMissile.count+"|"+PlayerBullet.count+"|"+p.gunArmed+"|"+p.rumble); } static Player reset(InputStub in,GameMode mode){Main.main=new Main();Main.gameMode=mode;Main.main.input=in;Grenade.count=PlayerMissile.count=PlayerBullet.count=0;return new Player();} static void run(String name,InputStub in,GameMode mode,int ticks){Player p=reset(in,mode);row(name,0,p);for(int t=1;t<=ticks;t++){p.update();row(name,t,p);}} public static void main(String[] args){InputStub in=new InputStub();GameMode mode=new GameMode();in.right=true;run("R",in,mode,20);in=new InputStub();mode=new GameMode();in.down=true;in.right=true;run("D",in,mode,12);in=new InputStub();mode=new GameMode();mode.tileType=GameMode.TYPE_SWAMP;in.right=true;run("S",in,mode,10);in=new InputStub();mode=new GameMode();mode.tileType=GameMode.TYPE_CONVEYOR;run("C",in,mode,5);in=new InputStub();mode=new GameMode();Player p=reset(in,mode);p.update();in.fire=true;row("F",0,p);p.update();row("F",1,p);in.fire=false;p.update();row("F",2,p);in=new InputStub();mode=new GameMode();p=reset(in,mode);p.update();in.shoot=true;row("G",0,p);for(int t=1;t<=50;t++){p.update();row("G",t,p);} } }`
    );
    return { sourceRoot, classRoot };
}

function runJava(workDir) {
    const { sourceRoot, classRoot } = javaSources(workDir);
    const files = [
        "IInput",
        "Enemy",
        "FriendlySoldierType",
        "FriendlySoldier",
        "Explosion",
        "Grenade",
        "PlayerMissile",
        "PlayerBullet",
        "Modes",
        "KonamiCode",
        "InputStub",
        "GameMode",
        "Main",
        "Player",
        "PlayerHarness"
    ].map((name) => join(sourceRoot, `${name}.java`));
    const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", classRoot, ...files], { encoding: "utf8" });
    assert.equal(
        compile.status,
        0,
        `javac failed:
${compile.stdout}
${compile.stderr}`
    );
    const run = spawnSync("java", ["-cp", classRoot, "jackal.PlayerHarness"], { encoding: "utf8" });
    assert.equal(
        run.status,
        0,
        `Java Player harness failed:
${run.stdout}
${run.stderr}`
    );
    return run.stdout.trim().split(/\r?\n/).filter(Boolean);
}

function stripImports(source) {
    return source.replace(/^import[\s\S]*?;\s*$/gm, "");
}

async function runTypeScript() {
    const stubs = `
const javaFloat=Math.fround; const javaInt=(v)=>v<0?Math.ceil(v):Math.floor(v); const javaArray=(n,v)=>Array.from({length:n},()=>v);
class ArrayList { constructor(){this.values=[];} add(v){this.values.push(v);return true;} get(i){return this.values[i];} size(){return this.values.length;} }
class Point2D { static Float=class { constructor(x,y){this.x=x;this.y=y;} }; }
function rotatePointLikeJava(x,y,angle){x=javaFloat(x);y=javaFloat(y);angle=javaFloat(angle);const cos=javaFloat(Math.cos(angle)),sin=javaFloat(Math.sin(angle));return new Point2D.Float(javaFloat(javaFloat(x*cos)-javaFloat(y*sin)),javaFloat(javaFloat(x*sin)+javaFloat(y*cos)));}
const TILE_TYPE_EMPTY=1,TILE_TYPE_SWAMP=4,TILE_TYPE_CONVEYOR=5; const PLAYER_SPEED=2.5,PLAYER_ANGLE_STEPS=8,PLAYER_ANGLE_VELOCITY=Math.fround(45/8),PLAYER_RUMBLE_STEPS=85,PLAYER_RUMBLE=Array(PLAYER_RUMBLE_STEPS).fill(0); const playerRumblePhase=(index)=>Math.fround((12*Math.PI*index)/PLAYER_RUMBLE_STEPS);
let runtimeMain=null,runtimeMode=null; const requireMainRuntime=()=>runtimeMain; const requireMainRuntimeGameMode=()=>runtimeMode;
class FriendlySoldierType { static WEAPON_CARRIER_WANDERER=0; static WANDERER=1; }
class FriendlySoldier { static count=0; static resetCount(){this.count=0;} static wandering(){this.count++; return new FriendlySoldier();} }
class Explosion { static withPlayerExplosion(){return new Explosion();} }
class Grenade { static count=0; constructor(){Grenade.count++;} }
class PlayerMissile { static count=0; constructor(){PlayerMissile.count++;} }
class PlayerBullet { static count=0; constructor(){PlayerBullet.count++;} }
class Modes { static CONTINUE=0; }
`;
    const source = stripImports(readFileSync(join(rootDir, "pwa", "src", "jackal", "Player.ts"), "utf8"));
    let output = ts.transpileModule(stubs, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false }
    }).outputText;
    output += ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false },
        fileName: "Player.ts"
    }).outputText;
    output += `
function bits(v){const b=new ArrayBuffer(4),d=new DataView(b);d.setFloat32(0,v,false);return String(d.getUint32(0,false));}
function row(s,t,p){return s+"|"+t+"|"+bits(p.x)+"|"+bits(p.y)+"|"+p.angle+"|"+p.nextAngle+"|"+bits(p.displayAngle)+"|"+bits(p.angleVelocity)+"|"+p.angleSteps+"|"+p.diagonalDelay+"|"+p.fireAngle+"|"+p.inSwamp+"|"+Grenade.count+"|"+PlayerMissile.count+"|"+PlayerBullet.count+"|"+p.gunArmed+"|"+p.rumble;}
class InputStub {up=false;down=false;left=false;right=false;fire=false;shoot=false;isUp(){return this.up;}isDown(){return this.down;}isLeft(){return this.left;}isRight(){return this.right;}isFire(){return this.fire;}isShoot(){return this.shoot;}}
class ModeStub {constructor(){this.mines=new ArrayList();this.stageCompletedFlag=false;this.bossCameraPan=false;this.endingCameraPan=false;this.playing=true;this.paused=false;this.maxCameraY=4096;this.conveyorDelta=1;this.tileType=TILE_TYPE_EMPTY;this.gc={};}getTileType(){return this.tileType;}isDriveable(){return true;}}
function reset(input,mode){runtimeMode=mode;runtimeMain={input,hasMissiles:false,missilePower:0,extraLives:4,konamiCode:{enabled:false},random:{nextInt(){return 0;}},pickupSound:{},weaponUpgradeSound:{},playerExplodeSound:{},playerWakes:Array(6),players:Array.from({length:4},()=>Array(5)),upgradeWeapon(){},playSound(){},stopAllSongs(){},requestMode(){},loseLife(){this.extraLives--;},drawImageAlpha(){},drawRotatedAlpha(){},drawVehicle(){}};Grenade.count=PlayerMissile.count=PlayerBullet.count=0;return new Player();}
function runScenario(name,input,mode,ticks,rows){const p=reset(input,mode);rows.push(row(name,0,p));for(let t=1;t<=ticks;t++){p.update();rows.push(row(name,t,p));}}
const rows=[];let i=new InputStub(),m=new ModeStub();i.right=true;runScenario("R",i,m,20,rows);i=new InputStub();m=new ModeStub();i.down=i.right=true;runScenario("D",i,m,12,rows);i=new InputStub();m=new ModeStub();m.tileType=TILE_TYPE_SWAMP;i.right=true;runScenario("S",i,m,10,rows);i=new InputStub();m=new ModeStub();m.tileType=TILE_TYPE_CONVEYOR;runScenario("C",i,m,5,rows);i=new InputStub();m=new ModeStub();let p=reset(i,m);p.update();i.fire=true;rows.push(row("F",0,p));p.update();rows.push(row("F",1,p));i.fire=false;p.update();rows.push(row("F",2,p));i=new InputStub();m=new ModeStub();p=reset(i,m);p.update();i.shoot=true;rows.push(row("G",0,p));for(let t=1;t<=50;t++){p.update();rows.push(row("G",t,p));} export { rows };`;
    return (await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`)).rows;
}

test("actual Java and TypeScript Player mechanics stay synchronized", async (t) => {
    if (!toolAvailable("javac", ["-version"]) || !toolAvailable("java", ["-version"])) {
        t.skip("A JDK is not available; Java/TypeScript Player differential test skipped.");
        return;
    }
    const workDir = mkdtempSync(join(tmpdir(), "jackal-player-"));
    try {
        assert.deepEqual(await runTypeScript(), runJava(workDir));
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
});
