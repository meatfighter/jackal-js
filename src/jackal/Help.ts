// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Help.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameElement } from "./GameElement.js";
export class Help extends GameElement {
  protected __initializeJavaSubclassDefaults(): void {
    super.__initializeJavaSubclassDefaults();
    this.left = false;
    this.visible = false;
    this.visibleCount = 0;
    this.blinks = 0;
  }
  public constructor(...args: any[]) {
    super();
    this.__construct_Help(...args);
  }
  private __construct_Help(...args: any[]): void {
    if (args.length === 3 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[2] === "boolean") {
        let xLocal = args[0];
        let yLocal = args[1];
        let leftLocal = args[2];
            this.x = xLocal;
                this.y = yLocal;
                this.left = leftLocal;
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  public visible: boolean = false;
  public visibleCount: number = 60;
  public blinks: number = 0;
  
  

  public init(): void {
  }

  public update(): void {
    if (--this.visibleCount == 0) {
      this.visibleCount = 12;
      this.visible = !this.visible;
      if (this.visible == false) {
        if (++this.blinks == 4) {
          this.removeFlag = true;
          new FriendlySoldier(this.x + (this.left ? -24 : 24), this.y + 28, this.left 
              ? FriendlySoldierType.HOUSE_LEFT_WALKING 
                  : FriendlySoldierType.HOUSE_RIGHT_WALKING,
                      2 + this.main.random.nextInt(3), false);
        }
      }
    }
  }

  public render(): void {
    if (this.visible) {
      this.main.draw(this.main.help, this.x - 48, this.y - 32);
    }
  }  
}
