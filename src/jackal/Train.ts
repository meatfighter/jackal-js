// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Train.java.
// Original Java imports: java.util.ArrayList.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
export class Train extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let x = args[0];
        let y = args[1];
        let locomotive = args[2];
            this.x = x;
                this.y = y;
                this.carIndex = locomotive ? 0 : 1;
                this.shootX = locomotive ? 28 : 24;
                this.shootY = 64;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPEED: number = 3.5;
  public static readonly SHOOT_DELAY: number = 3 * 91;
  public static readonly BULLET_SPEED: number = 1.5;
  public static readonly BULLET_TRAVEL_TIME: number = 4 * 91;
  
  public mines: any = null as any;
  public player: any = null as any;  
  public carIndex: number = 0;
  public shootDelay: number = this.main.random.nextInt(Train.SHOOT_DELAY);
  public shootX: number = 0;
  public shootY: number = 0;
  
  

  public init(): void {
    super.init();
    
    this.mines = this.gameMode.mines;
    this.player = this.gameMode.player;    
    
    this.layer = 3;
    
    this.bulletHits = 4;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = this.carIndex == 0 ? 48 : 40;
    this.hitY2 = 120;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = this.carIndex == 0 ? 48 : 40;
    this.mineY2 = 120;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = this.carIndex == 0 ? 56 : 48;
    this.solidY2 = 128;
    
    this.points = this.carIndex == 0 ? 1500 : 1200;
    
    this.explosionX = this.carIndex == 0 ? 28 : 24;
    this.explosionY = 64;
  }  

  public checkBounds(maxY: any): void {
  }  

  public flatten(): void {
  }  

  public update(): void {
    this.y -= Train.SPEED;
    if (this.y < 3104) {
      this.playSoundOnRemove = false;
      this.remove();
    } else {
      if (this.y > 3296 && --this.shootDelay <= 0) {
        this.shootDelay = Train.SHOOT_DELAY;
        new EnemyBullet(this.x + this.shootX, this.y + this.shootY, 
            this.player.x > this.x ? Train.BULLET_SPEED : -Train.BULLET_SPEED, 0, 
            Train.BULLET_TRAVEL_TIME, false);
      }
      for(let i = this.mines.size() - 1; i >= 0; i--) {
        let mine = this.mines.get(i);
        if (mine != this && mine.isMine(this.x + this.mineX1, this.y + this.mineY1, 
            this.x + this.mineX2, this.y + this.mineY2)) {
          mine.flatten();
        }
      }
    }
  }

  public render(): void {
    if (this.y <= 3296) {
      this.gameMode.g.setWorldClip(384, 3248, 64, 192);
      this.main.draw(this.main.trains[this.carIndex], this.x, this.y);
      this.main.draw(this.main.trains[2], 384, 3232);
      this.gameMode.g.clearWorldClip();
    } else {
      this.main.draw(this.main.trains[this.carIndex], this.x, this.y);
    }
  }
}
