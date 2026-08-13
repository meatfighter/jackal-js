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

  private static readonly CONTROLLER_INDEX_LIMIT: number = 16;
  private static readonly GAMEPAD_BUTTON_CONTROL_OFFSET: number = 4;

  private buttonMapping: any = null as any;
  private input: any = null as any;
  private up: boolean = false;
  private down: boolean = false;
  private left: boolean = false;
  private right: boolean = false;
  private fire: boolean = false;
  private shoot: boolean = false;

  
  
  public snap(): void {
    this.up = this.input.isKeyDown(this.buttonMapping.keyUp)
        || this.isControllerBindingDown(this.buttonMapping.controllerUp);
    this.down = this.input.isKeyDown(this.buttonMapping.keyDown)
        || this.isControllerBindingDown(this.buttonMapping.controllerDown);
    this.left = this.input.isKeyDown(this.buttonMapping.keyLeft)
        || this.isControllerBindingDown(this.buttonMapping.controllerLeft);
    this.right = this.input.isKeyDown(this.buttonMapping.keyRight)
        || this.isControllerBindingDown(this.buttonMapping.controllerRight);  
    this.fire = this.input.isKeyDown(this.buttonMapping.keyGrenade)
        || this.isAnyControllerButtonDown(this.buttonMapping.controllerGrenade);
    this.shoot = this.input.isKeyDown(this.buttonMapping.keyGun)
        || this.isAnyControllerButtonDown(this.buttonMapping.controllerGun);
  }

  private isControllerBindingDown(button: any): boolean {
    switch(button) {
      case 12:
        return this.input.isControllerUp(Input.ANY_CONTROLLER);
      case 13:
        return this.input.isControllerDown(Input.ANY_CONTROLLER);
      case 14:
        return this.input.isControllerLeft(Input.ANY_CONTROLLER);
      case 15:
        return this.input.isControllerRight(Input.ANY_CONTROLLER);
      default:
        return this.isAnyControllerButtonDown(button);
    }
  }

  private isAnyControllerButtonDown(button: any): boolean {
    if (button < 0) {
      return false;
    }
    return this.input.isButtonPressed(button, Input.ANY_CONTROLLER);
  }

  private isControllerBindingPressed(button: any): boolean {
    let pressed = false;
    let control = HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button;
    for(let controller = 0; controller < HumanInput.CONTROLLER_INDEX_LIMIT; controller++) {
      pressed = this.input.isControlPressed(control, controller) || pressed;
    }
    return pressed;
  }

  private isMappedStartPressed(): boolean {
    let pressed = this.input.isKeyPressed(this.buttonMapping.keyStart);
    pressed = this.isControllerBindingPressed(this.buttonMapping.controllerStart) || pressed;
    return pressed;
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
    return this.isMappedStartPressed();
  }

  public isFullscreenTogglePressed(): boolean {
    return this.input.isKeyPressed(Input.KEY_SPACE);
  }

  public isEscape(): boolean {
    return this.input.isKeyPressed(Input.KEY_ESCAPE);
  }

  public isPause(): boolean {
    return this.isMappedStartPressed();
  }

  public clearKeyPressedRecord(): void {
    this.input.clearKeyPressedRecord();
    this.input.clearControlPressedRecord();
  }

  public update(): boolean {
    return true;
  }
}
