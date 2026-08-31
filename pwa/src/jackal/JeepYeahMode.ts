import { Color, type GameContainer, type Graphics } from "slick2d-ts";
import { ArrayList, javaFloat } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMode } from "./IMode.js";
import { JeepYeahBullet } from "./JeepYeahBullet.js";
import { JeepYeahExplosion } from "./JeepYeahExplosion.js";
import { JeepYeahFireLeft } from "./JeepYeahFireLeft.js";
import { JeepYeahFireRight } from "./JeepYeahFireRight.js";
import { JeepYeahPlane } from "./JeepYeahPlane.js";
import { Modes } from "./Modes.js";
import type { Main } from "./Main.js";
export class JeepYeahMode implements IMode, IFadeListener {
    public constructor(yeah: boolean) {
        this.yeah = yeah;
    }

    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_PAUSED: number = 1;
    public static readonly STATE_FADE_OUT: number = 2;
    public static readonly STATE_DONE: number = 3;

    public static readonly YEAH_DELAY: number = 136;
    public static readonly BULLET_DELAY: number = 11;

    public static readonly SMOKE_VX: number = 0.25;
    public static readonly SMOKE_VY: number = 0.5;

    public main: Main = null!;
    public gc: GameContainer = null!;
    public smokeX: number = 0;
    public smokeY: number = 0;
    public explosion: JeepYeahExplosion = null!;
    public leftPlane: JeepYeahPlane = null!;
    public rightPlane: JeepYeahPlane = null!;
    public fireRight: JeepYeahFireRight = null!;
    public fireLeft: JeepYeahFireLeft = null!;
    public bullets: ArrayList<JeepYeahBullet> = new ArrayList<JeepYeahBullet>();
    public bulletDelay: number = JeepYeahMode.BULLET_DELAY;
    public yeahVisible: number = JeepYeahMode.YEAH_DELAY;
    public yeah: boolean = false;
    public state: number = JeepYeahMode.STATE_FADE_IN;

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;

        this.leftPlane = new JeepYeahPlane(true);
        this.rightPlane = new JeepYeahPlane(false);
        this.fireLeft = new JeepYeahFireLeft();
        this.fireRight = new JeepYeahFireRight();

        main.startFade(false, this);
        main.requestSong(main.cutsceneSong);
    }

    public fadeCompleted(): void {
        if (this.state === JeepYeahMode.STATE_FADE_IN) {
            this.state = JeepYeahMode.STATE_PAUSED;
        } else if (this.state === JeepYeahMode.STATE_FADE_OUT) {
            this.state = JeepYeahMode.STATE_DONE;
            this.main.requestMode(Modes.MAP, this.gc);
        }
    }

    public update(gc: GameContainer): void {
        if (this.yeahVisible > 0) {
            this.yeahVisible--;
        }

        this.smokeX = javaFloat(this.smokeX + JeepYeahMode.SMOKE_VX);
        if (this.smokeX >= 64) {
            this.smokeX = javaFloat(this.smokeX - 64);
        }

        this.smokeY = javaFloat(this.smokeY + JeepYeahMode.SMOKE_VY);
        if (this.smokeY >= 32) {
            this.smokeY = javaFloat(this.smokeY - 32);
        }

        if (this.explosion === null || this.explosion.remove) {
            this.explosion = new JeepYeahExplosion(136, 608);
        }
        this.explosion.update();

        if (this.state === JeepYeahMode.STATE_PAUSED) {
            this.leftPlane.update();
            this.rightPlane.update();

            if (this.rightPlane.z > 0) {
                this.state = JeepYeahMode.STATE_FADE_OUT;
                this.main.startFade(true, this);
            }
        }

        this.fireLeft.update();
        this.fireRight.update();

        if (--this.bulletDelay === 0) {
            this.bulletDelay = JeepYeahMode.BULLET_DELAY;
            this.bullets.add(new JeepYeahBullet());
        }
        for (let i = this.bullets.size() - 1; i >= 0; i--) {
            let bullet = this.bullets.get(i);
            bullet.update();
            if (bullet.remove) {
                this.bullets.removeAt(i);
            }
        }
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state === JeepYeahMode.STATE_DONE) {
            return;
        }

        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 3; x++) {
                this.main.drawImage(this.main.smoke, 864 + (x << 6) - this.smokeX, 288 + (y << 5) - this.smokeY);
            }
        }
        this.explosion.render(this.main);

        this.main.jeepYeah.draw(0, 256);

        this.leftPlane.render(this.main, g);
        this.rightPlane.render(this.main, g);
        this.fireLeft.render(this.main);
        this.fireRight.render(this.main);

        for (let i = this.bullets.size() - 1; i >= 0; i--) {
            this.bullets.get(i).render(this.main);
        }

        if (this.yeahVisible === 0) {
            this.main.drawImage(this.main.yeahs[0], 452, 128);
            this.main.drawImage(this.main.yeahs[1], 534, 226);
            if (this.yeah) {
                this.main.drawImage(this.main.yeahs[2], 500, 164);
            } else {
                this.main.drawImage(this.main.yeahs[3], 485, 164);
            }
        }
    }
}
