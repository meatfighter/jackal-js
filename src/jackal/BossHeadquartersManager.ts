// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossHeadquartersManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossHeadquarters } from "./BossHeadquarters.js";
import { BrownTank } from "./BrownTank.js";
import { ElephantGun } from "./ElephantGun.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
import { Main } from "./Main.js";
export class BossHeadquartersManager 
    extends GameElement implements ICameraPanListener, ITankTracker {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly MAX_TANKS: number = 5;
  public static readonly TANK_SPAWN_DELAY: number = 5 * 91;
  
  public ready: boolean = false;
  public createdEnemyHelicopter: boolean = false;
  public tanks: number = 0;
  public tankSpawnDelay: number = BossHeadquartersManager.TANK_SPAWN_DELAY;
  
  

  public init(): void {
    this.gameMode.startBossCameraPan(this);
    
    new BossHeadquarters(this);
    new ElephantGun(792, 140, true);
    new ElephantGun(1160, 140, false);
  }

  public panComplete(): void {
    this.ready = true;
  }

  public tankCreated(): void {
    this.tanks++;
  }

  public tankDestroyed(): void {
    this.tanks--;
  }  

  public update(): void {
    if (!this.ready) {
      return;
    }
    
    if (!this.createdEnemyHelicopter) {
      this.createdEnemyHelicopter = true;
      new EnemyHelicopter(true);
    }
    
    if (--this.tankSpawnDelay == 0) {
      if (this.tanks == BossHeadquartersManager.MAX_TANKS) {
        this.tankSpawnDelay = 45;
      } else {
        this.tankSpawnDelay = BossHeadquartersManager.TANK_SPAWN_DELAY;
        let brownTank = new BrownTank(
            256 + this.main.random.nextInt(1536),
            this.gameMode.cameraY + Main.DISPLAY_HEIGHT + 48, 
            this);
        brownTank.displayAngle = brownTank.targetAngle = 270;
      }
    }
  }

  public render(): void {
  }
}
