// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Fire.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Flame } from "./Flame.js";
import { GameElement } from "./GameElement.js";
export class Fire extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.vx = 0;
    this.vy = 0;
    this.dx = 0;
    this.dy = 0;
    this.length = 0;
    this.angle = 0;
    this.state = 0;
    this.delay = 0;
    this.flickerCounter = 0;
    this.flickerIndex = 0;
    this.alpha = 0;
    this.player = null as any;
    this.enemy = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Fire(...args);
  }
  private __construct_Fire(...args: any[]): void {
    if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let vxLocal = args[2];
        let vyLocal = args[3];
        let angleLocal = args[4];
        let enemyLocal = args[5];
            this.x = xLocal;
                this.y = yLocal;
                this.dx = vxLocal;
                this.dy = vyLocal;
                this.vx = Fire.SPEED * vxLocal;
                this.vy = Fire.SPEED * vyLocal;
                this.angle = angleLocal;
                this.enemy = enemyLocal;
    
                this.enemyBullet = true;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly STATE_GROWING: number = 0;
  public static readonly STATE_TRAVELING: number = 1;
  public static readonly STATE_SHRINKING: number = 2;
  
  public static readonly SPEED: number = 3;
  public static readonly MAX_LENGTH: number = 128;
  public static readonly TRAVEL_TIME: number = 60;






  public state: number = Fire.STATE_GROWING;



  public alpha: number = 1;


  
  

  public init(): void {
    this.layer = 4;
    this.player = this.gameMode.player;
  }

  public update(): void {
    switch(this.state) {
      case Fire.STATE_GROWING: {
        this.length += Fire.SPEED;
        if (this.length >= Fire.MAX_LENGTH || this.enemy.removeFlag) { 
          this.state = Fire.STATE_TRAVELING;
          this.delay = Fire.TRAVEL_TIME;
        }
        for(let i = 0; i <= 5; i++) {  
          let mag = 0.2 * i * this.length;
          this.player.attack(this.x + mag * this.dx, this.y + mag * this.dy);
        }
        break;
      }
      case Fire.STATE_TRAVELING:
        this.x += this.vx;
        this.y += this.vy;
        if (--this.delay == 0) {
          this.state = Fire.STATE_SHRINKING;
          this.x += this.dx * this.length;
          this.y += this.dy * this.length;
          new Flame(this.x, this.y);
        } else {
          for(let i = 0; i <= 5; i++) {  
            let mag = 0.2 * i * this.length;
            this.player.attack(this.x + mag * this.dx, this.y + mag * this.dy);
          }
        }
        break;
      case Fire.STATE_SHRINKING:
        this.alpha *= 0.98;
        this.length -= Fire.SPEED;
        if (this.length <= 0) {
          this.remove();
        }
        for(let i = 0; i <= 5; i++) {  
          let mag = -0.2 * i * this.length;
          this.player.attack(this.x + mag * this.dx, this.y + mag * this.dy);
        }
        break;
    }     
  }

  public render(): void {
    if (++this.flickerCounter == 4) {
      this.flickerIndex ^= 1;
      this.flickerCounter = 0;
    }
    let index = 0;
    let scale = 1;
    if (this.length < 96) {
      scale = this.length * 0.015625;
    } else {
      index = 1;
      scale = this.length * 0.0078125;
    }
    if (this.state == Fire.STATE_SHRINKING) {
      scale = -scale;
    }
    this.main.drawRotatedScaled(this.main.fires[this.flickerIndex][index], 
        this.x, this.y, 0, -8, this.angle, scale, 1, this.alpha);
  }  
}
