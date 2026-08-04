// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossSuperTankGun.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { RotatingGun } from "./RotatingGun.js";
enum BossSuperTankGunState { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }
export class BossSuperTankGun extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1) {
        let bossSuperTank = args[0];
            this.bossSuperTank = bossSuperTank;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly RECOIL_DURATION: number = 17;
  public static readonly RECOIL_AMPLITUDE: number = 8;
  public static readonly recoils: any[] = javaArray(BossSuperTankGun.RECOIL_DURATION, 0);
  public static readonly PAUSE_AFTER_RECOIL: number = 17;
  public static readonly PAUSE_BETWEEN_GROUPS: number = 50;
  public static readonly GROUP_SIZE: number = 3;
  public static readonly ROTATION_SPEED: number = 0.9;
  public static readonly BULLET_DISTANCE: number = 480;
  public static readonly GARAGE_BULLET_DISTANCE: number = 464;
  public static readonly YELLOW_BULLET_SPEED: number = 1.75 * EnemyBullet.SPEED;
  public static readonly BULLET_TRAVEL_TIME: number = (BossSuperTankGun.BULLET_DISTANCE / BossSuperTankGun.YELLOW_BULLET_SPEED);  
  public static readonly X_OFFSET: number = 244;
  public static readonly Y_OFFSET: number = 88;
  
  static {
    for(let i = 1; i <= BossSuperTankGun.RECOIL_DURATION; i++) {
      BossSuperTankGun.recoils[i - 1] = BossSuperTankGun.RECOIL_AMPLITUDE 
          * Math.sin(i * Math.PI / (BossSuperTankGun.RECOIL_DURATION + 1));      
    }       
  }
  
  public state: any = RotatingGun.State.PAUSED_BETWEEN_FIRING;
  public angle: number = 90;
  public recoil: number = 0;
  public pause: number = 2 * 91;
  public group: number = 0;
  public groupSize: number = BossSuperTankGun.GROUP_SIZE;
  public recoilIndex: number = 0;
  public bossSuperTank: any = null as any;
  
  

  public init(): void {
    super.init();
    
    this.layer = 3;
  }

  public update(): void {  
    
    this.x = this.bossSuperTank.x + BossSuperTankGun.X_OFFSET;
    this.y = this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET;
    
    switch(this.state) {
      case BossSuperTankGunState.FIRING:
        if (--this.recoilIndex < 0) {
          if (++this.group == this.groupSize) {
            this.recoil = 0;
            this.state = RotatingGun.State.TRACKING;
            this.pause = BossSuperTankGun.PAUSE_BETWEEN_GROUPS;
            this.group = 0;
          } else {
            this.recoil = 0;
            this.state = RotatingGun.State.PAUSED_BETWEEN_FIRING;
            this.pause = BossSuperTankGun.PAUSE_AFTER_RECOIL;
          }
        } else {
          this.recoil = BossSuperTankGun.recoils[this.recoilIndex]; 
        }
        break;
      case BossSuperTankGunState.PAUSED_BETWEEN_FIRING:
        if (this.pause > 0) {
          this.pause--;
        } else {
          this.fire();
        }
        break;
      case BossSuperTankGunState.TRACKING: {
        if (this.pause > 0) {
          this.pause--;
        } 
        let player = this.gameMode.player;
        let targetAngle = ((
            Math.atan2(player.y - (this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET) * 180 / Math.PI), 
                player.x - (this.bossSuperTank.x + BossSuperTankGun.X_OFFSET)));
        let deltaAngle = (targetAngle - this.angle + 180) % 360;
        if (deltaAngle < 0) {
          deltaAngle += 180;
        } else {
          deltaAngle -= 180;
        }
        if (Math.abs(deltaAngle) < BossSuperTankGun.ROTATION_SPEED) {
          this.angle = targetAngle;
          if (this.pause == 0) {
            this.fire();
          }
        } else {
          if (deltaAngle < 0) {
            this.angle -= BossSuperTankGun.ROTATION_SPEED;
          } else {
            this.angle += BossSuperTankGun.ROTATION_SPEED;
          }
        }
        break;
      }
    }
    
    if (this.bossSuperTank.removeFlag) {
      this.remove();
    }
  }
  
  private fire(): void {
    this.state = RotatingGun.State.FIRING;
    this.recoilIndex = BossSuperTankGun.RECOIL_DURATION - 1;
    let ang = ((this.angle) * Math.PI / 180);
    let cos = Math.cos(ang);
    let sin = Math.sin(ang);
    new EnemyBullet(
        this.bossSuperTank.x + BossSuperTankGun.X_OFFSET + 93 * cos, 
        this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET + 93 * sin, 
        BossSuperTankGun.YELLOW_BULLET_SPEED * cos + this.bossSuperTank.vx, 
        BossSuperTankGun.YELLOW_BULLET_SPEED * sin, 
        BossSuperTankGun.BULLET_TRAVEL_TIME, false, false);
  }
  
  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy

  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    return false;
  }  

  public render(): void {  
    this.main.drawRotated(this.main.superGuns[this.bossSuperTank.colorIndex == 0 ? 0 : 1], 
        this.bossSuperTank.x + BossSuperTankGun.X_OFFSET, this.bossSuperTank.y + BossSuperTankGun.Y_OFFSET, 
        -this.recoil - 34, -32, this.angle);
  }
  
}
