// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Grenade.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
export class Grenade extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.vx = 0;
    this.vy = 0;
    this.scale = 0;
    this.angle = 0;
    this.t = 0;
    this.enemies = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Grenade(...args);
  }
  private __construct_Grenade(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let angleLocal = args[2];
            this.x = xLocal;
                this.y = yLocal;
    
                let unit = this.main.createUnitVector(angleLocal);
                if (this.gameMode.player.longRange) {
                  this.vx = unit[0] * Grenade.VELOCITY2;
                  this.vy = unit[1] * Grenade.VELOCITY2;      
                } else {
                  this.vx = unit[0] * Grenade.VELOCITY;
                  this.vy = unit[1] * Grenade.VELOCITY;
                }
    
                this.enemies = this.gameMode.enemies;
    
                this.main.playSound(this.main.throwSound);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly DISTANCE: number = 320;
  public static readonly DISTANCE2: number = 400;
  public static readonly MIN_SCALE: number = 0.6; 
  public static readonly TRAVEL_TIME: number = 64;
  public static readonly HALF_TIME: number = javaIntDiv(Grenade.TRAVEL_TIME, 2);
  public static readonly GRAVITY: number = -2 * (1 - Grenade.MIN_SCALE) 
      / (Grenade.HALF_TIME * Grenade.HALF_TIME);
  public static readonly VELOCITY: number = Grenade.DISTANCE / Grenade.TRAVEL_TIME;  
  public static readonly VELOCITY2: number = Grenade.DISTANCE2 / Grenade.TRAVEL_TIME;  
  public static readonly HALF_GRAVITY: number = Grenade.GRAVITY / 2;
  public static readonly V0: number = -Grenade.GRAVITY * Grenade.HALF_TIME;
  public static readonly ANGULAR_VELOCITY: number = 10;
  public static readonly MARGIN: number = 21;






  
  

  public init(): void {
    this.layer = 4;    
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.scale = Grenade.MIN_SCALE + this.t * (Grenade.V0 + Grenade.HALF_GRAVITY * this.t);
    this.angle += Grenade.ANGULAR_VELOCITY;
    
    let x1 = this.x - Grenade.MARGIN;
    let y1 = this.y - Grenade.MARGIN;
    let x2 = this.x + Grenade.MARGIN;
    let y2 = this.y + Grenade.MARGIN;
    let hit = false;
    
    if (!this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
      for(let i = this.enemies.size() - 1; i >= 0; i--) {
        let enemyLocal = this.enemies.get(i);
        if (!enemyLocal.removeFlag 
            && enemyLocal.attack(x1, y1, x2, y2, AttackSource.PLAYER_WEAPON)) {            
          hit = true;
          break;
        }
      } 
    }
    
    if (hit || ++this.t > Grenade.TRAVEL_TIME) {
      this.remove();
      if (!hit) {
        this.main.playExplodeSound2();
      }
      new Explosion(this.x, this.y).setGrenadeExplosion(true);
    }
  }

  public render(): void {
    this.main.draw(this.main.grenade, this.x, this.y, this.angle, this.scale);
  }
  
}
