// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossStatuesManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossStatue } from "./BossStatue.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
import { Main } from "./Main.js";
export class BossStatuesManager 
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
  
  public ready: boolean = false; 
  public brownTankDelay: number = 3 * 91;
  public statues: number = 4;
  public tanks: number = 0;
  
  

  public init(): void {
    this.gameMode.startBossCameraPan(this);
  }
  
  public statueDestroyed(): void {
    if (--this.statues == 0) {
      this.gameMode.destroyAll();
      this.gameMode.stageCompleted();
    }
  }

  public panComplete(): void {
    this.ready = true; 
    new BossStatue(704, 64, 136, this);        
    new BossStatue(864, 64, 45, this);        
    new BossStatue(1024, 64, 91, this);        
    new BossStatue(1184, 64, 0, this);        
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
    
    if (this.statues > 0 && --this.brownTankDelay < 0) {
      if (this.tanks >= BossStatuesManager.MAX_TANKS) {
        this.brownTankDelay = 91;
      } else {
        this.brownTankDelay = 10 * 91;
        let x = this.gameMode.cameraX + this.main.random.nextInt(Main.DISPLAY_WIDTH);
        if (x < 352) {
          x = 352;
        } else if (x > 1760) {
          x = 1760;
        }
        new BrownTank(x, Main.DISPLAY_HEIGHT + 48, this);        
      }
    }
  }

  public render(): void {
  }
}
