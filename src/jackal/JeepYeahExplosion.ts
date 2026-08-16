// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class JeepYeahExplosion {  public constructor(arg0?: any, arg1?: any) {
    const argCount = arguments.length;
    this.__construct_JeepYeahExplosion(argCount, arg0, arg1);
  }
  private __construct_JeepYeahExplosion(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
        let xLocal = arg0;
        let yLocal = arg1;
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public static readonly GROW_RATE: number = 1.03;

  public size: number = 32;
  public spriteIndex: number = 0;
  public scale: number = 0;
  public grenadeExplosion: boolean = false;
  public damagesEnemies: boolean = true;
  public enemies: any = null as any;
  public type: number = 0;
  public tiny: boolean = false;
  public delay: number = 0;
  public alpha: number = 1;
  public enemyX: number = 0;
  public enemyY: number = 0;
  public enemy: any = null as any;
  public x: number = 0;
  public y: number = 0;
  public remove: boolean = false;

  public setAlpha(alpha: any): void {
    this.alpha = alpha;
  }

  public setTiny(tiny: any): void {
    this.tiny = tiny;
    if (tiny) {
      this.setDamagesEnemies(false);
    }
  }

  public setDelayed(delay: any): void {
    this.delay = delay;
  }

  public setDamagesEnemies(damagesEnemies: any): void {
    this.damagesEnemies = damagesEnemies;
  }

  public setGrenadeExplosion(grenadeExplosion: any): void {
    this.grenadeExplosion = grenadeExplosion;
  }

  public update(): void {
    if (this.delay > 0) {
      if (--this.delay == 0) {
        if (this.enemy != null) {
          this.x += this.enemy.x - this.enemyX;
          this.y += this.enemy.y - this.enemyY;
        }
      } else {
        return;
      }
    }

    this.size *= JeepYeahExplosion.GROW_RATE;

    if (this.size >= 80) {
      this.spriteIndex = 2;
      this.scale = this.size / 128;
    } else if (this.size >= 56) {
      this.spriteIndex = 1;
      this.scale = this.size / 56;
    } else {
      this.spriteIndex = 0;
      this.scale = this.size / 32;
    }

    if ((this.tiny && this.size > 68) || this.size > 128) {
      this.removeFlag = true;
    }
  }

  public render(main: any): void {
    if (this.alpha == 1) {
      main.drawScaled(main.explosions[this.spriteIndex], this.x, this.y, this.scale);
    } else {
      main.drawScaled(main.explosions[this.spriteIndex], this.x, this.y, this.scale, this.alpha);
    }
  }
}
