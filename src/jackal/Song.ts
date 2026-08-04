// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Song.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class Song {  public constructor(...args: any[]) {
    this.__construct_Song(...args);
  }
  private __construct_Song(...args: any[]): void {
    if (args.length === 1 && (args[0] === null || typeof args[0] === "string")) {
        let introLocal6 = args[0];
            this.intro = new Music(introLocal6, Song.STREAMING);
        return;
    } else     if (args.length === 1) {
        let introLocal5 = args[0];
            this.intro = introLocal5;
        return;
    } else     if (args.length === 2 && (args[0] === null || typeof args[0] === "string") && (args[1] === null || typeof args[1] === "string")) {
        let introLocal4 = args[0];
        let loopLocal4 = args[1];
            if (introLocal4 != null) {
                  this.intro = new Music(introLocal4, Song.STREAMING);
                }
                this.loop = new Music(loopLocal4, Song.STREAMING);
        return;
    } else     if (args.length === 2) {
        let introLocal3 = args[0];
        let loopLocal3 = args[1];
            this.intro = introLocal3;
                this.loop = loopLocal3;
        return;
    } else     if (args.length === 3 && (args[0] === null || typeof args[0] === "string") && (args[1] === null || typeof args[1] === "string") && (args[2] === null || typeof args[2] === "string")) {
        let introLocal2 = args[0];
        let intro2Local2 = args[1];
        let loopLocal2 = args[2];
            if (introLocal2 != null) {
                  this.intro = new Music(introLocal2, Song.STREAMING);
                }
                if (intro2Local2 != null) {
                  this.intro2 = new Music(intro2Local2, Song.STREAMING);
                }
                this.loop = new Music(loopLocal2, Song.STREAMING);
        return;
    } else     if (args.length === 3) {
        let introLocal = args[0];
        let intro2Local = args[1];
        let loopLocal = args[2];
            this.intro = introLocal;
                this.intro2 = intro2Local;
                this.loop = loopLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STREAMING: boolean = false;

  public intro: any = null as any;
  public intro2: any = null as any;
  public loop: any = null as any;
  public playing: boolean = false;
  public playedIntro2: boolean = false;

  
  
  
  
  
  
  
  
    
  
  

  public stop(): void {
    if (this.intro != null && this.intro.playing()) {
      this.intro.stop();
    }
    if (this.intro2 != null && this.intro2.playing()) {
      this.intro2.stop();
    }
    if (this.loop != null && this.loop.playing()) {
      this.loop.stop();
    }
    this.playing = false;  
    this.playedIntro2 = false;
  }

  public play(): void {    
    if (this.playing) {
      return;
    }
    this.stop();
    if (this.intro == null && this.intro2 == null) {
      this.loop.loop();
    } else if (this.intro == null) {
      this.intro2.play();
    } else {
      this.intro.play();
    }
    this.playing = true;
  }

  public update(): void {
    if (this.playing) {
      if (this.intro == null || !this.intro.playing()) {
        if (!(this.intro2 == null || this.playedIntro2)) {
          this.playedIntro2 = true;
          this.intro2.play();
        } else if ((this.intro2 == null || !this.intro2.playing())
            && this.loop != null && !this.loop.playing()) {
          this.loop.loop();
        }
      }
      if (this.loop == null && !this.intro.playing() 
          && (this.intro2 == null || !this.intro2.playing())) {
        this.stop();        
      }      
    }
  }
}
