// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { BossGarage } from "./BossGarage.js";
import { GameElement } from "./GameElement.js";
import { Gate } from "./Gate.js";
import { ICameraPanListener } from "./ICameraPanListener.js";
import { ITankTracker } from "./ITankTracker.js";
import { RotatingGun } from "./RotatingGun.js";
export class BossGarageManager
    extends GameElement implements ICameraPanListener, ITankTracker {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.ready = false;
    this.garages = null as any;
    this.openDelay = 0;
    this.garageIndex = 0;
    this.tanks = 0;
    this.garageCount = 0;
    this.sparkX = 0;
    this.sparkState = 0;
    this.sparking = false;
  }
  public constructor() {
    super();
    const argCount = arguments.length;
    this.__construct_BossGarageManager(argCount);
  }
  private __construct_BossGarageManager(argCount: number): void {
    if (argCount === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public static readonly LONG_DELAY: number = 4 * 91;
  public static readonly SHORT_DELAY: number = 1 * 91;
  public static readonly MAX_TANKS: number = 5;
  public static readonly SPARK_SPEED: number = 4.25;

  public openDelay: number = BossGarageManager.SHORT_DELAY;

  public garageCount: number = 4;

  public sparkState: number = 0;
  public sparking: boolean = true;

  public init(): void {
    this.gameMode.startBossCameraPan(this);

    this.garages = new ArrayList<BossGarage>();

    this.garages.add(new BossGarage(14 * 32, 9 * 32, this));
    this.garages.add(new BossGarage(20 * 32, 9 * 32, this));
    this.garages.add(new BossGarage(46 * 32, 9 * 32, this));
    this.garages.add(new BossGarage(52 * 32, 9 * 32, this));

    new RotatingGun(4.5 * 32, 5 * 32 + 4, this, false);
    new RotatingGun(9.5 * 32, 5 * 32 + 4, this, false);
    new RotatingGun(28.5 * 32, 5 * 32 + 4, this, true);
    new RotatingGun(41.5 * 32, 5 * 32 + 4, this, true);
    new RotatingGun(60.5 * 32, 5 * 32 + 4, this, false);

    this.layer = 0;
  }

  public panComplete(): void {
    this.ready = true;
  }

  public gateOpen(): void {
    this.gameMode.destroyAll();
    this.gameMode.stageCompleted();
  }

  public tankCreated(): void {
    this.tanks++;
  }

  public tankDestroyed(): void {
    this.tanks--;
  }

  public garageDestroyed(): void {
    this.garageCount--;
    if (this.garageCount == 0) {
      this.sparking = false;
      new Gate(32 * 32, 6 * 32, this);
    }
  }

  public full(): boolean {
    return this.tanks >= BossGarageManager.MAX_TANKS;
  }

  public update(): void {
    if (!this.ready) {
      return;
    }

    if (--this.openDelay == 0) {
      let bossGarage = null;
      while(true) {
        let b = this.garages.get(this.garageIndex++);
        if ((!b.removeFlag
                && b.x + 128 > this.gameMode.cameraX
                && b.x < this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH)) {
          bossGarage = b;
          break;
        } else if (this.garageIndex == 4) {
          break;
        }
      }
      if (bossGarage != null) {
        bossGarage.open();
      }
      if (this.garageIndex == 4) {
        this.garageIndex = 0;
        this.openDelay = BossGarageManager.LONG_DELAY;
      } else {
        this.openDelay = BossGarageManager.SHORT_DELAY;
      }
    }

    if (this.sparking) {
      this.sparkX += BossGarageManager.SPARK_SPEED;
      switch(this.sparkState) {
        case 0:
          if (this.sparkX > 32) {
            this.sparkState = 1;
          }
          break;
        case 1:
          if (this.sparkX > 64) {
            this.sparkState = 2;
          }
          break;
        case 2:
          if (this.sparkX > 96) {
            this.sparkState = 3;
          }
          break;
        case 3:
          if (this.sparkX > 128) {
            this.sparkState = 4;
          }
          break;
        case 4:
          if (this.sparkX > 160) {
            this.sparkState = 5;
          }
          break;
        case 5:
          if (this.sparkX > 192) {
            this.sparkState = 6;
          }
          break;
        case 6:
          if (this.sparkX > 224) {
            this.sparkState = 0;
            this.sparkX = 0;
          }
          break;
      }
    }
  }

  public render(): void {
    if (this.sparking) {
      switch(this.sparkState) {
        case 0:
          this.gameMode.g.setWorldClip(992, 192, 256, 160);
          this.main.draw(this.main.sparks[0][0], 960 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][0], 960 + this.sparkX, 280);
          this.main.draw(this.main.sparks[1][0], 1248 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][0], 1248 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
        case 1:
          this.gameMode.g.setWorldClip(992, 192, 256, 160);
          this.main.draw(this.main.sparks[0][1], 928 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][1], 928 + this.sparkX, 280);
          this.main.draw(this.main.sparks[1][1], 1248 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][1], 1248 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
        case 2:
          this.gameMode.g.setWorldClip(992, 192, 256, 160);
          this.main.draw(this.main.sparks[0][2], 896 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][2], 896 + this.sparkX, 280);
          this.main.draw(this.main.sparks[1][2], 1248 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][2], 1248 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
        case 3:
          this.gameMode.g.setWorldClip(992, 192, 256, 160);
          this.main.draw(this.main.sparks[0][3], 896 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][3], 896 + this.sparkX, 280);
          this.main.draw(this.main.sparks[1][3], 1248 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][3], 1248 - this.sparkX, 280);
          this.main.draw(this.main.sparks[0][6], 1088, 203);
          this.main.draw(this.main.sparks[0][6], 1088, 267);
          this.gameMode.g.clearWorldClip();
          break;
        case 4:
          this.gameMode.g.setWorldClip(992, 192, 128, 160);
          this.main.draw(this.main.sparks[0][4], 896 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][4], 896 + this.sparkX, 280);
          this.gameMode.g.setWorldClip(1120, 192, 128, 160);
          this.main.draw(this.main.sparks[1][4], 1248 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][4], 1248 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
        case 5:
          this.gameMode.g.setWorldClip(992, 192, 128, 160);
          this.main.draw(this.main.sparks[0][5], 896 + this.sparkX, 216);
          this.main.draw(this.main.sparks[0][5], 896 + this.sparkX, 280);
          this.gameMode.g.setWorldClip(1120, 192, 128, 160);
          this.main.draw(this.main.sparks[1][5], 1280 - this.sparkX, 216);
          this.main.draw(this.main.sparks[1][5], 1280 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
        case 6:
          this.gameMode.g.setWorldClip(992, 192, 128, 160);
          this.main.draw(this.main.sparks[1][5], 896 + this.sparkX, 216);
          this.main.draw(this.main.sparks[1][5], 896 + this.sparkX, 280);
          this.gameMode.g.setWorldClip(1120, 192, 128, 160);
          this.main.draw(this.main.sparks[0][5], 1280 - this.sparkX, 216);
          this.main.draw(this.main.sparks[0][5], 1280 - this.sparkX, 280);
          this.gameMode.g.clearWorldClip();
          break;
      }
    }
  }
}
