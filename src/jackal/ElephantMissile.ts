// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
export class ElephantMissile extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.maxY = 0;
    this.explosionOffset = 0;
    this.tipX = 0;
    this.tipY = 0;
    this.player = null as any;
  }
  public constructor(arg0?: any, arg1?: any, arg2?: any, arg3?: any) {
    super();
    const argCount = arguments.length;
    this.__construct_ElephantMissile(argCount, arg0, arg1, arg2, arg3);
  }
  private __construct_ElephantMissile(argCount: number, arg0?: any, arg1?: any, arg2?: any, arg3?: any): void {
    if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "boolean") {
        let xLocal = arg0;
        let yLocal = arg1;
        let angleLocal = arg2;
        let left = arg3;
            this.x = xLocal;
                this.y = yLocal;
                this.angle = angleLocal;

                switch(angleLocal) {
                  case 45:
                    this.vx = ElephantMissile.DIAGONAL_SPEED;
                    this.vy = ElephantMissile.DIAGONAL_SPEED;
                    this.explosionOffset = 32;
                    this.tipX = 10;
                    this.tipY = 10;
                    break;
                  case 90:
                    this.vx = 0;
                    this.vy = ElephantMissile.SPEED;
                    if (!left) {
                      this.explosionOffset = 32;
                    }
                    this.tipX = 0;
                    this.tipY = 16;
                    break;
                  case 135:
                    this.vx = -ElephantMissile.DIAGONAL_SPEED;
                    this.vy = ElephantMissile.DIAGONAL_SPEED;
                    this.tipX = -10;
                    this.tipY = 10;
                    break;
                }

                if (angleLocal == 90) {
                  this.maxY = 908;
                } else {
                  this.maxY = this.main.random.nextBoolean() ? 598 : 822;
                }

                this.main.playSound(this.main.laserSound);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  public static readonly SPEED: number = 6;
  public static readonly DIAGONAL_SPEED: number = javaFloat((ElephantMissile.SPEED / Math.sqrt(2)));

  public init(): void {
    this.layer = 4;

    this.player = this.gameMode.player;
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y >= this.maxY) {
      this.remove();
      let X = (javaInt(this.x)) >> 5;
      let Y = (javaInt(this.y)) >> 5;
      let groupIndex = this.gameMode.groupsMap[Y][X];
      this.gameMode.triggerGroup(groupIndex);
      new Explosion((X << 5) + this.explosionOffset, (Y << 5) + 32)
          .setDamagesEnemies(false);
    } else if (this.player.attack(this.x + this.tipX, this.y + this.tipY)) {
      this.remove();
      new Explosion(this.x + this.tipX, this.y + this.tipY);
    }
  }

  public render(): void {
    this.main.drawRotated(this.main.elephantGuns[8], this.x, this.y, this.angle);
  }
}
