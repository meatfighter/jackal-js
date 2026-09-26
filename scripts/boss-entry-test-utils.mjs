export class Part {
    constructor(state = "playing", position = 7.25) {
        this.state = state;
        this.position = position;
        this.events = [];
    }

    getTransportState() {
        return this.state;
    }

    isTransportActive() {
        return this.state === "playing" || this.state === "paused";
    }

    pause() {
        this.events.push(["pause", this.position]);
        this.state = "paused";
    }

    resume() {
        this.events.push(["resume", this.position]);
        this.state = "playing";
    }

    stop() {
        this.events.push(["stop"]);
        this.state = "stopped";
        this.position = 0;
    }

    play() {
        this.events.push(["play"]);
        this.state = "playing";
        this.position = 0;
    }

    loop() {
        this.play();
    }
}
export function installSongs(f, mod) {
    const part = new Part();
    const old = mod.Song.fromIntroMusic(part);
    old.playing = true;
    const bossPart = new Part("stopped", 0);
    const boss = mod.Song.fromIntroMusic(bossPart);
    f.main.currentSong = f.main.requestedSong = old;
    f.main.bossSong = boss;
    return { part, old, bossPart, boss };
}
export function positionForTrigger(f) {
    f.world.cameraX = 0;
    f.world.cameraY = 256;
    f.world.maxCameraY = 512;
    f.player.x = 512;
    f.player.y = 640;
    f.world.triggerY = 8;
}
