// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/PlayerBullet.java.
// Original Java imports: java.util.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
export class PlayerBullet extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
    
                this.enemies = this.gameMode.enemies;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly DISTANCE: number = 360;
  public static readonly TRAVEL_TIME: number = 20;
  public static readonly VELOCITY: number = PlayerBullet.DISTANCE / PlayerBullet.TRAVEL_TIME;
  public static readonly MARGIN: number = 16;
  
  public t: number = 0;  
  public enemies: any = null as any;
  
    

  public init(): void {
    this.layer = 4;
    this.main.playSoundAlways(this.main.machineGunSound);
  }

  public update(): void {    
    
    this.y -= PlayerBullet.VELOCITY;
    
    let hit = false;
    let x1 = this.x - PlayerBullet.MARGIN;
    let y1 = this.y - PlayerBullet.MARGIN;
    let x2 = this.x + PlayerBullet.MARGIN;
    let y2 = this.y + PlayerBullet.MARGIN;
    for(let i = this.enemies.size() - 1; i >= 0; i--) {
      let enemy = this.enemies.get(i);
      if (!enemy.removeFlag && enemy.bulletAttack(x1, y1, x2, y2)) {
        hit = true;
        break;
      }
    } 
    
    if (hit || ++this.t > PlayerBullet.TRAVEL_TIME || this.gameMode.isMissileTarget(this.x, this.y)) {
      this.removeFlag = true;
      new BulletHit(this.x, this.y);
    }
  }

  public render(): void { 
    this.main.drawCentered(this.main.yellowBullet, this.x, this.y);
  }  
}
