// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/KonamiCode.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export enum KonamiCodeKeys { UP, DOWN, LEFT, RIGHT, GRENADE, GUN }
export class KonamiCode {  public constructor(arg0?: any) {
    const argCount = arguments.length;
    this.__construct_KonamiCode(argCount, arg0);
  }
  private __construct_KonamiCode(argCount: number, arg0?: any): void {
    if (argCount === 1) {
        let mainLocal = arg0;
            this.main = mainLocal;
                this.input = mainLocal.input;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }
  
  // Try the following sequence on the title screen :)
  
  private static readonly SEQUENCE: any[] = [ 
    KonamiCodeKeys.UP, 
    KonamiCodeKeys.UP, 
    KonamiCodeKeys.DOWN,
    KonamiCodeKeys.DOWN,
    KonamiCodeKeys.LEFT,
    KonamiCodeKeys.RIGHT,
    KonamiCodeKeys.LEFT,
    KonamiCodeKeys.RIGHT,
    KonamiCodeKeys.GUN,
    KonamiCodeKeys.GRENADE,
  ];
  
  public enabled: boolean = false;
  public keyReleased: boolean = false;
  public main: any = null as any;
  public input: any = null as any;
  public sequenceIndex: number = 0;
  
  
  
  public gettingClose(): boolean {    
    return !this.enabled && (KonamiCode.SEQUENCE[this.sequenceIndex] == KonamiCodeKeys.GRENADE 
        || KonamiCode.SEQUENCE[this.sequenceIndex] == KonamiCodeKeys.GUN);
  }
  
  public update(): void { 

    if (!(this.input.isDown() || this.input.isUp() || this.input.isLeft() || this.input.isRight()
        || this.input.isShoot() || this.input.isFire())) {
      this.keyReleased = true;
    }    
    
    if (this.enabled) {
      return;
    }
    
    if (this.keyReleased) {
      let key = null;
      if (this.input.isUp()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.UP;
      } else if (this.input.isDown()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.DOWN;
      } else if (this.input.isLeft()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.LEFT;
      } else if (this.input.isRight()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.RIGHT;
      } else if (this.input.isFire()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.GRENADE;
      } else if (this.input.isShoot()) {
        this.keyReleased = false;
        key = KonamiCodeKeys.GUN;
      }
      
      if (key == KonamiCode.SEQUENCE[this.sequenceIndex]) {          
        if (++this.sequenceIndex == KonamiCode.SEQUENCE.length) {
          this.main.playSoundAlways(this.main.weaponUpgradeSound);
          this.enabled = true;
        }
      } else if (key != null) {
        this.sequenceIndex = 0;
      }
    }
  }
}
