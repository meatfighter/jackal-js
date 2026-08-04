// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossHelicopterManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossHelicopter } from "./BossHelicopter.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
export class BossHelicopterManager 
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
  
  public ready: boolean = false;
  public spawnDelay: number = 91;
  public spawned: number = 0;
  public destroyed: number = 0;
  
  

  public init(): void {
    this.gameMode.startBossCameraPan(this);
  }

  public panComplete(): void {
    this.ready = true;
    new BossHelicopter();
  }

  public update(): void {
    if (!this.ready) {
      return;
    }
    
  }

  public render(): void {
  }  
}
