// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/GameElement.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Main } from "./Main.js";
export abstract class GameElement {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 0) {
            this.main = Main.mainInstance;
                this.gameMode = Main.gameMode;
    
                this.init();
    
                this.gameMode.add(this);
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public main: any = null as any;
  public gameMode: any = null as any;
  
  public removeFlag: boolean = false;    
  public enemy: boolean = false;
  public enemyBullet: boolean = false;
  public x: number = 0;
  public y: number = 0;
  public layer: number = 0;
  public changeLayerValue: number = -1;
  
  
  
  public changeLayer(layer: any): void {
    this.changeLayerValue = layer;
  }
  
  public remove(): void {
    this.removeFlag = true;
  }
  
  public checkBounds(maxY: any): void {    
  }
  
  public abstract init(): void ;
  public abstract update(): void ;  
  public abstract render(): void ;
}
