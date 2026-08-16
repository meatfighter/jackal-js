// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
export class FloorMissileLauncher extends Enemy {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.ready = false;
    this.state = 0;
    this.delay = 0;
    this.panelOffset = 0;
  }
  public constructor(arg0?: any, arg1?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_FloorMissileLauncher(argCount, arg0, arg1);
  }
  private __construct_FloorMissileLauncher(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public static readonly STATE_CLOSED: number = 0;
  public static readonly STATE_OPENING: number = 1;
  public static readonly STATE_OPEN: number = 2;
  public static readonly STATE_CLOSING: number = 3;

  public static readonly CLOSED_DELAY: number = 3 * 91;
  public static readonly OPEN_DELAY: number = 32;
  public static readonly PANEL_SPEED: number = 2;

  public state: number = FloorMissileLauncher.STATE_CLOSED;
  public delay: number = FloorMissileLauncher.CLOSED_DELAY;

  public init(): void {
    super.init();

    this.layer = 0;

    this.bulletHits = 10;

    this.hitX1 = 8;
    this.hitY1 = 8;
    this.hitX2 = 88;
    this.hitY2 = 52;

    this.points = 2000;
  }

  public update(): void {
    switch(this.state) {
      case FloorMissileLauncher.STATE_CLOSED:
        if (this.delay > 0) {
          this.delay--;
        }
        if (this.delay == 0 && !this.gameMode.isOutsideOfFrame(this.x + 48, this.y + 42)) {
          this.state = FloorMissileLauncher.STATE_OPENING;
          this.panelOffset = 0;
        }
        break;
      case FloorMissileLauncher.STATE_OPENING:
        this.panelOffset += FloorMissileLauncher.PANEL_SPEED;
        if (this.panelOffset >= 20) {
          this.state = FloorMissileLauncher.STATE_OPEN;
          this.panelOffset = 20;
          this.delay = FloorMissileLauncher.OPEN_DELAY;
          new SwampMissile(this.x + 48, this.y + 42);
        }
        break;
      case FloorMissileLauncher.STATE_OPEN:
        if (--this.delay == 0) {
          this.state = FloorMissileLauncher.STATE_CLOSING;
        }
        break;
      case FloorMissileLauncher.STATE_CLOSING:
        this.panelOffset -= FloorMissileLauncher.PANEL_SPEED;
        if (this.panelOffset <= 0) {
          this.state = FloorMissileLauncher.STATE_CLOSED;
          this.panelOffset = 0;
          this.delay = FloorMissileLauncher.CLOSED_DELAY;
        }
        break;
    }
  }

  // returns true if attack successful

  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.state != FloorMissileLauncher.STATE_CLOSED) {
      if ((attackSource == AttackSource.PLAYER_WEAPON
            || attackSource == AttackSource.TRAVELING_EXPLOSION)
          && this.hit(x1, y1, x2, y2)) {
        this.remove();
        new Explosion(this.x + this.explosionX, this.y + this.explosionY);
        this.main.addPoints(this.points);
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.state != FloorMissileLauncher.STATE_CLOSED) {
      return super.bulletAttack(x1, y1, x2, y2);
    } else {
      return false;
    }
  }

  public render(): void {
    if (this.state == FloorMissileLauncher.STATE_CLOSED) {
      this.main.draw(this.main.floorMissileLauncher[3], this.x + 8, this.y + 8);
      this.main.draw(this.main.floorMissileLauncher[1], this.x + 8, this.y + 8);
      this.main.draw(this.main.floorMissileLauncher[2], this.x + 8, this.y + 22);
      this.main.draw(this.main.floorMissileLauncher[0], this.x, this.y);
    } else {
      this.main.draw(this.main.floorMissileLauncher[3], this.x + 8, this.y + 8);
      this.gameMode.g.setWorldClip(2 + this.x, 2 + this.y, 95, 52);
      this.main.draw(this.main.floorMissileLauncher[1], this.x + 8, this.y + 8 - this.panelOffset);
      this.main.draw(this.main.floorMissileLauncher[2], this.x + 8, this.y + 22 + this.panelOffset);
      this.gameMode.g.clearWorldClip();
      this.main.draw(this.main.floorMissileLauncher[0], this.x, this.y);
    }
  }
}
