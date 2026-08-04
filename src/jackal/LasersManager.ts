// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/LasersManager.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { Laser } from "./Laser.js";
export class LasersManager extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.state = 0;
    this.delay = 0;
    this.beamIndex = 0;
    this.visibles = null as any;
    this.flash = false;
    this.colorIndex = 0;
    this.laser = null as any;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_LasersManager(...args);
  }
  private __construct_LasersManager(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
            this.x = xLocal;
                this.y = yLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_OUTER_FLASHING: number = 0;
  public static readonly STATE_INNER_FLASHING: number = 1;
  public static readonly STATE_WARMING_UP: number = 2;
  public static readonly STATE_LASERING: number = 3;
  
  public static readonly BEAM_SPACING: number = 8 * 32;
  public static readonly VERTICAL_SPACE: number = 16 * 32;
  
  public static readonly OUTER_FLASH_TIME: number = 16;
  public static readonly INNER_FLASH_TIME: number = 16;
  public static readonly WARM_UP_TIME: number = 16;
  public static readonly LASER_TIME: number = 46;  
  
  public state: number = LasersManager.STATE_OUTER_FLASHING;
  public delay: number = LasersManager.OUTER_FLASH_TIME;
  public beamIndex: number = 0;
  public visibles: any[] = javaArray(3, false);



  
  

  public init(): void {
    this.layer = 4;
  }
  
  private advanceBeamIndex(): void {
    for(let i = 0; i < 3; i++) {
      this.visibles[i] = this.beamVisible(this.x + 64 + i * LasersManager.BEAM_SPACING);
    }
    let nextIndex = this.beamIndex + 1;
    if (nextIndex == 3) {
      nextIndex = 0;
    }
    if (this.visibles[nextIndex]) {
      this.beamIndex = nextIndex;
      return;
    }
    nextIndex++;
    if (nextIndex == 3) {
      nextIndex = 0;
    }
    if (this.visibles[nextIndex]) {
      this.beamIndex = nextIndex;
    }
  }
  
  private beamVisible(beamX: any): boolean {
    return !((beamX + 8 < this.gameMode.cameraX) 
        || (beamX - 8 > this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH));
  }

  public update(): void {
    if (this.delay > 0) {
      this.delay--;
    } else {
      switch(this.state) {
        case LasersManager.STATE_OUTER_FLASHING:
          this.state = LasersManager.STATE_INNER_FLASHING;
          this.delay = LasersManager.INNER_FLASH_TIME;
          break;
        case LasersManager.STATE_INNER_FLASHING:
          this.state = LasersManager.STATE_WARMING_UP;
          this.delay = LasersManager.WARM_UP_TIME;
          break;
        case LasersManager.STATE_WARMING_UP:
          this.state = LasersManager.STATE_LASERING;
          this.delay = LasersManager.LASER_TIME;
          this.laser = new Laser(64 + this.x + LasersManager.BEAM_SPACING * this.beamIndex, this.y - 828);
          break;
        case LasersManager.STATE_LASERING:
          this.state = LasersManager.STATE_OUTER_FLASHING;
          this.delay = LasersManager.OUTER_FLASH_TIME;
          this.laser.remove();
          this.advanceBeamIndex();
          break;
      }
    }
  }

  public checkBounds(maxY: any): void {
    if (this.y - 512 > maxY) {
      this.remove();
    }
  }  

  public render(): void { 
    
    this.flash = !this.flash;
    if (++this.colorIndex == 4) {
      this.colorIndex = 0;
    }
    
    let X = this.x + LasersManager.BEAM_SPACING * this.beamIndex;
    
    switch(this.state) {
      case LasersManager.STATE_OUTER_FLASHING:
        if (this.flash) {
          let Y = this.y + 40;
          for(let i = 0; i < 2; i++, Y -= LasersManager.VERTICAL_SPACE) {
            this.main.draw(this.main.lasers[4], X + 16, Y);
            this.main.draw(this.main.lasers[4], X + 96, Y);
          }
          Y += 64;
          this.main.draw(this.main.lasers[4], X + 16, Y);
          this.main.draw(this.main.lasers[4], X + 96, Y);
        }
        break;
      case LasersManager.STATE_INNER_FLASHING:
        if (this.flash) {
          let Y = this.y + 44;
          for(let i = 0; i < 2; i++, Y -= LasersManager.VERTICAL_SPACE) {
            this.main.draw(this.main.lasers[5], X + 48, Y);
            this.main.draw(this.main.lasers[5], X + 68, Y);
          }
          Y += 64;
          this.main.draw(this.main.lasers[5], X + 48, Y);
          this.main.draw(this.main.lasers[5], X + 68, Y);
        }
        break;
      case LasersManager.STATE_WARMING_UP:
        break;
      case LasersManager.STATE_LASERING:
        for(let i = 1; i < 13; i++) {
          this.main.draw(this.main.lasers[this.colorIndex], X + 48, this.y - (i << 5) + 4);          
        }
        for(let i = 1; i < 11; i++) {
          this.main.draw(this.main.lasers[this.colorIndex], X + 48, this.y - (i << 5) - 508);
        }
        break;
    }
  }  
}
