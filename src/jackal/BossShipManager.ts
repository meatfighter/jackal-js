// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossShipManager.java.
// Original Java imports: java.util.ArrayList.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { BossShipGun } from "./BossShipGun.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
export class BossShipManager 
    extends GameElement implements ICameraPanListener, ITankTracker {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.ready = false;
    this.brownTankDelay = 0;
    this.shipGuns = null as any;
    this.gunIndex = 0;
    this.triggerDelay = 0;
    this.tanks = 0;
  }
  public constructor() {
    super();
    const argCount = arguments.length;
    this.__construct_BossShipManager(argCount);
  }
  private __construct_BossShipManager(argCount: number): void {
    if (argCount === 0) {
            this.shipGuns.add(new BossShipGun(36 << 5, 8 << 5, this));
                this.shipGuns.add(new BossShipGun(28 << 5, 10 << 5, this));
                this.shipGuns.add(new BossShipGun(28 << 5, 6 << 5, this));
                this.shipGuns.add(new BossShipGun(22 << 5, 10 << 5, this));
                this.shipGuns.add(new BossShipGun(22 << 5, 6 << 5, this));
                this.shipGuns.add(new BossShipGun(13 << 5, 8 << 5, this));
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  public static readonly MAX_TANKS: number = 5;
  public static readonly TRIGGER_DELAY: number = 4 * 91;

  public brownTankDelay: number = 45;
  public shipGuns: any = new ArrayList<BossShipGun>();
  
  public triggerDelay: number = 1;

  
  

  public init(): void {
    this.gameMode.startBossCameraPan(this);
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
    
    if (--this.triggerDelay == 0) {
      this.triggerGuns();
      this.triggerDelay = BossShipManager.TRIGGER_DELAY;
    }
    
    if (!this.shipGuns.isEmpty() && --this.brownTankDelay < 0) {
      if (this.tanks >= BossShipManager.MAX_TANKS) {
        this.brownTankDelay = 91;
      } else {
        this.brownTankDelay = 10 * 91;
        let xLocal = this.gameMode.cameraX + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH);
        if (xLocal < 320) {
          xLocal = 320;
        } else if (xLocal > 1472) {
          xLocal = 1472;
        }
        new BrownTank(xLocal, MainConstants.DISPLAY_HEIGHT + 48, this);        
      }
    }
  }
  
  private triggerGuns(): void {
    if (this.shipGuns.isEmpty()) {
      return;
    }
    let count = 0;
    for(let i = this.shipGuns.size() - 1; i >= 0 && count < 2; i--, this.gunIndex++) {
      if (this.gunIndex >= this.shipGuns.size()) {
        this.gunIndex = 0;
      }
      let shipGun = this.shipGuns.get(this.gunIndex);
      if (shipGun.isOpenable()) {
        shipGun.open(23 * count);
        count++;
      }
    }
  }
  
  public gunDestroyed(bossShipGun: any): void {
    this.shipGuns.remove(bossShipGun);
    if (this.shipGuns.isEmpty()) {
      this.gameMode.destroyAll();
      this.gameMode.stageCompleted();   
    }
  }

  public render(): void {
  }  
}
