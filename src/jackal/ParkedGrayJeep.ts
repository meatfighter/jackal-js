// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ParkedGrayJeep.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class ParkedGrayJeep extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  

  public init(): void {
    super.init();  
    
    this.layer = 3;
    
    this.bulletHits = 3;
    
    this.hitX1 = -40;
    this.hitY1 = -40;
    this.hitX2 = 40;
    this.hitY2 = 40;
    
    this.mine = true;
    this.mineX1 = -28;
    this.mineY1 = -28;
    this.mineX2 = 28;
    this.mineY2 = 28;
    
    this.solid = true;
    this.solidX1 = -48;
    this.solidY1 = -48;
    this.solidX2 = 48;
    this.solidY2 = 48;
    
    this.points = 50;
  }

  public update(): void {    
  }  

  public render(): void {
    this.main.drawCentered(this.main.parkedGrayJeep, this.x, this.y);
  }  
}
