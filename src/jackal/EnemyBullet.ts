// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/EnemyBullet.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
export class EnemyBullet extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.travelTime = 0;
    this.vx = 0;
    this.vy = 0;
    this.sprite = null as any;
    this.player = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_EnemyBullet(...args);
  }
  private __construct_EnemyBullet(...args: any[]): void {
    if (args.length === 5 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number") {
        let xLocal3 = args[0];
        let yLocal3 = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTimeLocal3 = args[4];
            this.x = xLocal3;
                this.y = yLocal3;
                this.vx = EnemyBullet.SPEED * dx;
                this.vy = EnemyBullet.SPEED * dy;
                this.travelTime = travelTimeLocal3;
                this.sprite = this.main.cannonball;
    
                this.enemyBullet = true;
        return;
    } else     if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number" && typeof args[5] === "boolean") {
        let xLocal2 = args[0];
        let yLocal2 = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTimeLocal2 = args[4];
        let white = args[5];
            this.x = xLocal2;
                this.y = yLocal2;
                this.vx = EnemyBullet.SPEED * dx;
                this.vy = EnemyBullet.SPEED * dy;
                this.travelTime = travelTimeLocal2;
                this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;
    
                this.enemyBullet = true;
        return;
    } else     if (args.length === 7 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number" && typeof args[5] === "boolean" && typeof args[6] === "boolean") {
        let xLocal = args[0];
        let yLocal = args[1];
        let dx = args[2];
        let dy = args[3];
        let travelTimeLocal = args[4];
        let white = args[5];
        let multiplySpeed = args[6];
            this.x = xLocal;
                this.y = yLocal;
                if (multiplySpeed) {
                  this.vx = EnemyBullet.SPEED * dx;
                  this.vy = EnemyBullet.SPEED * dy;
                } else {
                  this.vx = dx;
                  this.vy = dy;
                }
                this.travelTime = travelTimeLocal;
                this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;
    
                this.enemyBullet = true;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 2.5;
  
  public static readonly MARGIN: number = 16;





  
  
  
   
  
    

  public init(): void {
    this.layer = 4;
    
    this.player = this.gameMode.player;
  }

  public update(): void {    
    
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.gameMode.isOutsideOfFrame(
        this.x - EnemyBullet.MARGIN, this.y - EnemyBullet.MARGIN, this.x + EnemyBullet.MARGIN, this.y + EnemyBullet.MARGIN)) {
      this.remove();
    } else if (--this.travelTime < 0 || this.gameMode.isSolid(this.x, this.y)
        || this.player.attack(this.x, this.y)) {
      this.remove();
      new BulletHit(this.x, this.y);
    } 
  }

  public render(): void { 
    this.main.drawCentered(this.sprite, this.x, this.y);
  }
}
