// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/House.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { GameMode } from "./GameMode.js";
import { Help } from "./Help.js";
export class House extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let left = args[2];
            this.x = x;
                this.y = y;
                this.left = left;
    
                let X = (x) >> 5;
                let Y = (y) >> 5;
              
                this.groupIndex = this.gameMode.groupsMap[Y + 2][X + (left ? 0 : 5)]; 
    
                for(let i = 0; i < 6; i++) {
                  for(let j = 0; j < 6; j++) {
                    this.gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
                  }
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public groupIndex: number = 0;
  public left: boolean = false;
  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 192;
    this.hitY2 = 192;   
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource <= AttackSource.TRAVELING_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.playSoundOnRemove = false;
      this.main.playSound(this.main.hutSound);
      this.remove();
      new Explosion(this.x + 96, this.y + 96);
      this.gameMode.triggerGroup(this.groupIndex);
      new Help(this.x + 96, this.y + 84, this.left);
      this.main.addPoints(800);
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
