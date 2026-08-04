// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Fire.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Flame } from "./Flame.js";
import { GameElement } from "./GameElement.js";
export class Fire extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number" && typeof args[4] === "number") {
        let x = args[0];
        let y = args[1];
        let vx = args[2];
        let vy = args[3];
        let angle = args[4];
        let enemy = args[5];
            this.x = x;
                this.y = y;
                this.dx = vx;
                this.dy = vy;
                this.vx = Fire.SPEED * vx;
                this.vy = Fire.SPEED * vy;
                this.angle = angle;
                this.enemy = enemy;
    
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
  
  public vx: number = 0;
  public vy: number = 0;
  public dx: number = 0;
  public dy: number = 0;
  public length: number = 0;
  public angle: number = 0;
  public state: number = Fire.STATE_GROWING;
  public delay: number = 0;
  public flickerCounter: number = 0;
  public flickerIndex: number = 0;
  public alpha: number = 1;
  public player: any = null as any;
  public enemy: any = null as any;
  
  

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
