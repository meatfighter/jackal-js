// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/DifficultyMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMenuListener } from "./IMenuListener.js";
import { IMode } from "./IMode.js";
import { Main } from "./Main.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
export class DifficultyMode implements IMode, IFadeListener, IMenuListener {

  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_MENU: number = 1;
  public static readonly STATE_FADE_OUT: number = 2;
  public static readonly STATE_DONE: number = 3;
  
  public main: any = null as any;
  public gc: any = null as any;
  public input: any = null as any;  
  public state: number = DifficultyMode.STATE_FADE_IN;
  public menu: any = null as any;
  public optionSelectedFlag: boolean = false;
  public selectedIndex: number = 0;

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    this.menu = new Menu(448, 512, main, main.hardMode ? 1 : 0, 
        Menu.ICON_MISSILE, this, "normal", "hard");
    
    main.startFade(false, this);
  }

  public fadeCompleted(): void {
    if (this.state == DifficultyMode.STATE_FADE_IN) {
      this.state = DifficultyMode.STATE_MENU;
    } else if (this.state == DifficultyMode.STATE_FADE_OUT) {
      this.state = DifficultyMode.STATE_DONE;
      this.main.hardMode = (this.selectedIndex == 1);
      this.main.requestMode(Modes.INTRO, this.gc);
    }
  }  

  public selectionChanged(selectedIndex: any): void {
  }

  public optionSelected(selectedIndex: any): void {
    this.optionSelectedFlag = true;
    this.selectedIndex = selectedIndex;
    this.main.playSound(this.main.explodeSound2);
  }  

  public update(gc: any): void {
    this.menu.update();
    
    if (this.state == DifficultyMode.STATE_MENU && this.optionSelectedFlag) {
      this.state = DifficultyMode.STATE_FADE_OUT;
      this.main.startFade(true, this);
    }
  }

  public render(gc: any, g: any): void {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    if (this.state == DifficultyMode.STATE_DONE) {
      return;
    }
    
    this.main.drawString("difficulty", 352, 384, Main.FONT_GRAY);
    this.menu.render();
  }
}
