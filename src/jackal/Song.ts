// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Song.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
export class Song {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 1 && typeof args[0] === "string") {
        let intro = args[0];
            this.intro = new Music(intro, Song.STREAMING);
        return;
    } else     if (args.length === 1) {
        let intro = args[0];
            this.intro = intro;
        return;
    } else     if (args.length === 2 && typeof args[0] === "string" && typeof args[1] === "string") {
        let intro = args[0];
        let loop = args[1];
            if (intro != null) {
                  this.intro = new Music(intro, Song.STREAMING);
                }
                this.loop = new Music(loop, Song.STREAMING);
        return;
    } else     if (args.length === 2) {
        let intro = args[0];
        let loop = args[1];
            this.intro = intro;
                this.loop = loop;
        return;
    } else     if (args.length === 3 && typeof args[0] === "string" && typeof args[1] === "string" && typeof args[2] === "string") {
        let intro = args[0];
        let intro2 = args[1];
        let loop = args[2];
            if (intro != null) {
                  this.intro = new Music(intro, Song.STREAMING);
                }
                if (intro2 != null) {
                  this.intro2 = new Music(intro2, Song.STREAMING);
                }
                this.loop = new Music(loop, Song.STREAMING);
        return;
    } else     if (args.length === 3) {
        let intro = args[0];
        let intro2 = args[1];
        let loop = args[2];
            this.intro = intro;
                this.intro2 = intro2;
                this.loop = loop;
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
