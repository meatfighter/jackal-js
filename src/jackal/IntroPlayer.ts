// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/IntroPlayer.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
import { Player } from "./Player.js";
export class IntroPlayer extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
        let chinook = args[2];
            this.x = x;
                this.y = y;
                this.chinook = chinook;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_DIAGONAL: number = 0;
  public static readonly STATE_REVERSE: number = 1;
  public static readonly STATE_PAUSED: number = 2;
  
  public static readonly DIAGONAL_TIME: number = 75;
  public static readonly REVERSE_TIME: number = 11;
  
  public static readonly FINAL_X: number = 328.5;
  public static readonly FINAL_Y: number = 11074;
  
  public angle: number = -45;
  public state: number = IntroPlayer.STATE_DIAGONAL;
  public delay: number = IntroPlayer.DIAGONAL_TIME;
  public chinook: any = null as any;
  
  

  public init(): void {
    this.layer = 3;
  }

  public update(): void {
    switch(this.state) {
      case IntroPlayer.STATE_DIAGONAL:
        this.x -= Player.SPEED;
        this.y += Player.SPEED;
        if (--this.delay == 0) {
          this.state = IntroPlayer.STATE_REVERSE;
          this.delay = IntroPlayer.REVERSE_TIME;
        }
        break;
      case IntroPlayer.STATE_REVERSE:
        if (this.angle > -90) {
          this.angle -= Player.ANGLE_VELOCITY;
        } else {
          this.angle = -90;
        }
        if (--this.delay == 0) {
          this.state = IntroPlayer.STATE_PAUSED;
          this.x = IntroPlayer.FINAL_X;
          this.y = IntroPlayer.FINAL_Y;
          this.chinook.unloadCompleted();
        }
        break;
    }
  }

  public render(): void {
    
    this.main.drawVehicle(this.main.players[0], 
        this.x, this.y + Player.RUMBLE[0], this.angle);
  }  
}
