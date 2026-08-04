// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/KonamiCode.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
enum KonamiCodeKeys { UP, DOWN, LEFT, RIGHT, GRENADE, GUN }
export class KonamiCode {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1) {
        let main = args[0];
            this.main = main;
                this.input = main.input;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  // Try the following sequence on the title screen :)
  
  private static readonly SEQUENCE: any[] = [ 
    Keys.UP, 
    Keys.UP, 
    Keys.DOWN,
    Keys.DOWN,
    Keys.LEFT,
    Keys.RIGHT,
    Keys.LEFT,
    Keys.RIGHT,
    Keys.GUN,
    Keys.GRENADE,
  ];
  
  public enabled: boolean = false;
  public keyReleased: boolean = false;
  public main: any = null as any;
  public input: any = null as any;
  public sequenceIndex: number = 0;
  
  
  
  public gettingClose(): boolean {    
    return !this.enabled && (KonamiCode.SEQUENCE[this.sequenceIndex] == Keys.GRENADE 
        || KonamiCode.SEQUENCE[this.sequenceIndex] == Keys.GUN);
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
        key = Keys.UP;
      } else if (this.input.isDown()) {
        this.keyReleased = false;
        key = Keys.DOWN;
      } else if (this.input.isLeft()) {
        this.keyReleased = false;
        key = Keys.LEFT;
      } else if (this.input.isRight()) {
        this.keyReleased = false;
        key = Keys.RIGHT;
      } else if (this.input.isFire()) {
        this.keyReleased = false;
        key = Keys.GRENADE;
      } else if (this.input.isShoot()) {
        this.keyReleased = false;
        key = Keys.GUN;
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
