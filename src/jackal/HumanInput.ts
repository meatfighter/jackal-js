// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/HumanInput.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { IInput } from "./IInput.js";
export class HumanInput implements IInput {  public constructor(arg0?: any, arg1?: any) {
    const argCount = arguments.length;
    this.__construct_HumanInput(argCount, arg0, arg1);
  }
  private __construct_HumanInput(argCount: number, arg0?: any, arg1?: any): void {
    if (argCount === 2) {
        let buttonMappingLocal = arg0;
        let gc = arg1;
            this.buttonMapping = buttonMappingLocal;
                this.input = gc.getInput();
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
  }

  private buttonMapping: any = null as any;
  private input: any = null as any;
  private up: boolean = false;
  private down: boolean = false;
  private left: boolean = false;
  private right: boolean = false;
  private fire: boolean = false;
  private shoot: boolean = false;

  
  
  public snap(): void {
    this.up = this.input.isKeyDown(this.buttonMapping.keyUp);
    this.down = this.input.isKeyDown(this.buttonMapping.keyDown);
    this.left = this.input.isKeyDown(this.buttonMapping.keyLeft);
    this.right = this.input.isKeyDown(this.buttonMapping.keyRight);  
    this.fire = this.input.isKeyDown(this.buttonMapping.keyGrenade);
    
    if (this.buttonMapping.gunKeyMapped) {
      this.shoot = this.input.isKeyDown(this.buttonMapping.keyGun);
    } else {
      this.shoot = this.input.isKeyDown(Input.KEY_Z) | this.input.isKeyDown(Input.KEY_Y) 
          | this.input.isKeyDown(Input.KEY_W) | this.input.isKeyDown(Input.KEY_K);      
    }
    
    if (this.buttonMapping.controller) {
      this.up |= this.input.isControllerUp(this.buttonMapping.controllerIndex);
      this.down |= this.input.isControllerDown(this.buttonMapping.controllerIndex);
      this.left |= this.input.isControllerLeft(this.buttonMapping.controllerIndex);
      this.right |= this.input.isControllerRight(this.buttonMapping.controllerIndex);
      this.fire |= this.input.isButtonPressed(
          this.buttonMapping.controllerGrenade, this.buttonMapping.controllerIndex);
      this.shoot |= this.input.isButtonPressed(
          this.buttonMapping.controllerGun, this.buttonMapping.controllerIndex); 
    }
  }

  public reset(): void {
  }

  public isUp(): boolean {
    return this.up;
  }

  public isDown(): boolean {
    return this.down;
  }

  public isLeft(): boolean {
    return this.left;
  }

  public isRight(): boolean {
    return this.right;
  }
  
  public isFire(): boolean {
    return this.fire;
  }
  
  public isShoot(): boolean {
    return this.shoot;
  }

  public isEnter(): boolean {
    return this.input.isKeyPressed(Input.KEY_ENTER);
  }

  public isF12(): boolean {
    return this.input.isKeyPressed(Input.KEY_F12);
  }

  public isEscape(): boolean {
    return this.input.isKeyPressed(Input.KEY_ESCAPE);
  }

  public isPause(): boolean {
    return this.input.isKeyPressed(Input.KEY_P) 
        | this.input.isKeyPressed(Input.KEY_ENTER);
  }

  public clearKeyPressedRecord(): void {
    this.input.clearKeyPressedRecord();
  }

  public update(): boolean {
    return true;
  }
}
