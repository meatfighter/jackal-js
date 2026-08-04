// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/InvisibleStar.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { Star } from "./Star.js";
export class InvisibleStar extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let x = args[0];
        let y = args[1];
        let type = args[2];
            this.x = x;
                this.y = y;
                this.type = type;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public type: number = 0;
  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = -32;
    this.hitY1 = -32;
    this.hitX2 = 32;
    this.hitY2 = 32;
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x, this.y);
      this.main.addPoints(5000);
      new Star(this.x, this.y, this.type);
      return true;
    } else {
      return false;
    }
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
