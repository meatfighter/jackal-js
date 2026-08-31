import type { Image } from "slick2d-ts";

import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class EnemyBullet extends GameElement {
    declare public travelTime: number;
    declare public vx: number;
    declare public vy: number;
    declare public sprite: Image | null;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.travelTime = 0;
        this.vx = 0;
        this.vy = 0;
        this.sprite = null;
        this.player = null;
    }

    private constructor() {
        super();
    }

    public static cannonball(x: number, y: number, dx: number, dy: number, travelTime: number): EnemyBullet {
        const bullet = new EnemyBullet();
        x = javaFloat(x);
        y = javaFloat(y);
        dx = javaFloat(dx);
        dy = javaFloat(dy);

        bullet.x = x;
        bullet.y = y;
        bullet.vx = javaFloat(EnemyBullet.SPEED * dx);
        bullet.vy = javaFloat(EnemyBullet.SPEED * dy);
        bullet.travelTime = travelTime;
        bullet.sprite = bullet.main.cannonball;
        bullet.enemyBullet = true;
        return bullet;
    }

    public static colored(x: number, y: number, dx: number, dy: number, travelTime: number, white: boolean): EnemyBullet {
        const bullet = new EnemyBullet();
        x = javaFloat(x);
        y = javaFloat(y);
        dx = javaFloat(dx);
        dy = javaFloat(dy);

        bullet.x = x;
        bullet.y = y;
        bullet.vx = javaFloat(EnemyBullet.SPEED * dx);
        bullet.vy = javaFloat(EnemyBullet.SPEED * dy);
        bullet.travelTime = travelTime;
        bullet.sprite = white ? bullet.main.whiteBullet : bullet.main.yellowBullet;
        bullet.enemyBullet = true;
        return bullet;
    }

    public static coloredWithSpeedMode(x: number, y: number, dx: number, dy: number, travelTime: number, white: boolean, multiplySpeed: boolean): EnemyBullet {
        const bullet = new EnemyBullet();
        x = javaFloat(x);
        y = javaFloat(y);
        dx = javaFloat(dx);
        dy = javaFloat(dy);

        bullet.x = x;
        bullet.y = y;
        if (multiplySpeed) {
            bullet.vx = javaFloat(EnemyBullet.SPEED * dx);
            bullet.vy = javaFloat(EnemyBullet.SPEED * dy);
        } else {
            bullet.vx = dx;
            bullet.vy = dy;
        }
        bullet.travelTime = travelTime;
        bullet.sprite = white ? bullet.main.whiteBullet : bullet.main.yellowBullet;
        bullet.enemyBullet = true;
        return bullet;
    }

    public static readonly SPEED: number = 2.5;

    public static readonly MARGIN: number = 16;

    public init(): void {
        this.layer = 4;

        this.player = this.gameMode.player;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        if (
            this.gameMode.isOutsideOfFrameBounds(
                javaFloat(this.x - EnemyBullet.MARGIN),
                javaFloat(this.y - EnemyBullet.MARGIN),
                javaFloat(this.x + EnemyBullet.MARGIN),
                javaFloat(this.y + EnemyBullet.MARGIN)
            )
        ) {
            this.remove();
        } else if (--this.travelTime < 0 || this.gameMode.isSolid(this.x, this.y) || this.player!.attackAt(this.x, this.y)) {
            this.remove();
            new BulletHit(this.x, this.y);
        }
    }

    public render(): void {
        this.main.drawCenteredAt(this.sprite!, this.x, this.y);
    }
}
