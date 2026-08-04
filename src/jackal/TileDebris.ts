// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TileDebris.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class TileDebris extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.sprite = null as any;
    this.X = 0;
    this.Y = 0;
    this.tile = 0;
    this.type = 0;
    this.delay = 0;
    this.moving = false;
    this.vx = 0;
    this.vy = 0;
    this.scale = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_TileDebris(...args);
  }
  private __construct_TileDebris(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let tileLocal = args[2];
        let typeLocal = args[3];
            this.X = xLocal;
                this.Y = yLocal;
                this.x = (xLocal << 5) + 16;
                this.y = (yLocal << 5) + 16;
                this.tile = tileLocal;
                this.type = typeLocal;
                this.sprite = this.gameMode.tiles[this.gameMode.tileMap[yLocal][xLocal]];
                this.delay = (javaInt((this.gameMode.player.x - this.x))) >> 3;
    
                if (this.delay < 0) {
                  this.delay = -this.delay;
                }
                this.delay++;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly GRAVITY: number = 0.2;
  public static readonly SCALER: number = 0.015;









  public scale: number = 1;
  
  

  public init(): void {
    this.layer = 7;
  }

  public update(): void {
    if (this.moving) {
      this.vy += TileDebris.GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      this.scale -= TileDebris.SCALER;
      if (this.scale <= 0) {
        this.scale = 0;
        this.remove();
      }
    } else {
      if (--this.delay == 0) {
        this.moving = true;
        this.gameMode.tileMap[this.Y][this.X] = this.tile;
        this.gameMode.typesMap[this.Y][this.X] = this.type;
        this.vx = 1 + this.main.random.nextFloat() * 5;
        if (this.gameMode.player.x > this.x) {
          this.vx = -this.vx;
        }
        this.vy = -2 - this.main.random.nextFloat() * 5;
      }
    }
  }

  public render(): void {
    if (this.moving) {
      this.main.drawCentered(this.sprite, this.x, this.y, this.scale);
    }
  }  
}
