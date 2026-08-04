// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Airplane.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { Bomb } from "./Bomb.js";
import { Enemy } from "./Enemy.js";
export class Airplane extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.bombDelay = 0;
    this.up = false;
    this.orientationIndex = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Airplane(...args);
  }
  private __construct_Airplane(...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "boolean") {
        let leftLandingPort = args[0];
            this.x = this.gameMode.player.x 
                    + (leftLandingPort ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);
    
                this.y = this.gameMode.cameraY - 124;
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let xLocal2 = args[0];
        let yLocal2 = args[1];
        let upLocal = args[2];
            this.__construct_Airplane(xLocal2, yLocal2);
                this.up = upLocal;
                this.orientationIndex = 1;
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = this.gameMode.player.x 
                    + (this.main.random.nextBoolean() ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);
                if (this.x - 96 < this.gameMode.cameraX) {
                  this.x = this.gameMode.player.x + Airplane.APPEAR_DISTANCE;
                } else if (this.x + 96 > this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH) {
                  this.x = this.gameMode.player.x - Airplane.APPEAR_DISTANCE;
                }
    
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 5;
  public static readonly BOMB_DELAY: number = 68;
  public static readonly APPEAR_DISTANCE: number = 192;



  
    
  
  

  

  public init(): void {
    super.init();
    
    this.layer = 7;

    this.hitX1 = -40;
    this.hitY1 = -40;
    this.hitX2 = 40;
    this.hitY2 = 40;
    
    this.points = 1000;
  }

  public remove(): void {
    this.removeFlag = true;
    if (this.playSoundOnRemove) {
      this.main.playHitExplodeSound(); 
    }
    this.main.stopSound(this.main.planeSound);
  }  

  public update(): void {

    this.main.playSoundIfNotPlaying(this.main.planeSound);
    
    if (this.up) {
      this.y -= Airplane.SPEED;
      if (this.y < this.gameMode.cameraY - 384) {
        this.playSoundOnRemove = false;
        this.remove();
      }
    } else {
      this.y += Airplane.SPEED;
    }
    
    if (--this.bombDelay < 0) {
      this.bombDelay = Airplane.BOMB_DELAY;
      new Bomb(this.x, this.y, true);      
    }
  }
  
  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    return false;
  }  
  
  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public render(): void {
    this.main.draw(this.main.airplanes[this.orientationIndex][1], this.x + 24, this.y + 24);
    this.main.draw(this.main.airplanes[this.orientationIndex][0], this.x - 60, this.y - 62);
  }  
}
