// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ParkedBrownTank.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class ParkedBrownTank extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_ParkedBrownTank(...args);
  }
  private __construct_ParkedBrownTank(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  

  public init(): void {
    super.init();  
    
    this.layer = 3;
    
    this.bulletHits = 3;
    
    this.hitX1 = -40;
    this.hitY1 = -40;
    this.hitX2 = 40;
    this.hitY2 = 40;
    
    this.mine = true;
    this.mineX1 = -28;
    this.mineY1 = -28;
    this.mineX2 = 28;
    this.mineY2 = 28;
    
    this.solid = true;
    this.solidX1 = -48;
    this.solidY1 = -48;
    this.solidX2 = 48;
    this.solidY2 = 48;
    
    this.points = 50;
  }

  public update(): void {    
  }  

  public render(): void {
    this.main.drawCentered(this.main.parkedBrownTank, this.x, this.y);
  } 
}
