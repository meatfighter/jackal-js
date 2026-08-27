import { Color, type GameContainer, type Graphics } from "slick2d-ts";

import { MainConstants } from "../java/MainConstants.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMenuListener } from "./IMenuListener.js";
import type { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
import type { IInput } from "./IInput.js";
import type { Main } from "./Main.js";
export class DifficultyMode implements IMode, IFadeListener, IMenuListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_MENU: number = 1;
    public static readonly STATE_FADE_OUT: number = 2;
    public static readonly STATE_DONE: number = 3;

    public main: Main = null;
    public gc: GameContainer = null;
    public input: IInput = null;
    public state: number = DifficultyMode.STATE_FADE_IN;
    public menu: Menu = null;
    public optionSelectedFlag: boolean = false;
    public selectedIndex: number = 0;

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;
        this.input = main.input;

        this.menu = new Menu(448, 512, main, main.hardMode ? 1 : 0, Menu.ICON_MISSILE, this, "normal", "hard");

        main.startFade(false, this);
    }

    public fadeCompleted(): void {
        if (this.state == DifficultyMode.STATE_FADE_IN) {
            this.state = DifficultyMode.STATE_MENU;
        } else if (this.state == DifficultyMode.STATE_FADE_OUT) {
            this.state = DifficultyMode.STATE_DONE;
            this.main.hardMode = this.selectedIndex == 1;
            this.main.requestMode(Modes.INTRO, this.gc);
        }
    }

    public selectionChanged(selectedIndex: number): void {}

    public optionSelected(selectedIndex: number): void {
        this.optionSelectedFlag = true;
        this.selectedIndex = selectedIndex;
        this.main.playSound(this.main.explodeSound2);
    }

    public update(gc: GameContainer): void {
        this.menu.update();

        if (this.state == DifficultyMode.STATE_MENU && this.optionSelectedFlag) {
            this.state = DifficultyMode.STATE_FADE_OUT;
            this.main.startFade(true, this);
        }
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state == DifficultyMode.STATE_DONE) {
            return;
        }

        this.main.drawString("difficulty", 352, 384, MainConstants.FONT_GRAY);
        this.menu.render();
    }
}
