// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/InputMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMode } from "./IMode.js";
import { Modes } from "./Modes.js";
export class InputMode implements IMode, ControllerListener, KeyListener, IFadeListener {
  
  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_READING: number = 1;
  public static readonly STATE_READ_FADE: number = 2;
  public static readonly STATE_FADE_OUT: number = 3;
  public static readonly STATE_DONE: number = 4;
  
  public static readonly FADE_TIME: number = 11;
  
  public static readonly I_FADE_TIME: number = 1 / InputMode.FADE_TIME;

  public static readonly NAMES: any[] = [
    "throw grenade", 
    "fire machine gun",    
    "up", 
    "down", 
    "left", 
    "right",  
  ];
  public static readonly NAME_XS: any[] = javaArray(InputMode.NAMES.length, 0);
  
  static {
    for(let i = 0; i < InputMode.NAMES.length; i++) {
      InputMode.NAME_XS[i] = (MainConstants.DISPLAY_WIDTH - (InputMode.NAMES[i].length << 5)) / 2;
    }
  }
  
  public main: any = null as any;
  public gc: any = null as any;
  public buttonMapping: any = null as any;
  public state: number = InputMode.STATE_FADE_IN;
  public nameIndex: number = 0;
  public delay: number = 0;
  public controllerPressed: boolean = false;

  public init(main: any, gc: any): void {
    
    this.main = main;
    this.gc = gc;
    this.buttonMapping = main.buttonMapping;
    
    main.startFade(false, this);
  }

  public fadeCompleted(): void {
    if (this.state == InputMode.STATE_FADE_IN) {
      this.state = InputMode.STATE_READING;
      this.gc.getInput().addControllerListener(this);
      this.gc.getInput().addKeyListener(this);
    } else if (this.state == InputMode.STATE_FADE_OUT) {
      this.state = InputMode.STATE_DONE;
      this.gc.getInput().removeControllerListener(this);
      this.gc.getInput().removeKeyListener(this);
      this.main.requestMode(Modes.INTRO, this.gc);
    }
  }  

  public controllerLeftPressed(controllerIndex: any): void {
  }

  public controllerLeftReleased(i: any): void {
  }

  public controllerRightPressed(controllerIndex: any): void {
  }

  public controllerRightReleased(i: any): void {
  }

  public controllerUpPressed(controllerIndex: any): void {
  }

  public controllerUpReleased(i: any): void {
  }

  public controllerDownPressed(controllerIndex: any): void {
  }

  public controllerDownReleased(i: any): void {
  }

  public controllerButtonReleased(i: any, i1: any): void {
  }

  public setInput(input: any): void {
  }

  public isAcceptingInput(): boolean {
    return true;
  }

  public inputEnded(): void {
  }

  public inputStarted(): void {
  }

  public controllerButtonPressed(controllerIndex: any, buttonIndex: any): void {
    
    if (this.state != InputMode.STATE_READING) {
      return;
    }
    
    buttonIndex--;
    this.controllerPressed = true;
    this.buttonMapping.controller = true;
    this.buttonMapping.controllerIndex = controllerIndex;  
    
    this.main.controllerGrenadePressed = true;
    this.main.controllerGunPressed = true;
    
    switch(this.nameIndex) {
      case 0:
        this.buttonMapping.controllerGrenade = buttonIndex;
        if (this.buttonMapping.controllerGrenade == this.buttonMapping.controllerGun) {
          this.buttonMapping.controllerGun 
              = (this.buttonMapping.controllerGrenade == 0) ? 1 : 0;
        }
        this.advance();
        break;
      case 1:
        if (this.buttonMapping.controllerGrenade != buttonIndex) {   
          this.buttonMapping.controllerGun = buttonIndex;
          this.advance();
        }
        break;
    }    
  }  

  public keyPressed(i: any, c: any): void {
    
    if (this.state != InputMode.STATE_READING) {
      return;
    }
    
    switch(this.nameIndex) {
      case 0:
        this.buttonMapping.keyGrenade = i;
        this.advance();
        break;
      case 1:
        if (this.buttonMapping.keyGrenade != i) {
          this.buttonMapping.gunKeyMapped = true;
          this.buttonMapping.keyGun = i;
          this.advance();
        }
        break;
      case 2:
        if (this.buttonMapping.keyGrenade != i
            && this.buttonMapping.keyGun != i) {
          this.buttonMapping.keyUp = i;
          this.advance();
        }
        break;
      case 3:
        if (this.buttonMapping.keyGrenade != i
            && this.buttonMapping.keyGun != i
            && this.buttonMapping.keyUp != i) {
          this.buttonMapping.keyDown = i;
          this.advance();
        }
        break;
      case 4:
        if (this.buttonMapping.keyGrenade != i
            && this.buttonMapping.keyGun != i
            && this.buttonMapping.keyUp != i
            && this.buttonMapping.keyDown != i) {
          this.buttonMapping.keyLeft = i;
          this.advance();
        }
        break;
      case 5:
        if (this.buttonMapping.keyGrenade != i
            && this.buttonMapping.keyGun != i
            && this.buttonMapping.keyUp != i
            && this.buttonMapping.keyDown != i
            && this.buttonMapping.keyLeft != i) {
          this.buttonMapping.keyRight = i;
          this.advance();
        }
        break;
    }
  }

  public keyReleased(i: any, c: any): void {
  }
  
  private advance(): void {
    this.main.playSoundAlways(this.main.bulletHitSound);
    this.state = InputMode.STATE_READ_FADE;
    this.delay = InputMode.FADE_TIME;
  }

  public update(gc: any): void {
    switch(this.state) {
      case InputMode.STATE_READ_FADE:
        if (--this.delay == 0) {          
          if (++this.nameIndex == InputMode.NAMES.length
              || (this.controllerPressed && this.nameIndex == 2)) {
            this.state = InputMode.STATE_FADE_OUT;
            this.main.startFade(true, this);
          } else {
            this.state = InputMode.STATE_READING;
          }
        }
        break;
    }
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    this.main.drawString("On either your keyboard", 144, 304, MainConstants.FONT_GRAY);
    this.main.drawString("or gamepad, press:", 224, 368, MainConstants.FONT_GRAY);
    
    if (this.state != InputMode.STATE_FADE_OUT) {
      if (this.state == InputMode.STATE_READ_FADE) {
        this.main.drawStringAlpha(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex], 464, 
            MainConstants.FONT_ORANGE_GRAY, this.delay * InputMode.I_FADE_TIME);
      } else {
        this.main.drawString(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex], 
            464, MainConstants.FONT_ORANGE_GRAY);
      }
    }
  }
}
