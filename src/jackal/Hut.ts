// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Hut.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameMode } from "./GameMode.js";
import { GrayTank } from "./GrayTank.js";
export class Hut extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "boolean") {
        let x = args[0];
        let y = args[1];
        let shack = args[2];
        let tank = args[3];
            this.x = x;
                this.y = y;
                this.shack = shack;
                this.tank = tank;
    
                let X = (x) >> 5;
                let Y = (y) >> 5;
              
                if (shack) {
                  this.groupIndex = this.gameMode.groupsMap[Y + 3][X + 2]; 
                } else {
                  this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1]; 
                }
    
                for(let i = shack ? 5 : 4; i >= 0; i--) {
                  for(let j = 0; j < 6; j++) {
                    this.gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
                  }
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public groupIndex: number = 0;
  public shack: boolean = false;
  public tank: boolean = false;
  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 192;
    this.hitY2 = this.shack ? 192 : 160;   
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource <= AttackSource.TRAVELING_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.playSoundOnRemove = false;
      this.main.playSound(this.main.hutSound);
      this.remove();
      new Explosion(this.x + (this.shack ? 96 : 80), this.y + 96);
      this.gameMode.triggerGroup(this.groupIndex);
      if (this.tank) {
        new GrayTank(this.x + 86, this.y + 96, true);
        this.main.addPoints(500);
      } else {
        new FriendlySoldier(
            this.x + 96, this.y + 48 + (this.shack ? 64 : 0), 
                FriendlySoldierType.WEAPON_CARRIER, 0, this.shack);
        this.main.addPoints(300);
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  }  

  public explode(): void {
  }  

  public update(): void {
  }

  public render(): void {
  }  
}
