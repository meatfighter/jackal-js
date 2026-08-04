// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/TileDebris.java.
// Original Java imports: org.newdawn.slick.Image.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class TileDebris extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 4 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number" && typeof args[3] === "number") {
        let x = args[0];
        let y = args[1];
        let tile = args[2];
        let type = args[3];
            this.X = x;
                this.Y = y;
                this.x = (x << 5) + 16;
                this.y = (y << 5) + 16;
                this.tile = tile;
                this.type = type;
                this.sprite = this.gameMode.tiles[this.gameMode.tileMap[y][x]];
                this.delay = ((this.gameMode.player.x - this.x)) >> 3;
    
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
  
  public sprite: any = null as any;
  public X: number = 0;
  public Y: number = 0;
  public tile: number = 0;
  public type: number = 0;
  public delay: number = 0;
  public moving: boolean = false;
  public vx: number = 0;
  public vy: number = 0;
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
