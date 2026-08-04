// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/SunsetMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMode } from "./IMode.js";
import { Modes } from "./Modes.js";
export class SunsetMode implements IMode, IFadeListener {
  
  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_PAUSED_1: number = 1;
  public static readonly STATE_HELICOPTER: number = 2;
  public static readonly STATE_PAUSED_2: number = 3;
  public static readonly STATE_CREDITS: number = 4;
  public static readonly STATE_WAITING: number = 5;
  public static readonly STATE_ADVANCE_TO_HARD_MODE: number = 6;
  public static readonly STATE_HARD_MODE_FADE_OUT: number = 7;
  public static readonly STATE_HARD_MODE_WAITING: number = 8;
  public static readonly STATE_DONE: number = 9;

  public static readonly CENTER_X: number = MainConstants.DISPLAY_WIDTH / 2;
  public static readonly CENTER_Y: number = MainConstants.DISPLAY_HEIGHT / 2;
  public static readonly HELICOPTER_SCALE_0: number = 0.2;
  public static readonly HELICOPTER_X0: number = -215;
  public static readonly HELICOPTER_X1: number = 215;
  public static readonly HELICOPTER_Y0: number = -275;
  public static readonly HELICOPTER_Y1: number = -315;  
  public static readonly HELICOPTER_Z0: number = -10;
  public static readonly HELICOPTER_Z1: number = 0;
  public static readonly HELICOPTER_ANGLE0: number = 0;
  public static readonly HELICOPTER_ANGLE1: number = 8.75;
  public static readonly Z0: number = (SunsetMode.HELICOPTER_SCALE_0 * SunsetMode.HELICOPTER_Z0) / (SunsetMode.HELICOPTER_SCALE_0 - 1);  
  
  public static readonly PAUSE_TIME_1: number = 1;
  public static readonly HELICOPTER_TIME: number = 18 * 91; 
  public static readonly HELICOPTER_HARD_TIME: number = 1900;
  public static readonly FADE_TIME: number = 1 * 91;
  public static readonly SHADE_TIME: number = 12 * 91;
  public static readonly PAUSE_TIME_2: number = 91;
  public static readonly TYPE_TIME: number = 11;
  public static readonly EOL_PAUSE_TIME: number = 64;  
  public static readonly EOM_PAUSE_TIME: number = 2 * 91;
  
  public static readonly I_HELICOPTER: number = 1 / SunsetMode.HELICOPTER_TIME;
  public static readonly I_FADE_TIME: number = 1 / SunsetMode.FADE_TIME;
  public static readonly I_SHADE_TIME: number = 1 / SunsetMode.SHADE_TIME;
  
  public static readonly SUN_HEIGHT: number = 92;
  public static readonly SUN_AMPLITUDE: number = 2;
  public static readonly SUN_WAVES: number = 3;
  public static readonly WAVES_HEIGHT: number = 32;
          
  public static readonly sunOffsets: any[] = javaArray(SunsetMode.SUN_HEIGHT, 0);
  
  static {    
    let PERCENT = javaFloat((SunsetMode.SUN_WAVES * 2 * Math.PI / SunsetMode.SUN_HEIGHT));
    
    for(let i = 0; i < SunsetMode.SUN_HEIGHT; i++) {
      SunsetMode.sunOffsets[i] = SunsetMode.SUN_AMPLITUDE * javaFloat(Math.sin(i * PERCENT));
    }
  }  
  
  public readonly credits: any[] = [
    
    [ "programmed by",
      "michael birken", ],

    [ "inspired by",
      "`jackal\" for the",
      "nintendo",
      "entertainment system and the",
      "brilliant works of konami" ],

    [ "based on graphics designed by",
      "shimoide",
      "satoh" ],

    [ "adopted music by",
      "sakamoto",
      "fujio" ],
                           
    [ "based on characters created by",
      "fujiwara",
      "yoshimoto",
      "maruo" ],

    [ "based on code by",
      "hori",
      "yanagisawa" ],
    
    [ "presented by",
      "meatfighter.com" ],    

    [ "thanks for playing" ],

    [ "final score: ",
      "",
      "  press start for",
      "  hard mode..." ],
  ];
  
  public main: any = null as any;
  public gc: any = null as any;  
  public sunOffset: number = 0;
  public sunOffsetCounter: number = 0;
  public rotorAngle: number = 0;
  public helicopterX: number = SunsetMode.HELICOPTER_X0;
  public helicopterY: number = SunsetMode.HELICOPTER_Y0;
  public helicopterZ: number = SunsetMode.HELICOPTER_Z0;
  public helicopterAngle: number = SunsetMode.HELICOPTER_ANGLE0;
  public delay: number = SunsetMode.PAUSE_TIME_1;
  public helicopterDelay: number = 0;
  public state: number = SunsetMode.STATE_FADE_IN;
  public creditsIndex: number = 0;
  public lineIndex: number = 0;
  public lineLength: number = 0;
  public input: any = null as any;

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    this.credits[this.credits.length - 1][0] += main.scoreStr;
    
