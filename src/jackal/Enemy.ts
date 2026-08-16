// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { HitElement } from "./HitElement.js";
export abstract class Enemy extends HitElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.solid = false;
    this.mine = false;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 0;
    this.solidY2 = 0;
    this.mineX1 = 0;
    this.mineY1 = 0;
    this.mineX2 = 0;
    this.mineY2 = 0;
    this.bulletHits = 0;
    this.points = 0;
    this.explosionX = 0;
    this.explosionY = 0;
    this.playSoundOnRemove = false;
  }

 // other enemies will avoid bumping into this one
  // player will explode if it hits this enemy

  public playSoundOnRemove: boolean = true;

    public isSolid(arg0?: any, arg1?: any, arg2?: any, arg3?: any): any {
    const argCount = arguments.length;
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
      return this.isSolid__overload0(arg0, arg1);
    }
    if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
      return this.isSolid__overload1(arg0, arg1, arg2, arg3);
    }
    throw new Error(`No Java method overload matched isSolid: ${argCount}`);
  }
  public isSolid__overload0(px: any, py: any): boolean {
    px -= this.x;
    py -= this.y;

    return py >= this.solidY1 && py <=this.solidY2&&px>= this.solidX1 && px <= this.solidX2;
  }

  public isSolid__overload1(x1: any, y1: any, x2: any, y2: any): boolean {

    return this.overlap(x1, y1, x2, y2,
        this.x + this.solidX1,
        this.y + this.solidY1,
        this.x + this.solidX2,
        this.y + this.solidY2);
  }

    public isMine(arg0?: any, arg1?: any, arg2?: any, arg3?: any): any {
    const argCount = arguments.length;
    if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
      return this.isMine__overload0(arg0, arg1);
    }
    if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
      return this.isMine__overload1(arg0, arg1, arg2, arg3);
    }
    throw new Error(`No Java method overload matched isMine: ${argCount}`);
  }
  public isMine__overload0(px: any, py: any): boolean {
    px -= this.x;
    py -= this.y;

    return py >= this.mineY1 && py <=this.mineY2&&px>= this.mineX1 && px <= this.mineX2;
  }

  public isMine__overload1(x1: any, y1: any, x2: any, y2: any): boolean {

    return this.overlap(x1, y1, x2, y2,
        this.x + this.mineX1,
        this.y + this.mineY1,
        this.x + this.mineX2,
        this.y + this.mineY2);
  }

  public flatten(): void {
    this.explode();
  }

  public explode(): void {
    if (!this.removeFlag) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
    }
  }

  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {
    if (invincible) {
      return false;
    }
    if (this.isMine(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }

  public remove(): void {
    this.removeFlag = true;
    if (this.playSoundOnRemove) {
      this.main.playHitExplodeSound();
    }
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (attackSource < AttackSource.PLAYER_EXPLOSION
        && this.hit(x1, y1, x2, y2)) {
      this.remove();
      new Explosion(this.x + this.explosionX, this.y + this.explosionY);
      this.main.addPoints(this.points);
      return true;
    } else {
      return false;
    }
  }

  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.hit(x1, y1, x2, y2)) {
      if (--this.bulletHits <= 0) {
        this.remove();
        new Explosion(this.x + this.explosionX, this.y + this.explosionY);
        this.main.addPoints(this.points);
      } else {
        this.main.playSoundAlways(this.main.bulletHitSound);
      }
      return true;
    } else {
      return false;
    }
  }

  public checkBounds(maxY: any): void {
    if (this.solid) {
      if (this.y + this.solidY1 > maxY) {
        this.playSoundOnRemove = false;
        this.remove();
      }
    } else {
      if (this.y + this.hitY1 > maxY) {
        this.playSoundOnRemove = false;
        this.remove();
      }
    }
  }
}
