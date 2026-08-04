// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/CannonTruck.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
export class CannonTruck extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let right = args[2];
            this.x = x;
                this.y = y;
                this.right = right;
                this.directionIndex = right ? 0 : 1;
    
                this.explosionX = 48;
                this.explosionY = 48;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly STATE_SLEEPING: number = 0;
  public static readonly STATE_RECOILING: number = 1;
  
  public static readonly SHOOT_DELAY: number = 91;
  public static readonly RECOIL_DELAY: number = 16;
  public static readonly RECOIL_HALF: number = 8;

  public static readonly BULLET_ORIGIN_X: number = 48;
  public static readonly BULLET_ORIGIN_Y: number = 25;
  
  public static readonly BULLET_TRAVEL_TIME: number = 137;
  public static readonly BULLET_SPEED: number = 2;
  public static readonly BULLET_ANGLE: number = ((10) * Math.PI / 180);
  
  public static readonly DIRS: any[] = [
    [ [ (CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4)), 
        (CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4)) ], ],
    [ [ (CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 - CannonTruck.BULLET_ANGLE)),
        (CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 - CannonTruck.BULLET_ANGLE)) ],
      [ (CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 + CannonTruck.BULLET_ANGLE)),
        (CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 + CannonTruck.BULLET_ANGLE)) ], ],
    [ [ (CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 - 2 * CannonTruck.BULLET_ANGLE)),
        (CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 - 2 * CannonTruck.BULLET_ANGLE)) ],
      [ (CannonTruck.BULLET_SPEED * Math.cos(Math.PI / 4 + 2 * CannonTruck.BULLET_ANGLE)),
        (CannonTruck.BULLET_SPEED * Math.sin(Math.PI / 4 + 2 * CannonTruck.BULLET_ANGLE)) ], ],    
  ];
  
  public directionIndex: number = 0;
  public right: boolean = false;
  public state: number = CannonTruck.STATE_SLEEPING;
  public delay: number = 1;
  public fires: number = 0;
  public ready: boolean = false;
  
  

  public init(): void {
    super.init();  
    
    this.layer = 3;
    
    this.bulletHits = 8;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 88;
    this.hitY2 = 88;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = 88;
    this.mineY2 = 88;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 96;
    this.solidY2 = 96;
    
    this.points = 1500;
  }
  
  private fire(): void {
    this.state = CannonTruck.STATE_RECOILING;
    this.delay = CannonTruck.RECOIL_DELAY;
    
    switch(this.fires) {
      case 0:
        new EnemyBullet(this.x + CannonTruck.BULLET_ORIGIN_X, this.y + CannonTruck.BULLET_ORIGIN_Y, 
            this.right ? CannonTruck.DIRS[0][0][0] : -CannonTruck.DIRS[0][0][0], CannonTruck.DIRS[0][0][1], 
                CannonTruck.BULLET_TRAVEL_TIME);  
        break;
      case 1:
        new EnemyBullet(this.x + CannonTruck.BULLET_ORIGIN_X, this.y + CannonTruck.BULLET_ORIGIN_Y, 
            this.right ? CannonTruck.DIRS[1][0][0] : -CannonTruck.DIRS[1][0][0], CannonTruck.DIRS[1][0][1], 
                CannonTruck.BULLET_TRAVEL_TIME); 
        new EnemyBullet(this.x + CannonTruck.BULLET_ORIGIN_X, this.y + CannonTruck.BULLET_ORIGIN_Y, 
            this.right ? CannonTruck.DIRS[1][1][0] : -CannonTruck.DIRS[1][1][0], CannonTruck.DIRS[1][1][1], 
                CannonTruck.BULLET_TRAVEL_TIME); 
        break; 
      case 2:
        new EnemyBullet(this.x + CannonTruck.BULLET_ORIGIN_X, this.y + CannonTruck.BULLET_ORIGIN_Y, 
            this.right ? CannonTruck.DIRS[2][0][0] : -CannonTruck.DIRS[2][0][0], CannonTruck.DIRS[2][0][1], 
                CannonTruck.BULLET_TRAVEL_TIME); 
        new EnemyBullet(this.x + CannonTruck.BULLET_ORIGIN_X, this.y + CannonTruck.BULLET_ORIGIN_Y, 
            this.right ? CannonTruck.DIRS[2][1][0] : -CannonTruck.DIRS[2][1][0], CannonTruck.DIRS[2][1][1], 
                CannonTruck.BULLET_TRAVEL_TIME); 
        break;        
    }    
    this.fires++;
  }

  public update(): void {
    if (!this.ready) {
      if (this.y + 48 > this.gameMode.cameraY) {
        this.ready = true;
      } else {
        return;
      }
    }
    switch(this.state) {
      case CannonTruck.STATE_SLEEPING:
        if (--this.delay == 0) {
          this.fire();          
        }
        break;
      case CannonTruck.STATE_RECOILING:
        if (--this.delay == 0) {
          if (this.fires == 3) {
            this.state = CannonTruck.STATE_SLEEPING;
            this.delay = CannonTruck.SHOOT_DELAY;
            this.fires = 0;
          } else {
            this.fire();
          }
        }
        break;
    }
  }

  public render(): void {
    if (this.state == CannonTruck.STATE_RECOILING && this.delay > CannonTruck.RECOIL_HALF) {
      this.main.draw(this.main.cannonTruck[this.directionIndex][1], this.x, this.y);
    } else {
      this.main.draw(this.main.cannonTruck[this.directionIndex][0], this.x, this.y);
    }
  }
}
