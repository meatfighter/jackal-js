import { Color, type GameContainer, type Graphics } from "slick2d-ts";

import { MainConstants } from "../java/MainConstants.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMenuListener } from "./IMenuListener.js";
import type { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
import type { IInput } from "./IInput.js";
import type { Main } from "./Main.js";
export class OptionsMode implements IMode, IFadeListener, IMenuListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_MENU: number = 1;
    public static readonly STATE_FADE_OUT: number = 2;
    public static readonly STATE_DONE: number = 3;

    public main: Main = null;
    public gc: GameContainer = null;
    public input: IInput = null;
    public state: number = OptionsMode.STATE_FADE_IN;
    public menu: Menu = null;
    public optionSelectedFlag: boolean = false;
    public selectedIndex: number = 0;

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;
        this.input = main.input;

        this.menu = new Menu(448, 512, main, 0, Menu.ICON_TANK, this, "input", "difficulty", "done");

        main.startFade(false, this);
    }

    public fadeCompleted(): void {
        if (this.state == OptionsMode.STATE_FADE_IN) {
            this.state = OptionsMode.STATE_MENU;
        } else if (this.state == OptionsMode.STATE_FADE_OUT) {
            this.state = OptionsMode.STATE_DONE;
            switch (this.selectedIndex) {
                case 0:
                    this.main.requestMode(Modes.INPUT, this.gc);
                    break;
                case 1:
                    this.main.requestMode(Modes.DIFFICULTY, this.gc);
                    break;
                case 2:
                    this.main.requestMode(Modes.INTRO, this.gc);
                    break;
            }
        }
    }

    public selectionChanged(selectedIndex: number): void {}

    public optionSelected(selectedIndex: number): void {
        this.optionSelectedFlag = true;
        this.selectedIndex = selectedIndex;
        this.main.playSound(this.main.missileSound);
    }

    public update(gc: GameContainer): void {
        this.menu.update();

        if (this.state == OptionsMode.STATE_MENU && this.optionSelectedFlag) {
            this.state = OptionsMode.STATE_FADE_OUT;
            this.main.startFade(true, this);
        }
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        if (this.state == OptionsMode.STATE_DONE) {
            return;
        }

        this.main.drawString("options", 400, 384, MainConstants.FONT_GRAY);
        this.menu.render();
    }
}
