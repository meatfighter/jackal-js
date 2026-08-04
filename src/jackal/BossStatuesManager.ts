// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossStatuesManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { BossStatue } from "./BossStatue.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
export class BossStatuesManager 
    extends GameElement implements ICameraPanListener, ITankTracker {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.ready = false;
    this.brownTankDelay = 0;
    this.statues = 0;
    this.tanks = 0;
  }
  public constructor() {
    super();
    const argCount = arguments.length;
    this.__construct_BossStatuesManager(argCount);
  }
  private __construct_BossStatuesManager(argCount: number): void {
    if (argCount === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly MAX_TANKS: number = 5;
 
  public brownTankDelay: number = 3 * 91;
  public statues: number = 4;

  
  

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
        let xLocal = this.gameMode.cameraX + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH);
        if (xLocal < 352) {
          xLocal = 352;
        } else if (xLocal > 1760) {
          xLocal = 1760;
        }
        new BrownTank(xLocal, MainConstants.DISPLAY_HEIGHT + 48, this);        
      }
    }
  }

  public render(): void {
  }
}
