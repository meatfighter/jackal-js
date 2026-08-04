// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Gate.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class Gate extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
        let bossGarageManager = args[2];
            this.__construct(x, y);
                this.bossGarageManager = bossGarageManager;
        return;
    } else     if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        
                this.groupIndex = this.gameMode.groupsMap[(y) >> 5][((x) >> 5) + 1];
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public groupIndex: number = 0;
  public bossGarageManager: any = null as any;
  
  
  
  

  public init(): void {
    super.init();
    
    this.layer = 0;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 192;
    this.hitY2 = 128;   
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + 96, this.y + 64);
      this.gameMode.triggerGroup(this.groupIndex);
      if (this.bossGarageManager != null) {
        this.bossGarageManager.gateOpen();
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
