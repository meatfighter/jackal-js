import { MainConstants } from "../java/MainConstants.js";
import type { IInput } from "./IInput.js";
import type { IMenuListener } from "./IMenuListener.js";
import type { Main } from "./Main.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Menu {
    public constructor(x: number, y: number, main: Main, selectedIndex: number, icon: number, menuListener: IMenuListener, ...options: string[]) {
        this.x = javaFloat(x);
        this.y = javaFloat(y);
        this.main = main;
        this.selectedIndex = selectedIndex;
        this.icon = icon;
        this.menuListener = menuListener;
        this.options = options;

        this.input = main.input;
        this.iconY = javaFloat(16 + (selectedIndex << 6));

        this.input.clearKeyPressedRecord();
    }

    public static readonly ICON_JEEP: number = 0;
    public static readonly ICON_GRENADE: number = 1;
    public static readonly ICON_MISSILE: number = 2;
    public static readonly ICON_EXPLOSION: number = 3;
    public static readonly ICON_TANK: number = 4;
    public static readonly ICON_BROWN_TANK: number = 5;

    private static readonly SELECT_STATE_STATIONARY: number = 0;
    private static readonly SELECT_STATE_ACCELERATING: number = 1;
    private static readonly SELECT_STATE_DECELERATING: number = 2;

    private static readonly SELECT_TIME: number = 8;

    private static readonly I_SELECT_TIME2: number = javaFloat(1 / (Menu.SELECT_TIME * Menu.SELECT_TIME));

    public main: Main = null!;
    public options: string[] = null!;
    public input: IInput = null!;
    public x: number = 0;
    public y: number = 0;
    public iconY: number = 0;
    public selectedIndex: number = 0;
    public menuListener: IMenuListener = null!;
    public icon: number = 0;
    public buttonReleased: boolean = false;
    public selectState: number = Menu.SELECT_STATE_STATIONARY;
    public iconVy: number = 0;
    public iconMidY: number = 0;
    public iconA: number = 0;
    public targetY: number = 0;
    public selectionMade: boolean = false;
    public inputEnabled: boolean = true;
    public konamiCodeTest: boolean = false;

    public enableKonamiCodeTest(): void {
        this.konamiCodeTest = true;
    }

    public setInputEnabled(inputEnabled: boolean): void {
        this.inputEnabled = inputEnabled;
    }

    private moveIcon(): void {
        if (this.menuListener !== null) {
            this.menuListener.selectionChanged(this.selectedIndex);
        }
        this.selectState = Menu.SELECT_STATE_ACCELERATING;
        this.targetY = javaFloat(16 + (this.selectedIndex << 6));
        this.iconMidY = javaFloat(0.5 * javaFloat(this.iconY + this.targetY));
        this.iconVy = 0;
        this.iconA = javaFloat(javaFloat(2 * javaFloat(this.targetY - this.iconY)) * Menu.I_SELECT_TIME2);
    }

    public update(): void {
        if (this.konamiCodeTest) {
            const konamiCode = this.main.konamiCode;
            if (konamiCode !== null) {
                konamiCode.update();
                if (konamiCode.gettingClose() || (konamiCode.enabled && !konamiCode.keyReleased)) {
                    return;
                }
            }
        }

        if (!(this.input.isDown() || this.input.isUp() || this.input.isShoot() || this.input.isFire())) {
            this.buttonReleased = true;
        }

        if (this.buttonReleased) {
            if (this.input.isDown()) {
                this.buttonReleased = false;
                if (this.inputEnabled && !this.selectionMade && this.selectedIndex !== this.options.length - 1) {
                    this.selectedIndex++;
                    this.moveIcon();
                }
            } else if (this.input.isUp()) {
                this.buttonReleased = false;
                if (this.inputEnabled && !this.selectionMade && this.selectedIndex !== 0) {
                    this.selectedIndex--;
                    this.moveIcon();
                }
            } else if (this.input.isFire() || this.input.isShoot()) {
                this.buttonReleased = false;
                if (!this.selectionMade && this.inputEnabled) {
                    this.selectionMade = true;
                    if (this.menuListener !== null) {
                        this.menuListener.optionSelected(this.selectedIndex);
                    }
                }
            }
        }

        if (!this.selectionMade && this.input.isEnter() && this.inputEnabled) {
            this.selectionMade = true;
            if (this.menuListener !== null) {
                this.menuListener.optionSelected(this.selectedIndex);
            }
        }

        switch (this.selectState) {
            case Menu.SELECT_STATE_ACCELERATING:
                this.iconVy = javaFloat(this.iconVy + this.iconA);
                this.iconY = javaFloat(this.iconY + this.iconVy);
                if (this.iconA > 0) {
                    if (this.iconY >= this.iconMidY) {
                        this.selectState = Menu.SELECT_STATE_DECELERATING;
                    }
                } else {
                    if (this.iconY <= this.iconMidY) {
                        this.selectState = Menu.SELECT_STATE_DECELERATING;
                    }
                }
                break;
            case Menu.SELECT_STATE_DECELERATING:
                this.iconVy = javaFloat(this.iconVy - this.iconA);
                this.iconY = javaFloat(this.iconY + this.iconVy);
                if (this.iconA > 0) {
                    if (this.iconY >= this.targetY || this.iconVy <= 0) {
                        this.selectState = Menu.SELECT_STATE_STATIONARY;
                        this.iconY = this.targetY;
                    }
                } else {
                    if (this.iconY <= this.targetY || this.iconVy >= 0) {
                        this.selectState = Menu.SELECT_STATE_STATIONARY;
                        this.iconY = this.targetY;
                    }
                }
                break;
        }
    }

    public render(): void {
        this.main.translateGraphics(this.x, this.y);
        for (let i = this.options.length - 1; i >= 0; i--) {
            this.main.drawString(this.options[i], 0, i << 6, MainConstants.FONT_GRAY);
        }

        switch (this.icon) {
            case Menu.ICON_JEEP:
                this.main.drawRotated(this.main.players[0][0], -72, this.iconY, 0);
                break;
            case Menu.ICON_GRENADE:
                this.main.drawRotated(this.main.grenade, -64, this.iconY, 0);
                break;
            case Menu.ICON_MISSILE:
                this.main.drawRotated(this.main.playerMissile, -64, this.iconY, 0);
                break;
            case Menu.ICON_EXPLOSION:
                this.main.drawRotated(this.main.explosions[0], -64, this.iconY, 0);
                break;
            case Menu.ICON_TANK:
                this.main.drawRotated(this.main.bossBlueTanks[0][0], -72, this.iconY, 0);
                break;
            case Menu.ICON_BROWN_TANK:
                this.main.drawRotated(this.main.brownTanks[0], -72, this.iconY, 0);
                break;
        }
        this.main.popGraphics();
    }
}
