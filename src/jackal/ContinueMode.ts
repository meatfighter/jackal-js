// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ContinueMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMenuListener } from "./IMenuListener.js";
import { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
export class ContinueMode implements IMode, IFadeListener, IMenuListener {

  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_MENU: number = 1;
  public static readonly STATE_FADE_OUT: number = 2;
  public static readonly STATE_DONE: number = 3;
  
  public main: any = null as any;
  public gc: any = null as any;
  public input: any = null as any;  
  public state: number = ContinueMode.STATE_FADE_IN;
  public menu: any = null as any;
  public optionSelectedFlag: boolean = false;
  public selectedIndex: number = 0;

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    this.menu = new Menu(480, 512, main, 0, Menu.ICON_GRENADE, this, "yes", "no");
    
    main.stopAllSound();
    main.requestSong(main.continueSong);
    main.startFade(false, this);
  }

  public fadeCompleted(): void {
    if (this.state == ContinueMode.STATE_FADE_IN) {
      this.state = ContinueMode.STATE_MENU;
    } else if (this.state == ContinueMode.STATE_FADE_OUT) {
      this.state = ContinueMode.STATE_DONE;      
      if (this.selectedIndex == 0) {
        this.main.continuePlayer();
        this.main.requestMode(Modes.GAME, this.gc);
      } else {
        this.main.requestMode(Modes.INTRO, this.gc);
      }
    }
  }  

  public selectionChanged(selectedIndex: any): void {
  }

  public optionSelected(selectedIndex: any): void {
    this.optionSelectedFlag = true;
    this.selectedIndex = selectedIndex;  
    this.main.stopSong();
  }  

  public update(gc: any): void {
    this.menu.update();
    
    if (this.state == ContinueMode.STATE_MENU && this.optionSelectedFlag) {
      this.state = ContinueMode.STATE_FADE_OUT;
      this.main.startFade(true, this);
    }
  }

  public render(gc: any, g: any): void {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    if (this.state == ContinueMode.STATE_DONE) {
      return;
    }
    
    this.main.drawString("continue", 384, 384, MainConstants.FONT_GRAY);
    this.menu.render();
  }
}
