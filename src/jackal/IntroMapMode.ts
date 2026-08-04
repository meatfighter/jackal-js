// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/IntroMapMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMode } from "./IMode.js";
import { Modes } from "./Modes.js";
export class IntroMapMode implements IMode, IFadeListener {

  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_PAUSED: number = 1;
  public static readonly STATE_FADE_OUT: number = 2;
  public static readonly STATE_DONE: number = 3;  
  
  public static readonly PAUSE_DELAY: number = 250;
  
  public main: any = null as any;
  public gc: any = null as any;
  public delay: number = IntroMapMode.PAUSE_DELAY;
  public state: number = IntroMapMode.STATE_FADE_IN;  

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc; 
    
    main.requestSong(main.introSong);
    main.startFade(false, this);
  }

  public fadeCompleted(): void {
    if (this.state == IntroMapMode.STATE_FADE_IN) {
      this.state = IntroMapMode.STATE_PAUSED;
    } else {
      this.state = IntroMapMode.STATE_DONE;
      this.main.startPlayer();
      this.main.requestMode(Modes.GAME, this.gc);
    }
  }  

  public update(gc: any): void {
    
    if (this.state == IntroMapMode.STATE_PAUSED && --this.delay == 0) {
      this.state = IntroMapMode.STATE_FADE_OUT;
      this.main.startFade(true, this);
    }
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    if (this.state == IntroMapMode.STATE_DONE) {
      return;
    }
    
    this.main.map.draw(124, 92);
    
    this.main.drawString("This battle will", 416, 224, MainConstants.FONT_GRAY);
    this.main.drawString("make your blood", 416, 288, MainConstants.FONT_GRAY);
    this.main.drawString("boil.", 416, 352, MainConstants.FONT_GRAY);
    this.main.drawString("Good luck!", 480, 416, MainConstants.FONT_GRAY);
  }  
}
