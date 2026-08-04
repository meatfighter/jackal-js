// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Mine.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class Mine extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.spriteIndex = 0;
    this.visible = false;
    this.player = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Mine(...args);
  }
  private __construct_Mine(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
    
                this.player = this.gameMode.player;
    
                this.explosionX = 16;
                this.explosionY = 16;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly VISIBLE_DISTANCE: number = 300;
  
  public static readonly VISIBLE_DISTANCE2: number = Mine.VISIBLE_DISTANCE * Mine.VISIBLE_DISTANCE;



  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 32;
    this.hitY2 = 32;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = 24;
    this.mineY2 = 24;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 32;
    this.solidY2 = 32;    
  }  

  public update(): void {
    let dx = this.player.x - (this.x + 16);
    let dy = this.player.y - (this.y + 16);
    this.visible = (dx * dx + dy * dy) <= Mine.VISIBLE_DISTANCE2;
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public render(): void {
    if (this.visible) {
      if (++this.spriteIndex == 4) {
        this.spriteIndex = 0;
      }
      this.main.draw(this.main.mines[this.spriteIndex], this.x, this.y);
    }
  }
}
