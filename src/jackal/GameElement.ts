// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/GameElement.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Main } from "./Main.js";
export abstract class GameElement {
  protected __initializeJavaSubclassDefaults(): void {
  }
  public constructor(...args: any[]) {
    this.__construct_GameElement(...args);
  }
  private __construct_GameElement(...args: any[]): void {
    if (args.length === 0) {
            this.main = Main.mainInstance;
                this.gameMode = Main.gameMode;
    

                this.__initializeJavaSubclassDefaults();
                this.init();
    
                this.gameMode.add(this);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public main: any = null as any;
  public gameMode: any = null as any;
  
  public removeFlag: boolean = false;    
  public enemy: boolean = false;
  public enemyBullet: boolean = false;
  public x: number = 0;
  public y: number = 0;
  public layer: number = 0;
  public changeLayerValue: number = -1;
  
  
  
  public changeLayer(layer: any): void {
    this.changeLayerValue = layer;
  }
  
  public remove(): void {
    this.removeFlag = true;
  }
  
  public checkBounds(maxY: any): void {    
  }
  
  public abstract init(): void ;
  public abstract update(): void ;  
  public abstract render(): void ;
}
