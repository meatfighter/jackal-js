// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossBlueTanksManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossBlueTank } from "./BossBlueTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
export class BossBlueTanksManager 
    extends GameElement implements ICameraPanListener {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPAWN_DELAY: number = 3 * 91;
  public static readonly TANKS: number = 4;
  
  public ready: boolean = false;
  public spawnDelay: number = 91;
  public spawned: number = 0;
  public destroyed: number = 0;
  
  

  public init(): void {
    this.gameMode.startBossCameraPan(this);
  }

  public panComplete(): void {
    this.ready = true;
  }

  public update(): void {
    if (!this.ready) {
      return;
    }
    
    if (this.spawned < BossBlueTanksManager.TANKS && --this.spawnDelay == 0) {
      this.spawned++;
      this.spawnDelay = BossBlueTanksManager.SPAWN_DELAY;      
      let x = this.main.random.nextBoolean() ? 640 : 1408;
      let y = this.main.random.nextBoolean() ? -52 : 1012;
      new BossBlueTank(x, y, this);
    }
  }
  
  public blueTankDestroyed(): void {
    this.destroyed++;
    if (this.destroyed == BossBlueTanksManager.TANKS) {
      this.gameMode.destroyAll();
      this.gameMode.stageCompleted();
    }
  }

  public render(): void {
  }  
}
