import type { Main } from "./Main.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class JeepYeahBullet {
    public static readonly VX0: number = -2;
    public static readonly VY0: number = -5;
    public static readonly G: number = 0.25;
    public static readonly ANGLE_SPEED: number = -5;
    public static readonly SCALE_SPEED: number = javaFloat(0.015);

    public x: number = 308;
    public y: number = 408;
    public vx: number = javaFloat(JeepYeahBullet.VX0);
    public vy: number = javaFloat(JeepYeahBullet.VY0);
    public angle: number = -50;
    public remove: boolean = false;
    public scale: number = 1;

    public update(): void {
        this.angle = javaFloat(this.angle + JeepYeahBullet.ANGLE_SPEED);
        this.vy = javaFloat(this.vy + JeepYeahBullet.G);
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        this.scale = javaFloat(this.scale - JeepYeahBullet.SCALE_SPEED);
        if (this.scale <= 0) {
            this.remove = true;
        }
    }

    public render(main: Main): void {
        main.drawRotatedAtCenterScaled(main.jeepYeahBullet, this.x, this.y, -10, -2, this.angle, this.scale);
    }
}