    main.startFade(false, this);
  }

  public update(gc: any): void {

    switch(this.state) {
      case SunsetMode.STATE_PAUSED_1:
        if (--this.delay == 0) {
          this.state = SunsetMode.STATE_HELICOPTER;
        }
        break;
      case SunsetMode.STATE_HELICOPTER:
        let t = this.helicopterDelay * SunsetMode.I_HELICOPTER;
        if (!this.main.isSoundPlaying(this.main.helicopterSound)) {
          let volume = t + 0.15;
          this.main.playSound(this.main.helicopterSound, volume < 1 ? volume : 1);
        }
        this.helicopterX = SunsetMode.HELICOPTER_X0 + (SunsetMode.HELICOPTER_X1 - SunsetMode.HELICOPTER_X0) * t;
        this.helicopterY = SunsetMode.HELICOPTER_Y0 + (SunsetMode.HELICOPTER_Y1 - SunsetMode.HELICOPTER_Y0) * t;
        this.helicopterZ = SunsetMode.HELICOPTER_Z0 + (SunsetMode.HELICOPTER_Z1 - SunsetMode.HELICOPTER_Z0) * t;
        this.helicopterAngle = SunsetMode.HELICOPTER_ANGLE0 
            + (SunsetMode.HELICOPTER_ANGLE1 - SunsetMode.HELICOPTER_ANGLE0) * t;
        this.helicopterDelay++;
        if (this.main.hardMode) {
          if (this.helicopterDelay == SunsetMode.HELICOPTER_HARD_TIME) {
            this.state = SunsetMode.STATE_HARD_MODE_FADE_OUT;
            this.main.stopSound(this.main.helicopterSound);
            this.main.requestSong(this.main.endingSong);
            this.main.startFade(true, this);
          }
        } else if (this.helicopterDelay == SunsetMode.HELICOPTER_TIME) {
          this.state = SunsetMode.STATE_PAUSED_2; 
          this.main.stopSound(this.main.helicopterSound);
          this.main.requestSong(this.main.endingSong);
          this.rotorAngle = 0;
          this.delay = SunsetMode.PAUSE_TIME_2;
        }
        break;
      case SunsetMode.STATE_PAUSED_2:
        if (--this.delay == 0) {
          this.state = SunsetMode.STATE_CREDITS;
          this.delay = 1;
        }
        break;
      case SunsetMode.STATE_CREDITS:
        if (--this.delay == 0) {
          if (this.lineIndex == this.credits[this.creditsIndex].length) {      
            this.lineIndex = 0;
            this.creditsIndex++;
            this.delay = SunsetMode.TYPE_TIME;
          } else if (this.lineLength == this.credits[this.creditsIndex][this.lineIndex].length) {            
            this.lineLength = 0;
            this.lineIndex++;
            if (this.lineIndex == this.credits[this.creditsIndex].length) {
              if (this.creditsIndex == this.credits.length - 1) {
                this.state = SunsetMode.STATE_WAITING;
                this.input.clearKeyPressedRecord();
              } else {
                this.delay = SunsetMode.EOM_PAUSE_TIME;
              }
            } else {
              this.delay = SunsetMode.TYPE_TIME;
            }                                      
          } else {            
            this.lineLength++;
            if (this.lineLength == this.credits[this.creditsIndex][this.lineIndex].length) {
              this.delay = SunsetMode.EOL_PAUSE_TIME;
            } else {
              this.delay = SunsetMode.TYPE_TIME;
            }
          } 
        }
        break;
      case SunsetMode.STATE_WAITING:
        if (this.input.isFire() || this.input.isShoot() || this.input.isEnter()) {
          this.state = SunsetMode.STATE_ADVANCE_TO_HARD_MODE;
          this.main.advancePlayerToHardMode();
          this.main.stopSong();
          this.main.startFade(true, this);
        }
        break;
    }    
  }

  public fadeCompleted(): void {
    if (this.state == SunsetMode.STATE_FADE_IN) {
      this.state = SunsetMode.STATE_PAUSED_1;
    } else if (this.state == SunsetMode.STATE_HARD_MODE_FADE_OUT) {
      this.state = SunsetMode.STATE_HARD_MODE_WAITING;
      this.main.requestMode(Modes.HARD_ENDING, this.gc);
    } else if (this.state == SunsetMode.STATE_ADVANCE_TO_HARD_MODE) {
      this.state = SunsetMode.STATE_DONE;
      this.main.requestMode(Modes.GAME, this.gc);
    }
  }  
  
  private drawHelicopter(alpha: any): void {    
    let k = SunsetMode.Z0 / (SunsetMode.Z0 - this.helicopterZ);    
    this.main.rotateGraphics(SunsetMode.CENTER_X + this.helicopterX * k, SunsetMode.CENTER_Y + this.helicopterY * k, 
        this.helicopterAngle, k);    
    this.main.scaleGraphics(0, -40, 1, 0.2);    
    for(let i = 0; i < 4; i++) {
      let ang = 90 * i + this.rotorAngle;
      this.main.drawRotated(this.main.rescueHelicopters[2], 0, 0, 0, -28, ang, alpha);
    }
    this.main.popGraphics();
    this.main.drawOffset(this.main.rescueHelicopters[0], -38, -40, alpha);
    this.main.popGraphics();
  }
  
  private drawHelicopterShaded(shade: any): void {    
    let k = SunsetMode.Z0 / (SunsetMode.Z0 - this.helicopterZ);    
    this.main.rotateGraphics(SunsetMode.CENTER_X + this.helicopterX * k, SunsetMode.CENTER_Y + this.helicopterY * k, 
        this.helicopterAngle, k);    
    this.main.scaleGraphics(0, -40, 1, 0.2);    
    for(let i = 0; i < 4; i++) {
      let ang = 90 * i + this.rotorAngle;
      this.main.drawRotated(this.main.rescueHelicopters[2], 0, 0, 0, -28, ang);
    }
    this.main.popGraphics();
    this.main.drawOffset(this.main.rescueHelicopters[1], -38, -40);
    if (shade > 0) {
      this.main.drawOffset(this.main.rescueHelicopters[0], -38, -40, shade);
    }
    this.main.popGraphics();
  }

  public render(gc: any, g: any): void {
    
    if (this.state == SunsetMode.STATE_HARD_MODE_WAITING) {
      g.setColor(Color.black);
      g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
      return;
    }

    if (this.state < SunsetMode.STATE_PAUSED_2) {

      if (++this.sunOffsetCounter == 2) {
        this.sunOffsetCounter = 0;
        if (++this.sunOffset == SunsetMode.SUN_HEIGHT) {
          this.sunOffset = 0;
        }
      }
      
      this.rotorAngle -= 30;
      if (this.rotorAngle == -90) {
        this.rotorAngle = 0;
      }
    }
    
    this.main.sunset.draw(0, 0);
    
    for(let i = 0, j = this.sunOffset; i < SunsetMode.SUN_HEIGHT; i++) {
      this.main.draw(this.main.suns[i], 428 + SunsetMode.sunOffsets[j], 356 + i);
      if (++j == SunsetMode.SUN_HEIGHT) {
        j = 0;
      }
    }
    
    for(let i = 0, j = this.sunOffset; i < SunsetMode.WAVES_HEIGHT; i++) {
      this.main.draw(this.main.waves[i], 428 + SunsetMode.sunOffsets[j], 448 + i);
      if (++j == SunsetMode.SUN_HEIGHT) {
        j = 0;
      }
    }
    
    if (this.state != SunsetMode.STATE_PAUSED_1) {
      if (this.helicopterDelay < SunsetMode.FADE_TIME) {
        this.drawHelicopter(this.helicopterDelay * SunsetMode.I_FADE_TIME);
      } else if (this.helicopterDelay < SunsetMode.SHADE_TIME + SunsetMode.FADE_TIME) {
        this.drawHelicopterShaded(1 - (this.helicopterDelay - SunsetMode.FADE_TIME) * SunsetMode.I_SHADE_TIME);
      } else {
        this.drawHelicopterShaded(0);
      }
    }
    
    if (this.state >= SunsetMode.STATE_CREDITS) {
      let lines = this.credits[this.creditsIndex];
      let indent = false;
      for(let i = 0; i < this.lineIndex; i++) {
        this.main.drawString(lines[i], indent ? 96 : 32, 
            48 + (i << 6), MainConstants.FONT_WHITE);
        indent = lines[i].length != 0;
      }
      if (this.lineIndex < lines.length) {
        this.main.drawString(lines[this.lineIndex], this.lineLength, 
            indent ? 96 : 32, 
            48 + (this.lineIndex << 6), MainConstants.FONT_WHITE);
      }
    }
  }
}
