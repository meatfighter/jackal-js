// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TroopsTruck.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
export class TroopsTruck extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.state = 0;
    this.player = null as any;
    this.traveling = 0;
    this.troops = 0;
    this.troopsDelay = 0;
  }
  public constructor(arg0?: any, arg1?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_TroopsTruck(argCount, arg0, arg1);
  }
  private __construct_TroopsTruck(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly STATE_PAUSED: number = 0;
  public static readonly STATE_MOVING: number = 1;
  public static readonly STATE_RELEASING_TROOPS: number = 2;
  
  public static readonly SPEED: number = 1.25;
  public static readonly TRAVEL_TIME: number = 291;
  public static readonly PLAYER_DISTANCE: number = 256;
  public static readonly TROOPS: number = 12;
  public static readonly TROOPS_DELAY: number = 2 * 91;
  
  public state: number = TroopsTruck.STATE_PAUSED;

  public traveling: number = TroopsTruck.TRAVEL_TIME;
  public troops: number = TroopsTruck.TROOPS;

  
  

  public init(): void {
    super.init();   
    
    this.player = this.gameMode.player;
    
    this.layer = 4;
    
    this.bulletHits = 4;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 120;
    this.hitY2 = 76;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = 120;
    this.mineY2 = 76;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 128;
    this.solidY2 = 84;
    
    this.points = 1000;
    
    this.explosionX = 64;
    this.explosionY = 42;
  }

  public update(): void {
    switch(this.state) {
      case TroopsTruck.STATE_PAUSED:
        if (this.player.y - this.y <= TroopsTruck.PLAYER_DISTANCE) {
          this.state = TroopsTruck.STATE_MOVING;
        } 
        break;
      case TroopsTruck.STATE_MOVING:
        this.x += TroopsTruck.SPEED;
        if (--this.traveling == 0) {
          this.state = TroopsTruck.STATE_RELEASING_TROOPS;
        }
        break;
      case TroopsTruck.STATE_RELEASING_TROOPS:
        if (--this.troopsDelay < 0) {
          this.troopsDelay = TroopsTruck.TROOPS_DELAY;
          if (this.troops > 0) {
            this.troops--;
            new EnemySoldier(this.x + 16, this.y + 66, EnemySoldierType.TROOPS_TRUCK);
          }
        }
        break;
    }
  }

  public render(): void {
    this.main.draw(this.main.troopsTruck, this.x, this.y);
  }
}
