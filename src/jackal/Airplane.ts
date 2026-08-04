// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Airplane.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Bomb } from "./Bomb.js";
import { Enemy } from "./Enemy.js";
import { Main } from "./Main.js";
export class Airplane extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "boolean") {
        let leftLandingPort = args[0];
            this.x = this.gameMode.player.x 
                    + (leftLandingPort ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);
    
                this.y = this.gameMode.cameraY - 124;
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let up = args[2];
            this.__construct(x, y);
                this.up = up;
                this.orientationIndex = 1;
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = this.gameMode.player.x 
                    + (this.main.random.nextBoolean() ? -Airplane.APPEAR_DISTANCE : Airplane.APPEAR_DISTANCE);
                if (this.x - 96 < this.gameMode.cameraX) {
                  this.x = this.gameMode.player.x + Airplane.APPEAR_DISTANCE;
                } else if (this.x + 96 > this.gameMode.cameraX + Main.DISPLAY_WIDTH) {
                  this.x = this.gameMode.player.x - Airplane.APPEAR_DISTANCE;
                }
    
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 5;
  public static readonly BOMB_DELAY: number = 68;
  public static readonly APPEAR_DISTANCE: number = 192;
  
  public bombDelay: number = 0;
  public up: boolean = false;
  public orientationIndex: number = 0;
  
    
  
  

  

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
