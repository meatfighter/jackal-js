// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/FriendlyHelicopter.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Airplane } from "./Airplane.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { GameElement } from "./GameElement.js";
import { Main } from "./Main.js";
export class FriendlyHelicopter extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean" && typeof args[3] === "boolean") {
        let x = args[0];
        let y = args[1];
        let landing = args[2];
        let leftStop = args[3];
            this.x = x;
                this.y = y;
                this.player = this.gameMode.player;
                this.leftStop = leftStop;
    
                if (landing) {
                  this.slowRotor = false;
                  this.z = 0;
                  this.state = FriendlyHelicopter.STATE_FLYING_TOWARD;
                  this.rotorSpeed = 30;
                  this.changeLayer(7);
                } else {
                  this.slowRotor = true;
                  this.z = 1;
                  this.state = FriendlyHelicopter.STATE_PICK_UP;
                  this.rotorSpeed = 15;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly DROP_OFF_DELAY: number = 91;
  public static readonly FLIGHT_SPEED: number = 6;
  public static readonly ACCELERATION_TIME: number = 45;
  public static readonly ACCELERATION: number = FriendlyHelicopter.FLIGHT_SPEED / FriendlyHelicopter.ACCELERATION_TIME;
  public static readonly TAKE_OFF_DELAY: number = 91 * 2;
  public static readonly TURN_RADIUS1: number = 192;
  public static readonly TURN_RADIUS2: number = 192;
  public static readonly TURNS_LENGTH: number = 0;
  public static readonly INITIAL_PLANE_SPAWN_DELAY: number = 3 * 91;
  public static readonly PLANE_SPAWN_DELAY: number = 10 * 91;
  
  public static readonly STATE_PICK_UP: number = 0;
  public static readonly STATE_REVVING_UP: number = 1;
  public static readonly STATE_LIFTING_OFF: number = 2;
  public static readonly STATE_ACCELERATING: number = 3;
  public static readonly STATE_TURNING: number = 4;
  public static readonly STATE_FLYING_AWAY: number = 5;
  public static readonly STATE_FLYING_TOWARD: number = 6;
 
  private static readonly Z_GROUND: number = 1;
  private static readonly Z_SKY: number = 0;
  
  private static readonly Y0: number = 128;
  private static readonly Y1: number = 116;
  private static readonly K1: number = FriendlyHelicopter.Y1 / FriendlyHelicopter.Y0;
  private static readonly Z0: number = FriendlyHelicopter.K1 / (FriendlyHelicopter.K1 - 1);  
  
  private static readonly SHADOW_Y0: number = 36;
  private static readonly SHADOW_K: number = (FriendlyHelicopter.Y1 - FriendlyHelicopter.SHADOW_Y0) / FriendlyHelicopter.SHADOW_Y0;
  
  private static readonly HEIGHTS: any[] = javaArray(91, 0);
  private static readonly TURNS: any[] = null as any; 
  
  static {
    
    for(let i = 0; i < 91; i++) {
      FriendlyHelicopter.HEIGHTS[i] = 0.5 * (1 + Math.cos(Math.PI * i / 91.0));
    }
    
    let turn1Steps = Math.ceil(
        2 * Math.PI * (45 / 360) * FriendlyHelicopter.TURN_RADIUS1 / FriendlyHelicopter.FLIGHT_SPEED);
    let turn2Steps = Math.ceil(
        2 * Math.PI * (225 / 360) * FriendlyHelicopter.TURN_RADIUS2 / FriendlyHelicopter.FLIGHT_SPEED);
    FriendlyHelicopter.TURNS_LENGTH = turn1Steps + turn2Steps;
    FriendlyHelicopter.TURNS = java2DArray(FriendlyHelicopter.TURNS_LENGTH, 3, 0); // (x, y, angle)
    
    for(let i = 0; i < turn1Steps; i++) {
      let percent = i / turn1Steps;
      let helicopterAngle = 45 * percent;
      let angle = percent * (Math.PI / 4); 
      let X = FriendlyHelicopter.TURN_RADIUS1 - FriendlyHelicopter.TURN_RADIUS1 * Math.cos(angle);
      let Y = FriendlyHelicopter.TURN_RADIUS1 * -Math.sin(angle);
      FriendlyHelicopter.TURNS[i][0] = X;
      FriendlyHelicopter.TURNS[i][1] = Y;
      FriendlyHelicopter.TURNS[i][2] = helicopterAngle;
    }
    
    let distance = FriendlyHelicopter.TURN_RADIUS1 + FriendlyHelicopter.TURN_RADIUS2;
    let k = 1 / Math.sqrt(2);
    let centerX = FriendlyHelicopter.TURN_RADIUS1 - k * distance;
    let centerY = -k * distance;
    
    for(let i = 0; i < turn2Steps; i++) {
      let percent = i / turn2Steps;
      let helicopterAngle = 45 - 225 * percent;
      let angle = (Math.PI / 4 - Math.PI * 1.25 * percent);
      let X = centerX + FriendlyHelicopter.TURN_RADIUS2 * Math.cos(angle);
      let Y = centerY + FriendlyHelicopter.TURN_RADIUS2 * Math.sin(angle);
      
      FriendlyHelicopter.TURNS[turn1Steps + i][0] = X;
      FriendlyHelicopter.TURNS[turn1Steps + i][1] = Y;
      FriendlyHelicopter.TURNS[turn1Steps + i][2] = helicopterAngle;
    }
  }
  
  public angle: number = 0;
  public rotorAngle: number = 0;
  public rotorSpeed: number = 0;
  public slowRotor: boolean = false;
  public z: number = 0;
  public leftStop: boolean = false;
  public state: number = 0;
  public walkingSoldiers: number = 0;
  public player: any = null as any;
  public dropOffDelay: number = 45;
  public preparingToTakeOff: number = FriendlyHelicopter.TAKE_OFF_DELAY;
  public revvingUp: number = 0;
  public liftingOff: number = 0;
  public accelerating: number = 0;
  public turning: number = 0;
  public planeSpawnDelay: number = FriendlyHelicopter.INITIAL_PLANE_SPAWN_DELAY;
  public turnX: number = 0;
  public turnY: number = 0;
  public createdPlane: boolean = false;
  
  

  public init(): void {
    this.layer = 3;
  }

  public remove(): void {
    this.removeFlag = true;
    this.main.stopSound(this.main.helicopterSound2);
  }  

  public update(): void {
    
    if (this.slowRotor) {
      this.rotorAngle -= this.rotorSpeed;
    } else {
      this.rotorAngle -= this.rotorSpeed;
    }
    if (this.rotorAngle <= -360) {
      this.rotorAngle += 360;
    }
    
    if (this.state >= FriendlyHelicopter.STATE_ACCELERATING) {
      this.main.playSoundIfNotPlaying(this.main.helicopterSound2);
    }    
    
    switch(this.state) {
      case FriendlyHelicopter.STATE_PICK_UP: {
        if (this.player.pows > 0) {
          let dx = this.player.x - this.x;
          
          if (Math.abs(this.player.y - this.y) <= 128) {
            if (--this.planeSpawnDelay == 0) {              
              this.planeSpawnDelay = FriendlyHelicopter.PLANE_SPAWN_DELAY;
              if (this.gameMode.stageIndex == 5) {
                new EnemyHelicopter(true);
              } else if (this.gameMode.stageIndex == 4) {
                new Airplane(this.leftStop);
              } else if (this.gameMode.stageIndex == 1) {
                if (!this.createdPlane) {
                  this.createdPlane = true;
                  new Airplane(this.leftStop);
                }                
              }
            }            
          }
          
          if (this.player.y > this.y - 66 && this.player.y < this.y + 49 
              && ((!this.leftStop && dx > 0 && dx < 320) 
                  || (this.leftStop && dx <0&&dx> -320))) {
            if (this.dropOffDelay > 0) {
              this.dropOffDelay--;
            } else {
              this.dropOffDelay = FriendlyHelicopter.DROP_OFF_DELAY;
              new FriendlySoldier(this.player.x, this.player.y + 28, this,
                  this.player.pows == 1);
              this.player.dropOffPOW();
              this.walkingSoldiers++;
            } 
          }
        }
        if (this.walkingSoldiers == 0 && this.player.y < this.y + 80
            && ((FriendlySoldier.count == 0 && this.player.pows == 0) 
                || this.player.y < this.y - 512)) {
          if (this.preparingToTakeOff > 0) {
            this.preparingToTakeOff--;
          } else {
            this.state = FriendlyHelicopter.STATE_REVVING_UP;            
          }
        } else {
          this.preparingToTakeOff = FriendlyHelicopter.TAKE_OFF_DELAY;
        }
        break;
      }
      case FriendlyHelicopter.STATE_REVVING_UP:        
        this.rotorSpeed = 15 + 15 * this.revvingUp / 90;
        if (this.revvingUp >= 45) {
          this.slowRotor = false;
          this.changeLayer(7);
        }
        if (++this.revvingUp == 91) {
          this.rotorSpeed = 30;
          this.state = FriendlyHelicopter.STATE_LIFTING_OFF;
        }
        break;
      case FriendlyHelicopter.STATE_LIFTING_OFF:
        if (this.liftingOff < 91) {
          this.z = FriendlyHelicopter.HEIGHTS[this.liftingOff];
        } else {
          this.z = 0;
        }
        if (++this.liftingOff == 114) {
          this.state = FriendlyHelicopter.STATE_ACCELERATING;
        }
        break;
      case FriendlyHelicopter.STATE_ACCELERATING:
        this.y -= this.accelerating * FriendlyHelicopter.ACCELERATION;
        if (++this.accelerating == FriendlyHelicopter.ACCELERATION_TIME) {
          this.state = FriendlyHelicopter.STATE_TURNING;
          this.turnX = this.x;
          this.turnY = this.y;
        }
        break;
      case FriendlyHelicopter.STATE_TURNING:
        this.x = this.turnX + FriendlyHelicopter.TURNS[this.turning][0];
        this.y = this.turnY + FriendlyHelicopter.TURNS[this.turning][1];
        this.angle = FriendlyHelicopter.TURNS[this.turning][2];
        if (++this.turning == FriendlyHelicopter.TURNS_LENGTH) {
          this.state = FriendlyHelicopter.STATE_FLYING_AWAY;
          this.angle = -180;
        }
        break;
      case FriendlyHelicopter.STATE_FLYING_AWAY:
        this.y += FriendlyHelicopter.FLIGHT_SPEED;
        if (this.y > this.gameMode.cameraY + Main.DISPLAY_HEIGHT + 128) {
          this.remove();
        }
        break;
      case FriendlyHelicopter.STATE_FLYING_TOWARD:
        this.y -= FriendlyHelicopter.FLIGHT_SPEED;
        if (this.y < this.gameMode.cameraY - 128) {
          this.remove();
        }        
        break;
    }
  }
  
  public friendlySoldierPickedUp(): void {    
    this.walkingSoldiers--;
    if (!this.main.friendlySoldierPickedUp()) {
      this.main.playSound(this.main.helicopterPickupSound);
    }
  }

  public render(): void {       
    let blade = null;
    let offset = 0;
    if (this.slowRotor) {
      blade = this.main.friendlyHelicopters[2];
      offset = -9;
    } else {
      blade = this.main.friendlyHelicopters[3];
      offset = -14;      
    }
        
    if (this.z < 1) {
      let s0 = 1 + FriendlyHelicopter.SHADOW_K * this.z;
      let s1 = 1 - this.z;
      this.main.drawRotated(this.main.friendlyHelicopters[1], 
          this.x + 32 * s1, this.y + 37 * s1, -10, -18, this.angle, s0, 1 - this.z);
    }
    
    let scale = FriendlyHelicopter.Z0 / (FriendlyHelicopter.Z0 - this.z);    
    this.main.drawRotated(this.main.friendlyHelicopters[0], this.x, this.y, -36, -60, this.angle, scale);
    this.main.drawRotated(blade, this.x, this.y, 0, offset, this.rotorAngle, scale);
    this.main.drawRotated(blade, this.x, this.y, 0, offset, this.rotorAngle + 90, scale);
    this.main.drawRotated(blade, this.x, this.y, 0, offset, this.rotorAngle + 180, scale);
    this.main.drawRotated(blade, this.x, this.y, 0, offset, this.rotorAngle + 270, scale);
  }
}
