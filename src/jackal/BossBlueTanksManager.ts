// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossBlueTanksManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { BossBlueTank } from "./BossBlueTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
export class BossBlueTanksManager 
    extends GameElement implements ICameraPanListener {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.ready = false;
    this.spawnDelay = 0;
    this.spawned = 0;
    this.destroyed = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_BossBlueTanksManager(...args);
  }
  private __construct_BossBlueTanksManager(...args: any[]): void {
    if (args.length === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly SPAWN_DELAY: number = 3 * 91;
  public static readonly TANKS: number = 4;

  public spawnDelay: number = 91;


  
  

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
      let xLocal = this.main.random.nextBoolean() ? 640 : 1408;
      let yLocal = this.main.random.nextBoolean() ? -52 : 1012;
      new BossBlueTank(xLocal, yLocal, this);
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
