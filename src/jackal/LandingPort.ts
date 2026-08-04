// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/LandingPort.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { FriendlyHelicopter } from "./FriendlyHelicopter.js";
import { GameElement } from "./GameElement.js";
export class LandingPort extends GameElement {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "number") {
        let x = args[0];
        let y = args[1];
        let type = args[2];
            this.x = x;
                this.y = y;
                this.type = type;
    
                switch(type) {
                  case LandingPort.TYPE_LEFT:
                    new FriendlyHelicopter(x + 320, y + 192, false, true);
                    break;
                  case LandingPort.TYPE_RIGHT:
                    new FriendlyHelicopter(x + 192, y + 192, false, false);
                    break;
                  case LandingPort.TYPE_CIRCLE:
                    new FriendlyHelicopter(x + 224, y + 256, false, false);
                    break;
                }
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public static readonly TYPE_LEFT: number = 0;
  public static readonly TYPE_RIGHT: number = 1;
  public static readonly TYPE_CIRCLE: number = 2;
  
  public static readonly CIRCLE_LIGHTS: any[] = [
    [ 392, 112 ],
    [ 328, 48 ],
    [ 264, 16 ],
    [ 168, 16 ],
    [ 104, 48 ],
    [ 40, 112 ], 
    [ 8, 208 ], 
    [ 8, 272 ], 
    [ 40, 368 ],
    [ 104, 432 ],
    [ 168, 464 ],
    [ 264, 464 ],
    [ 328, 432 ],
    [ 392, 368 ],
  ];

  private static ALPHAS: any[] = javaArray(182, 0);
  
  static {
    for(let i = 0; i < 182; i++) {
      LandingPort.ALPHAS[i] = 0.5 + (Math.sin(Math.PI * i / 91)) / 2;
    }
  }
  
  public type: number = 0;
  public redIndex: number = 0;
  public blueIndex: number = 91;
  
  

  public init(): void {
    this.layer = 0;
  }

  public update(): void {
    if (++this.redIndex == 182) {
      this.redIndex = 0;
    }
    if (++this.blueIndex == 182) {
      this.blueIndex = 0;
    }
  }

  public render(): void {
    switch(this.type) {
      case LandingPort.TYPE_LEFT:
        for(let i = 0; i < 6; i++) {
          let X = this.x + 136 + (i << 6);
          let Y = this.y + 16;
          if ((i & 1) == 0) {
            this.main.draw(this.main.lamps[3], X, Y);
            this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
            this.main.draw(this.main.lamps[3], X, Y + 320);
            this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
          } else {
            this.main.draw(this.main.lamps[1], X, Y);
            this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
            this.main.draw(this.main.lamps[1], X, Y + 320);
            this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
          }                       
        }
        for(let i = 0; i < 3; i++) {
          let X = this.x + 488;
          let Y = this.y + 80 + i * 96;
          if ((i & 1) == 0) {
            this.main.draw(this.main.lamps[3], X, Y);
            this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
          } else {
            this.main.draw(this.main.lamps[1], X, Y);
            this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
          }          
        }
        break;
      case LandingPort.TYPE_RIGHT:
        for(let i = 0; i < 6; i++) {
          let X = this.x + 40 + (i << 6);
          let Y = this.y + 16;
          if ((i & 1) == 0) {
            this.main.draw(this.main.lamps[3], X, Y);
            this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
            this.main.draw(this.main.lamps[3], X, Y + 320);
            this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
          } else {
            this.main.draw(this.main.lamps[1], X, Y);
            this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
            this.main.draw(this.main.lamps[1], X, Y + 320);
            this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
          }                       
        }
        for(let i = 0; i < 3; i++) {
          let X = this.x + 8;
          let Y = this.y + 80 + i * 96;
          if ((i & 1) == 1) {
            this.main.draw(this.main.lamps[3], X, Y);
            this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
          } else {
            this.main.draw(this.main.lamps[1], X, Y);
            this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
          }          
        }
        break;
      case LandingPort.TYPE_CIRCLE:
        let blue = true;
        for(let i = LandingPort.CIRCLE_LIGHTS.length - 1; i >= 0; i--, blue ^= true) {
          let X = this.x + LandingPort.CIRCLE_LIGHTS[i][0];
          let Y = this.y + LandingPort.CIRCLE_LIGHTS[i][1];
          if (blue) {
            this.main.draw(this.main.lamps[1], X, Y);
            this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
          } else {
            this.main.draw(this.main.lamps[3], X, Y);
            this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
          }
        }
        break;
    }
  }
}
