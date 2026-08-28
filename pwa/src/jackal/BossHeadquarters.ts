import { AttackSource } from "./AttackSource.js";
import { BossSuperTank } from "./BossSuperTank.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { TileDebris } from "./TileDebris.js";
import type { BossHeadquartersManager } from "./BossHeadquartersManager.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class BossHeadquarters extends Enemy {
    declare public flashing: boolean;
    declare public hits: number;
    declare public explodeDelay: number;
    declare public bossHeadquartersManager: BossHeadquartersManager | null;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.flashing = false;
        this.flashDelay = 0;
        this.flashIndex = 0;
        this.state = 0;
        this.hits = 0;
        this.explodeDelay = 0;
        this.explodeTime = 0;
        this.bossHeadquartersManager = null;
        this.player = null;
    }

    public constructor(arg0?: BossHeadquartersManager) {
        super();
        const argCount = arguments.length;
        this.__construct_BossHeadquarters(argCount, arg0);
    }

    private __construct_BossHeadquarters(argCount: number, arg0?: BossHeadquartersManager): void {
        if (argCount === 1) {
            let bossHeadquartersManagerLocal = arg0;
            this.x = 896;
            this.y = 96;
            this.bossHeadquartersManager = bossHeadquartersManagerLocal!;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_FLASHING: number = 0;
    public static readonly STATE_EXPLOSIONS: number = 1;
    public static readonly STATE_DEBRIS: number = 2;

    public static readonly FLASH_DELAY: number = 68;
    public static readonly FLASH_DURATION: number = 12;

    public static readonly HITS: number = 12;

    public static readonly EXPLODE_DELAY: number = 16;
    public static readonly EXPLODE_TIME: number = 5 * 91;

    public flashDelay: number = BossHeadquarters.FLASH_DELAY;
    public flashIndex: number = -1;
    public state: number = BossHeadquarters.STATE_FLASHING;

    public explodeTime: number = BossHeadquarters.EXPLODE_TIME;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 0;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 248;
        this.hitY2 = 152;

        this.points = 5000;
    }

    private startExploding(): void {
        this.state = BossHeadquarters.STATE_EXPLOSIONS;
        this.main.stopSong();
        this.explodeDelay = 1;
        this.bossHeadquartersManager!.remove();
        this.gameMode.destroyAll(this);
        this.main.playSoundAlways(this.main.headquartersExplodesSound);
    }

    private startDebris(): void {
        this.state = BossHeadquarters.STATE_DEBRIS;
        this.main.requestSong(this.main.superTankSong);
        new BossSuperTank(javaFloat(this.gameMode.player.x - 210), 32);
        let group = this.gameMode.groups[0];
        for (let i = group.length - 1; i >= 0; i--) {
            let g = group[i];
            new TileDebris(g[0], g[1], g[2], g[3]);
        }
    }

    public update(): void {
        if (this.state == BossHeadquarters.STATE_EXPLOSIONS) {
            if (--this.explodeDelay == 0) {
                this.explodeDelay = BossHeadquarters.EXPLODE_DELAY;
                for (let i = 0; i < 2; i++) {
                    new Explosion(
                        javaFloat(javaFloat(this.gameMode.cameraX + this.main.random.nextInt(1280)) - 128),
                        javaFloat(224 + this.main.random.nextInt(224))
                    ).setDamagesEnemies(false);
                }
                new Explosion(javaFloat(896 + this.main.random.nextInt(256)), javaFloat(96 + this.main.random.nextInt(416))).setDamagesEnemies(false);
            }
            if (--this.explodeTime == 0) {
                this.startDebris();
                this.remove();
            }
        } else {
            if (this.main.hasMissiles) {
                this.hitY2 = 152;
            } else {
                this.hitY2 = 192;
            }
        }
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.state == BossHeadquarters.STATE_FLASHING && attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            if (++this.hits == BossHeadquarters.HITS) {
                this.startExploding();
            } else {
                this.main.playHitExplodeSound();
                for (let i = 0; i < 7; i++) {
                    let Y = javaFloat(javaFloat(this.y + 160) - (i << 5));
                    for (let j = 0; j < 4; j++) {
                        if ((j == 0 || j == 3) && (i == 0 || i == 6)) {
                            continue;
                        }
                        new Explosion(
                            javaFloat(javaFloat(javaFloat(this.x + (j << 6)) + 12) + this.main.random.nextInt(32)),
                            javaFloat(Y + this.main.random.nextInt(8)),
                            true,
                            (i + 1) * 4,
                            0.5
                        );
                    }
                }
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hit(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        switch (this.state) {
            case BossHeadquarters.STATE_FLASHING:
                if (--this.flashDelay == 0) {
                    if (this.flashing) {
                        this.flashing = false;
                        this.flashDelay = BossHeadquarters.FLASH_DELAY;
                    } else {
                        this.flashing = true;
                        this.flashDelay = BossHeadquarters.FLASH_DURATION;
                    }
                }
                if (this.flashing) {
                    if (++this.flashIndex == 2) {
                        this.flashIndex = -1;
                    } else {
                        this.main.draw(this.main.headquartersLights[this.flashIndex], 932, 188);
                        this.main.draw(this.main.headquartersLights[this.flashIndex], 996, 220);
                        this.main.draw(this.main.headquartersLights[this.flashIndex], 1028, 220);
                        this.main.draw(this.main.headquartersLights[this.flashIndex], 1092, 188);
                    }
                }
                break;
        }
    }
}
