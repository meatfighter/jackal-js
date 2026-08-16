// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
import { MissionAccomplished } from "./MissionAccomplished.js";
export class FlashingSkull extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.state = 0;
    this.delay = 0;
    this.flashDelay = 0;
    this.visible = false;
    this.alpha = 0;
  }

  public static readonly STATE_FLASHING: number = 0;
  public static readonly STATE_FADING: number = 1;
  public static readonly STATE_PAUSED: number = 2;
  public static readonly STATE_DONE: number = 3;

  public static readonly FLASH_TIME: number = 5;
  public static readonly FLASHING_TIME: number = FlashingSkull.FLASH_TIME * 32;
  public static readonly FADE_TIME: number = 91;

  public static readonly TILES: any[] = [
    [800, 704, 302], [832, 704, 303], [864, 704, 303], [896, 704, 304],
    [928, 704, 303], [960, 704, 303], [992, 704, 303], [1024, 704, 303],
    [1056, 704, 303], [1088, 704, 303], [1120, 704, 305],
    [1152, 704, 303], [1184, 704, 303], [1216, 704, 306],
    [832, 736, 302], [864, 736, 303], [896, 736, 304], [928, 736, 307],
    [960, 736, 308], [992, 736, 309], [1024, 736, 310],
    [1056, 736, 308], [1088, 736, 311], [1120, 736, 305],
    [1152, 736, 303], [1184, 736, 306], [864, 768, 302], [896, 768, 304],
    [928, 768, 303], [960, 768, 307], [992, 768, 312], [1024, 768, 313],
    [1056, 768, 311], [1088, 768, 303], [1120, 768, 305], [1152, 768, 306],
    [896, 800, 314], [928, 800, 303], [960, 800, 303], [992, 800, 307],
    [1024, 800, 311], [1056, 800, 303], [1088, 800, 303], [1120, 800, 315],
    [928, 832, 302], [960, 832, 303], [992, 832, 303], [1024, 832, 303],
    [1056, 832, 303], [1088, 832, 306], [960, 864, 302], [992, 864, 303],
    [1024, 864, 303], [1056, 864, 306], [992, 896, 302], [1024, 896, 306],
  ];

  public static readonly INV_FADE_TIME: number = 1 / javaFloat(FlashingSkull.FADE_TIME);

  public state: number = FlashingSkull.STATE_FLASHING;
  public delay: number = FlashingSkull.FLASHING_TIME;
  public flashDelay: number = 1;

  public init(): void {
    this.layer = 0;
  }

  public update(): void {
    switch(this.state) {
      case FlashingSkull.STATE_FLASHING:
        if (--this.delay == 0) {
          this.state = FlashingSkull.STATE_FADING;
          this.delay = FlashingSkull.FADE_TIME;
        }
        break;
      case FlashingSkull.STATE_FADING:
        this.alpha = 1 - FlashingSkull.INV_FADE_TIME * this.delay;
        if (--this.delay == 0) {
          this.state = FlashingSkull.STATE_PAUSED;
        }
        break;
      case FlashingSkull.STATE_PAUSED:
        if (!this.main.isSongPlaying()) {
          this.state = FlashingSkull.STATE_DONE;
          new MissionAccomplished();
        }
        break;
    }
  }

  public render(): void {
    switch(this.state) {
      case FlashingSkull.STATE_FLASHING:
        if (--this.flashDelay == 0) {
          this.visible ^= true;
          this.flashDelay = FlashingSkull.FLASH_TIME;
        }
        if (this.visible) {
          for(let i = FlashingSkull.TILES.length - 1; i >= 0; i--) {
            let tile = FlashingSkull.TILES[i];
            this.main.draw(this.gameMode.tiles[tile[2]], tile[0], tile[1]);
          }
        }
        break;
      case FlashingSkull.STATE_FADING:
        for(let i = FlashingSkull.TILES.length - 1; i >= 0; i--) {
          let tile = FlashingSkull.TILES[i];
          this.main.draw(this.gameMode.tiles[tile[2] + 14], tile[0], tile[1], this.alpha);
        }
        break;
      default:
        for(let i = FlashingSkull.TILES.length - 1; i >= 0; i--) {
          let tile = FlashingSkull.TILES[i];
          this.main.draw(this.gameMode.tiles[tile[2] + 14], tile[0], tile[1]);
        }
        break;
    }
  }
}
