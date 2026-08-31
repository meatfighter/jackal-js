import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { HitElement } from "./HitElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export abstract class Enemy extends HitElement {
    declare public solid: boolean;
    declare public mine: boolean;
    declare public solidX1: number;
    declare public solidY1: number;
    declare public solidX2: number;
    declare public solidY2: number;
    declare public mineX1: number;
    declare public mineY1: number;
    declare public mineX2: number;
    declare public mineY2: number;
    declare public bulletHits: number;
    declare public points: number;
    declare public explosionX: number;
    declare public explosionY: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.solid = false;
        this.mine = false;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 0;
        this.solidY2 = 0;
        this.mineX1 = 0;
        this.mineY1 = 0;
        this.mineX2 = 0;
        this.mineY2 = 0;
        this.bulletHits = 0;
        this.points = 0;
        this.explosionX = 0;
        this.explosionY = 0;
        this.playSoundOnRemove = false;
    }

    // other enemies will avoid bumping into this one
    // player will explode if it hits this enemy

    public playSoundOnRemove: boolean = true;

    public isSolidAt(px: number, py: number): boolean {
        px = javaFloat(px);
        py = javaFloat(py);

        px = javaFloat(px - this.x);
        py = javaFloat(py - this.y);

        return py >= this.solidY1 && py <= this.solidY2 && px >= this.solidX1 && px <= this.solidX2;
    }

    public isSolidBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        return this.overlap(
            x1,
            y1,
            x2,
            y2,
            javaFloat(this.x + this.solidX1),
            javaFloat(this.y + this.solidY1),
            javaFloat(this.x + this.solidX2),
            javaFloat(this.y + this.solidY2)
        );
    }

    public isMineAt(px: number, py: number): boolean {
        px = javaFloat(px);
        py = javaFloat(py);

        px = javaFloat(px - this.x);
        py = javaFloat(py - this.y);

        return py >= this.mineY1 && py <= this.mineY2 && px >= this.mineX1 && px <= this.mineX2;
    }

    public isMineBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        return this.overlap(
            x1,
            y1,
            x2,
            y2,
            javaFloat(this.x + this.mineX1),
            javaFloat(this.y + this.mineY1),
            javaFloat(this.x + this.mineX2),
            javaFloat(this.y + this.mineY2)
        );
    }

    public flatten(): void {
        this.explode();
    }

    public explode(): void {
        if (!this.removeFlag) {
            this.remove();
            Explosion.create(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            this.main.addPoints(this.points);
        }
    }

    // returns true if player bumped into the enemy
    public bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (invincible) {
            return false;
        }
        if (this.isMineBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public override remove(): void {
        this.removeFlag = true;
        if (this.playSoundOnRemove) {
            this.main.playHitExplodeSound();
        }
    }

    // returns true if attack successful
    public attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy
    public bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hitBounds(x1, y1, x2, y2)) {
            if (--this.bulletHits <= 0) {
                this.remove();
                Explosion.create(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
                this.main.addPoints(this.points);
            } else {
                this.main.playSoundAlways(this.main.bulletHitSound);
            }
            return true;
        } else {
            return false;
        }
    }

    public override checkBounds(maxY: number): void {
        if (this.solid) {
            if (javaFloat(this.y + this.solidY1) > maxY) {
                this.playSoundOnRemove = false;
                this.remove();
            }
        } else {
            if (javaFloat(this.y + this.hitY1) > maxY) {
                this.playSoundOnRemove = false;
                this.remove();
            }
        }
    }
}
