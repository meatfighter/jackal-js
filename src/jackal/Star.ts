// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Star.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class Star extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.type = 0;
    this.flashingIndex = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Star(...args);
  }
  private __construct_Star(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let typeLocal = args[2];
            this.x = xLocal;
                this.y = yLocal;
                this.type = typeLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPRITE_BROWN: number = 0;
  public static readonly SPRITE_GRAY: number = 1;
  public static readonly SPRITE_GREEN: number = 2;
  public static readonly SPRITE_YELLOW: number = 3;
  
  public static readonly TYPE_BROWN: number = 0;
  public static readonly TYPE_FLASHING: number = 1;
  public static readonly TYPE_GREEN: number = 2;


  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = -32;
    this.hitY1 = -32;
    this.hitX2 = 32;
    this.hitY2 = 32;
    
    this.mine = true;
    this.mineX1 = -8;
    this.mineY1 = -8;
    this.mineX2 = 8;
    this.mineY2 = 8;
    
    this.solid = true;
    this.solidX1 = -32;
    this.solidY1 = -32;
    this.solidX2 = 32;
    this.solidY2 = 32;
  }
  
  // returns true if player bumped into the enemy

  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    if (this.isMine(x1, y1, x2, y2)) {
      this.playSoundOnRemove = false;
      this.remove();
      switch(this.type) {
        case Star.TYPE_BROWN:
          this.main.playHitExplodeSound();
          this.gameMode.destroyAllWithinFrame();
          break;
        case Star.TYPE_FLASHING:
          this.gameMode.player.collectFlashingStar();
          break;
        case Star.TYPE_GREEN:
          this.main.gainExtraLife();
          break;
      }      
    }
    return false;
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public update(): void {
  }

  public render(): void {
    switch(this.type) {
      case Star.TYPE_BROWN:
        this.main.draw(this.main.stars[Star.SPRITE_BROWN], this.x - 32, this.y - 32);
        break;
      case Star.TYPE_GREEN:
        this.main.draw(this.main.stars[Star.SPRITE_GREEN], this.x - 32, this.y - 32);
        break;
      case Star.TYPE_FLASHING:
        this.main.draw(this.main.stars[this.flashingIndex], this.x - 32, this.y - 32);
        if (--this.flashingIndex < 0) {
          this.flashingIndex = 3;
        }
        break;
    }      
  }  
}
