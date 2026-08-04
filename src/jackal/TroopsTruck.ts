// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TroopsTruck.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
export class TroopsTruck extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_PAUSED: number = 0;
  public static readonly STATE_MOVING: number = 1;
  public static readonly STATE_RELEASING_TROOPS: number = 2;
  
  public static readonly SPEED: number = 1.25;
  public static readonly TRAVEL_TIME: number = 291;
  public static readonly PLAYER_DISTANCE: number = 256;
  public static readonly TROOPS: number = 12;
  public static readonly TROOPS_DELAY: number = 2 * 91;
  
  public state: number = TroopsTruck.STATE_PAUSED;
  public player: any = null as any;
  public traveling: number = TroopsTruck.TRAVEL_TIME;
  public troops: number = TroopsTruck.TROOPS;
  public troopsDelay: number = 0;
  
  

  public init(): void {
    super.init();   
    
    this.player = this.gameMode.player;
    
    this.layer = 4;
    
    this.bulletHits = 4;
    
    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 120;
    this.hitY2 = 76;
    
    this.mine = true;
    this.mineX1 = 8;
    this.mineY1 = 8;
    this.mineX2 = 120;
    this.mineY2 = 76;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 128;
    this.solidY2 = 84;
    
    this.points = 1000;
    
    this.explosionX = 64;
    this.explosionY = 42;
  }

  public update(): void {
    switch(this.state) {
      case TroopsTruck.STATE_PAUSED:
        if (this.player.y - this.y <= TroopsTruck.PLAYER_DISTANCE) {
          this.state = TroopsTruck.STATE_MOVING;
        } 
        break;
      case TroopsTruck.STATE_MOVING:
        this.x += TroopsTruck.SPEED;
        if (--this.traveling == 0) {
          this.state = TroopsTruck.STATE_RELEASING_TROOPS;
        }
        break;
      case TroopsTruck.STATE_RELEASING_TROOPS:
        if (--this.troopsDelay < 0) {
          this.troopsDelay = TroopsTruck.TROOPS_DELAY;
          if (this.troops > 0) {
            this.troops--;
            new EnemySoldier(this.x + 16, this.y + 66, EnemySoldierType.TROOPS_TRUCK);
          }
        }
        break;
    }
  }

  public render(): void {
    this.main.draw(this.main.troopsTruck, this.x, this.y);
  }
}
