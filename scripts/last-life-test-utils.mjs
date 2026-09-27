import assert from "node:assert/strict";
import { createServer } from "./vite-test-server.mjs";
import { fileURLToPath } from "node:url";
export async function loadLastLifeModules(transforms = {}) {
    const server = await createServer({
        plugins: [
            {
                name: "last-life-in-memory-counterexample",
                enforce: "pre",
                transform(source, id) {
                    for (const [name, transform] of Object.entries(transforms))
                        if (id.replaceAll("\\", "/").endsWith("/jackal/" + name + ".ts")) return transform(source);
                    return null;
                }
            }
        ],
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        configFile: false,
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true, watch: null }
    });
    const names = [
        "Main",
        "Player",
        "GameMode",
        "BossSuperTank",
        "BossBlueTank",
        "BossShipGun",
        "BossShipManager",
        "BossGarage",
        "Song",
        "Modes",
        "AttackSource"
    ];
    const result = { server };
    try {
        for (const name of names) result[name] = (await server.ssrLoadModule(`/src/jackal/${name}.ts`))[name];
        result.java = await server.ssrLoadModule("/src/java/JavaRuntime.ts");
        return result;
    } catch (error) {
        await server.close();
        throw error;
    }
}
export function makeLastLifeWorld(modules) {
    const {
        Main,
        Player,
        GameMode,
        java: { ArrayList, Random }
    } = modules;
    const main = new Main();
    Main.mainInstance = main;
    const world = new GameMode();
    Main.gameMode = world;
    main.mode = world;
    world.main = main;
    main.random = new Random(123);
    main.input = Object.fromEntries(
        ["isDown", "isUp", "isLeft", "isRight", "isFire", "isShoot", "isPause", "isFullscreenTogglePressed", "isEscape", "update"].map((n) => [n, () => false])
    );
    main.input.snap = main.input.clearKeyPressedRecord = () => {};
    world.input = main.input;
    world.gc = {};
    const events = [];
    main.playSound = (s) => events.push(["sound", s]);
    main.playSoundAlways = (s) => events.push(["always", s]);
    main.playSoundAtVolume = (s, v) => events.push(["volume", s, v]);
    main.requestMode = function (mode) {
        events.push(["mode", mode]);
        this.stopAllSongs();
        this.mode = { destination: mode };
    };
    main.playerExplodeSound = "explode";
    main.extraLifeSound = "extraLife";
    main.pauseSound = "pause";
    main.random = new Random(123);
    main.konamiCode = { enabled: true };
    world.elements = Array.from({ length: 8 }, () => new ArrayList());
    world.mapWidth = world.mapHeight = 64;
    world.typesMap = Array.from({ length: 64 }, () => Array(64).fill(GameMode.TYPE_EMPTY));
    world.groupsMap = Array.from({ length: 64 }, () => Array(64).fill(0));
    world.triggerMap = Array.from({ length: 64 }, () => []);
    world.groups = [];
    world.triggedGroups = [];
    world.triggerY = -1;
    world.directionsWidth = world.directionsHeight = 64;
    world.directions = Array(4096).fill(0n);
    world.stageIndex = 1;
    world.playing = true;
    world.maxCameraY = 512;
    world.maxCameraX = 1024;
    world.player = new Player();
    world.player.x = 256;
    world.player.y = 256;
    main.extraLives = 0;
    main.score = 0;
    main.extraLivesStr = "0";
    const originalLose = main.loseLife.bind(main);
    main.loseLife = () => {
        events.push(["consume"]);
        originalLose();
    };
    return {
        main,
        world,
        player: world.player,
        events,
        tick() {
            assert.equal(main.mode, world, "No stale world tick permitted");
            world.update(world.gc);
        }
    };
}
