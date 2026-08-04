// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/RotatingGun.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
enum RotatingGunState { FIRING, PAUSED_BETWEEN_FIRING, TRACKING }
export class RotatingGun extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[3] === "boolean") {
        let x = args[0];
        let y = args[1];
        let bossGarageManager = args[2];
        let white = args[3];
            this.x = x;
                this.y = y;    
                this.white = white;
                this.bossGarageManager = bossGarageManager;
                this.groupSize = 2;
                this.sprites = this.main.grayGuns;
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let white = args[2];
            this.x = x;
                this.y = y;    
                this.white = white;
                this.sprites = this.main.grayGuns;
        return;
    } else     if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let x = args[0];
        let y = args[1];
        let type = args[2];
            this.x = x;
                this.y = y;
                this.type = type;
                this.white = type != RotatingGun.TYPE_BROWN;
                this.groupSize = 1;
    
                switch(type) {
                  case RotatingGun.TYPE_GREEN:
                    this.sprites = this.main.greenGuns;
                    break;
                  case RotatingGun.TYPE_BROWN:
                    this.sprites = this.main.brownGuns;
                    break;
                  default:
                    this.sprites = this.main.grayGuns;
                    break;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly TYPE_GRAY: number = 0;
  public static readonly TYPE_GREEN: number = 1;
  public static readonly TYPE_BROWN: number = 2;
  
  public static readonly RECOIL_DURATION: number = 17;
  public static readonly RECOIL_AMPLITUDE: number = 8;
  public static readonly recoils: any[] = javaArray(RotatingGun.RECOIL_DURATION, 0);
  public static readonly PAUSE_AFTER_RECOIL: number = 17;
  public static readonly PAUSE_BETWEEN_GROUPS: number = 50;
  public static readonly GROUP_SIZE: number = 3;
  public static readonly ROTATION_SPEED: number = 0.9;
  public static readonly BULLET_DISTANCE: number = 400;
  public static readonly GARAGE_BULLET_DISTANCE: number = 464;
  public static readonly BULLET_TRAVEL_TIME: number = (RotatingGun.BULLET_DISTANCE / EnemyBullet.SPEED);
  public static readonly GARAGE_BULLET_TRAVEL_TIME: number = (RotatingGun.GARAGE_BULLET_DISTANCE / EnemyBullet.SPEED);
  public static readonly YELLOW_BULLET_SPEED: number = 1.25;
  
  static {
    for(let i = 1; i <= RotatingGun.RECOIL_DURATION; i++) {
      RotatingGun.recoils[i - 1] = RotatingGun.RECOIL_AMPLITUDE 
          * Math.sin(i * Math.PI / (RotatingGun.RECOIL_DURATION + 1));      
    }       
  }
  
  public state: any = State.PAUSED_BETWEEN_FIRING;
  public angle: number = 90;
  public recoil: number = 0;
  public pause: number = 0;
  public group: number = 0;
  public groupSize: number = RotatingGun.GROUP_SIZE;
  public recoilIndex: number = 0;
  public white: boolean = false;
  public bossGarageManager: any = null as any;
  public type: number = 0;
  public sprites: any[] = null as any;
  
    
  
  
  
  

  public init(): void {
    super.init();
    
    this.layer = 3;
    
    this.bulletHits = 3;
    
    this.hitX1 = -40;
    this.hitY1 = -40;
    this.hitX2 = 40;
    this.hitY2 = 40;
    
    this.mine = true;
    this.mineX1 = -28;
    this.mineY1 = -28;
    this.mineX2 = 28;
    this.mineY2 = 28;
    
    this.solid = true;
    this.solidX1 = -64;
    this.solidY1 = -64;
    this.solidX2 = 64;
    this.solidY2 = 64;
    
    this.points = 500;
  }

  public update(): void {   
    
    switch(this.state) {
      case RotatingGunState.FIRING:
        if (--this.recoilIndex < 0) {
          if (++this.group == this.groupSize) {
            this.recoil = 0;
            this.state = State.TRACKING;
            this.pause = RotatingGun.PAUSE_BETWEEN_GROUPS;
            this.group = 0;
          } else {
            this.recoil = 0;
            this.state = State.PAUSED_BETWEEN_FIRING;
            this.pause = RotatingGun.PAUSE_AFTER_RECOIL;
          }
        } else {
          this.recoil = RotatingGun.recoils[this.recoilIndex]; 
        }
        break;
      case RotatingGunState.PAUSED_BETWEEN_FIRING:
        if (this.pause > 0) {
          this.pause--;
        } else {
          this.fire();
        }
        break;
      case RotatingGunState.TRACKING: {
        if (this.pause > 0) {
          this.pause--;
        } 
        let player = this.gameMode.player;
        let targetAngle = ((
            Math.atan2(player.y - this.y, player.x - this.x) * 180 / Math.PI));
        let deltaAngle = (targetAngle - this.angle + 180) % 360;
        if (deltaAngle < 0) {
          deltaAngle += 180;
        } else {
          deltaAngle -= 180;
        }
        if (Math.abs(deltaAngle) < RotatingGun.ROTATION_SPEED) {
          this.angle = targetAngle;
          if (this.pause == 0) {
            this.fire();
          }
        } else {
          if (deltaAngle < 0) {
            this.angle -= RotatingGun.ROTATION_SPEED;
          } else {
            this.angle += RotatingGun.ROTATION_SPEED;
          }
        }
        if (!this.white) {
          if (this.angle < 45) {
            this.angle = 45;
          } else if (this.angle > 135) {
            this.angle = 135;
          }
        }
        break;
      }
    }
  }
  
  private fire(): void {
    this.state = State.FIRING;
    this.recoilIndex = RotatingGun.RECOIL_DURATION - 1;
    let ang = ((this.angle) * Math.PI / 180);
    let cos = Math.cos(ang);
    let sin = Math.sin(ang);
    if (this.bossGarageManager != null) {
      if (this.white) {
        new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, cos, sin, 
            RotatingGun.GARAGE_BULLET_TRAVEL_TIME, true);
      } else {
        new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, 
          RotatingGun.YELLOW_BULLET_SPEED * cos, RotatingGun.YELLOW_BULLET_SPEED * sin, 
          RotatingGun.GARAGE_BULLET_TRAVEL_TIME, false);
      }
    } else if (this.white) {
      new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, cos, sin, 
          RotatingGun.BULLET_TRAVEL_TIME, true);
    } else {
      new EnemyBullet(this.x + 60 * cos, this.y + 60 * sin, 
          RotatingGun.YELLOW_BULLET_SPEED * cos, RotatingGun.YELLOW_BULLET_SPEED * sin, 
          RotatingGun.BULLET_TRAVEL_TIME, false);
    }
  }

  public render(): void {  
    this.main.drawRotated(this.sprites[this.recoil == 0 ? 0 : 1], 
        this.x, this.y, -28, this.recoil - 60, this.angle + 90);
  }
}
