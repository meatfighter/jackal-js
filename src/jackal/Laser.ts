// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Laser.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class Laser extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
                this.playSoundOnRemove = false;
    
                if (this.gameMode.cameraY <= y + 896) {
                  this.main.playSound(this.main.laserSound);
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  

  public init(): void {
    super.init();
    
    this.mine = true;
    this.mineX1 = -1;
    this.mineY1 = 0;
    this.mineX2 = 1;
    this.mineY2 = 832;
    
    this.solid = true;
    this.solidX1 = -16;
    this.solidY1 = 0;
    this.solidX2 = 16;
    this.solidY2 = 832;    
  }

  public explode(): void {    
  }
  
  // returns true if player bumped into the enemy

  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    if (invincible) {
      return false;
    }
    if (this.isMine(x1, y1, x2, y2)) {
      return true;
    } else {
      return false;
    }
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
  }
}
