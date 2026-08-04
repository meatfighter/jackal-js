// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/LoadingMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IMode } from "./IMode.js";
export class LoadingMode implements IMode {

  public main: any = null as any;
  public gc: any = null as any;
  public percentWidth: number = 0; // 0 to 516

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc;
  }

  public update(gc: any): void {
    try {
      this.percentWidth = javaInt((516 * this.main.loadNext()));
    } catch (t) {
      throw new SlickException("Loading error", t);
    }
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    this.main.draw(this.main.controllers[0], 256, 307);
    g.setWorldClip(254, 305, this.percentWidth, 222);
    this.main.draw(this.main.controllers[1], 256, 307);
    g.clearWorldClip();
    this.main.drawString("loading", 400, 557, MainConstants.FONT_GRAY);
  }  
}
