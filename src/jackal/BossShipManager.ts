// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/BossShipManager.java.
// Original Java imports: java.util.ArrayList.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { BossShipGun } from "./BossShipGun.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
import { Main } from "./Main.js";
export class BossShipManager 
    extends GameElement implements ICameraPanListener, ITankTracker {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 0) {
            this.shipGuns.add(new BossShipGun(36 << 5, 8 << 5, this));
                this.shipGuns.add(new BossShipGun(28 << 5, 10 << 5, this));
                this.shipGuns.add(new BossShipGun(28 << 5, 6 << 5, this));
                this.shipGuns.add(new BossShipGun(22 << 5, 10 << 5, this));
                this.shipGuns.add(new BossShipGun(22 << 5, 6 << 5, this));
                this.shipGuns.add(new BossShipGun(13 << 5, 8 << 5, this));
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly MAX_TANKS: number = 5;
  public static readonly TRIGGER_DELAY: number = 4 * 91;
  
  public ready: boolean = false;
  public brownTankDelay: number = 45;
  public shipGuns: any = new ArrayList<BossShipGun>();
  public gunIndex: number = 0;  
  public triggerDelay: number = 1;
  public tanks: number = 0;
  
  

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
        let x = this.gameMode.cameraX + this.main.random.nextInt(Main.DISPLAY_WIDTH);
        if (x < 320) {
          x = 320;
        } else if (x > 1472) {
          x = 1472;
        }
        new BrownTank(x, Main.DISPLAY_HEIGHT + 48, this);        
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
