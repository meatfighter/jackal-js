// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/InputMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { ButtonMapping } from "./ButtonMapping.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMenuListener } from "./IMenuListener.js";
import { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
export class InputMode implements IMode, ControllerListener, KeyListener, IFadeListener, IMenuListener {

  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_MENU: number = 1;
  public static readonly STATE_READING: number = 2;
  public static readonly STATE_READ_FADE: number = 3;
  public static readonly STATE_FADE_OUT: number = 4;
  public static readonly STATE_DONE: number = 5;

  public static readonly OPTION_CHANGE: number = 0;
  public static readonly OPTION_RESET: number = 1;
  public static readonly OPTION_DONE: number = 2;

  public static readonly FADE_TIME: number = 11;

  public static readonly I_FADE_TIME: number = 1 / InputMode.FADE_TIME;

  public static readonly INPUT_TITLE: string = "INPUT";
  public static readonly INPUT_TITLE_X: number = (MainConstants.DISPLAY_WIDTH - (InputMode.INPUT_TITLE.length << 5)) / 2;
  public static readonly INPUT_TITLE_Y: number = 96;
  public static readonly INPUT_MAPPING_Y: number = 192;
  public static readonly INPUT_MAPPING_ROW_HEIGHT: number = 64;
  public static readonly INPUT_MENU_X: number = 416;
  public static readonly INPUT_MENU_Y: number = 672;

  public static readonly ACTIONS: any[] = [
    ButtonMapping.ACTION_UP,
    ButtonMapping.ACTION_DOWN,
    ButtonMapping.ACTION_LEFT,
    ButtonMapping.ACTION_RIGHT,
    ButtonMapping.ACTION_GRENADE,
    ButtonMapping.ACTION_GUN,
    ButtonMapping.ACTION_START,
  ];

  public static readonly LABELS: any[] = [
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "GRENADE",
    "GUN",
    "START",
  ];

  public static readonly NAMES: any[] = [
    "UP",
    "DOWN",
    "LEFT",
    "RIGHT",
    "THROW GRENADE OR FIRE BAZOOKA",
    "SHOOT MACHINE GUN",
    "START OR PAUSE",
  ];
  public static readonly NAME_XS: any[] = javaArray(InputMode.NAMES.length, 0);

  static {
    for(let i = 0; i < InputMode.NAMES.length; i++) {
      InputMode.NAME_XS[i] = (MainConstants.DISPLAY_WIDTH - (InputMode.NAMES[i].length << 5)) / 2;
    }
  }

  public main: any = null as any;
  public gc: any = null as any;
  public buttonMapping: any = null as any;
  public state: number = InputMode.STATE_FADE_IN;
  public nameIndex: number = 0;
  public delay: number = 0;
  public menu: any = null as any;
  public selectedIndex: number = 0;
  public listeningForInput: boolean = false;

  public init(main: any, gc: any): void {

    this.main = main;
    this.gc = gc;
    this.buttonMapping = main.buttonMapping;
    this.createMenu(0);

    main.startFade(false, this);
  }

  private createMenu(selectedIndex: any): void {
    this.menu = new Menu(InputMode.INPUT_MENU_X, InputMode.INPUT_MENU_Y, this.main,
        selectedIndex, Menu.ICON_BROWN_TANK, this, "CHANGE", "RESET", "DONE");
  }

  public fadeCompleted(): void {
    if (this.state == InputMode.STATE_FADE_IN) {
      this.state = InputMode.STATE_MENU;
    } else if (this.state == InputMode.STATE_FADE_OUT) {
      this.state = InputMode.STATE_DONE;
      this.removeInputListeners();
      this.main.requestMode(Modes.INTRO, this.gc);
    }
  }

  public selectionChanged(selectedIndex: any): void {
  }

  public optionSelected(selectedIndex: any): void {
    if (this.state != InputMode.STATE_MENU) {
      return;
    }

    this.selectedIndex = selectedIndex;
    this.main.playSound(this.main.missileSound);

    switch(selectedIndex) {
      case InputMode.OPTION_CHANGE:
        this.startReading();
        break;
      case InputMode.OPTION_RESET:
        this.buttonMapping.resetToDefaults();
        this.main.notifyInputMappingChanged();
        this.createMenu(InputMode.OPTION_RESET);
        break;
      case InputMode.OPTION_DONE:
        this.main.notifyInputMappingChanged();
        this.state = InputMode.STATE_FADE_OUT;
        this.main.startFade(true, this);
        break;
    }
  }

  private startReading(): void {
    this.state = InputMode.STATE_READING;
    this.nameIndex = 0;
    this.delay = 0;
    this.menu = null;
    this.addInputListeners();
    this.gc.getInput().clearKeyPressedRecord();
    this.gc.getInput().clearControlPressedRecord();
  }

  private addInputListeners(): void {
    if (this.listeningForInput) {
      return;
    }
    this.gc.getInput().addControllerListener(this);
    this.gc.getInput().addKeyListener(this);
    this.listeningForInput = true;
  }

  private removeInputListeners(): void {
    if (!this.listeningForInput) {
      return;
    }
    this.gc.getInput().removeControllerListener(this);
    this.gc.getInput().removeKeyListener(this);
    this.listeningForInput = false;
  }

  public controllerLeftPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT);
  }

  public controllerLeftReleased(i: any): void {
  }

  public controllerRightPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT);
  }

  public controllerRightReleased(controllerIndex: any): void {
  }

  public controllerUpPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP);
  }

  public controllerUpReleased(controllerIndex: any): void {
  }

  public controllerDownPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN);
  }

  public controllerDownReleased(controllerIndex: any): void {
  }

  public controllerButtonReleased(controllerIndex: any, buttonIndex: any): void {
  }

  public setInput(input: any): void {
  }

  public isAcceptingInput(): boolean {
    return true;
  }

  public inputEnded(): void {
  }

  public inputStarted(): void {
  }

  public controllerButtonPressed(controllerIndex: any, buttonIndex: any): void {

    if (this.state != InputMode.STATE_READING) {
      return;
    }

    buttonIndex--;
    if (buttonIndex < 0 || (this.isActionStep() && this.isDirectionalGamepadButton(buttonIndex))) {
      return;
    }

    if (!this.isControllerButtonAvailable(buttonIndex, this.getCurrentAction())) {
      return;
    }

    this.buttonMapping.controller = true;
    this.buttonMapping.controllerIndex = controllerIndex;
    this.bindControllerButton(buttonIndex);
    this.advance();
  }

  private bindControllerDirection(buttonIndex: any): void {
    if (this.state != InputMode.STATE_READING || this.isActionStep()) {
      return;
    }

    if (!this.isControllerButtonAvailable(buttonIndex, this.getCurrentAction())) {
      return;
    }

    this.buttonMapping.controller = true;
    this.bindControllerButton(buttonIndex);
    this.advance();
  }

  public keyPressed(i: any, c: any): void {

    if (this.state != InputMode.STATE_READING) {
      return;
    }

    if (ButtonMapping.isReservedKey(i)) {
      return;
    }

    if (!this.isKeyboardKeyAvailable(i, this.getCurrentAction())) {
      return;
    }

    this.bindKeyboardKey(i);
    this.advance();
  }

  public keyReleased(i: any, c: any): void {
  }

  private bindKeyboardKey(i: any): void {
    switch(this.getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        this.buttonMapping.keyUp = i;
        break;
      case ButtonMapping.ACTION_DOWN:
        this.buttonMapping.keyDown = i;
        break;
      case ButtonMapping.ACTION_LEFT:
        this.buttonMapping.keyLeft = i;
        break;
      case ButtonMapping.ACTION_RIGHT:
        this.buttonMapping.keyRight = i;
        break;
      case ButtonMapping.ACTION_GRENADE:
        this.buttonMapping.keyGrenade = i;
        break;
      case ButtonMapping.ACTION_GUN:
        this.buttonMapping.gunKeyMapped = true;
        this.buttonMapping.keyGun = i;
        break;
      case ButtonMapping.ACTION_START:
        this.buttonMapping.keyStart = i;
        break;
    }
  }

  private bindControllerButton(buttonIndex: any): void {
    switch(this.getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        this.buttonMapping.controllerUp = buttonIndex;
        break;
      case ButtonMapping.ACTION_DOWN:
        this.buttonMapping.controllerDown = buttonIndex;
        break;
      case ButtonMapping.ACTION_LEFT:
        this.buttonMapping.controllerLeft = buttonIndex;
        break;
      case ButtonMapping.ACTION_RIGHT:
        this.buttonMapping.controllerRight = buttonIndex;
        break;
      case ButtonMapping.ACTION_GRENADE:
        this.buttonMapping.controllerGrenade = buttonIndex;
        break;
      case ButtonMapping.ACTION_GUN:
        this.buttonMapping.controllerGun = buttonIndex;
        break;
      case ButtonMapping.ACTION_START:
        this.buttonMapping.controllerStart = buttonIndex;
        break;
    }
  }

  private isKeyboardKeyAvailable(i: any, action: any): boolean {
    if (action != ButtonMapping.ACTION_UP && this.buttonMapping.keyUp == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_DOWN && this.buttonMapping.keyDown == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_LEFT && this.buttonMapping.keyLeft == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_RIGHT && this.buttonMapping.keyRight == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GRENADE && this.buttonMapping.keyGrenade == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GUN && this.buttonMapping.keyGun == i) {
      return false;
    }
    if (action != ButtonMapping.ACTION_START && this.buttonMapping.keyStart == i) {
      return false;
    }
    return true;
  }

  private isControllerButtonAvailable(buttonIndex: any, action: any): boolean {
    if (action != ButtonMapping.ACTION_UP && this.buttonMapping.controllerUp == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_DOWN && this.buttonMapping.controllerDown == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_LEFT && this.buttonMapping.controllerLeft == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_RIGHT && this.buttonMapping.controllerRight == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GRENADE && this.buttonMapping.controllerGrenade == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_GUN && this.buttonMapping.controllerGun == buttonIndex) {
      return false;
    }
    if (action != ButtonMapping.ACTION_START && this.buttonMapping.controllerStart == buttonIndex) {
      return false;
    }
    return true;
  }

  private isActionStep(): boolean {
    let action = this.getCurrentAction();
    return action == ButtonMapping.ACTION_GRENADE || action == ButtonMapping.ACTION_GUN
        || action == ButtonMapping.ACTION_START;
  }

  private isDirectionalGamepadButton(buttonIndex: any): boolean {
    return buttonIndex >= ButtonMapping.DEFAULT_CONTROLLER_UP
        && buttonIndex <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
  }

  private getCurrentAction(): number {
    return InputMode.ACTIONS[this.nameIndex];
  }

  private advance(): void {
    this.main.playSoundAlways(this.main.bulletHitSound);
    this.state = InputMode.STATE_READ_FADE;
    this.delay = InputMode.FADE_TIME;
  }

  public update(gc: any): void {
    switch(this.state) {
      case InputMode.STATE_MENU:
        this.menu.update();
        break;
      case InputMode.STATE_READ_FADE:
        if (--this.delay == 0) {
          if (++this.nameIndex == InputMode.NAMES.length) {
            this.removeInputListeners();
            this.state = InputMode.STATE_MENU;
            this.main.notifyInputMappingChanged();
            this.createMenu(InputMode.OPTION_DONE);
          } else {
            this.state = InputMode.STATE_READING;
          }
        }
        break;
    }
  }

  private renderInputMenu(gc: any, g: any): void {
    this.main.drawString(InputMode.INPUT_TITLE, InputMode.INPUT_TITLE_X,
        InputMode.INPUT_TITLE_Y, MainConstants.FONT_GRAY);

    let mappingX = this.getInputMappingX();
    for(let i = 0; i < InputMode.LABELS.length; i++) {
      this.main.drawString(this.buttonMapping.inputMappingLine(InputMode.LABELS[i],
          InputMode.ACTIONS[i]), mappingX,
          InputMode.INPUT_MAPPING_Y + i * InputMode.INPUT_MAPPING_ROW_HEIGHT,
          MainConstants.FONT_GRAY);
    }

    if (this.menu != null) {
      this.menu.render();
    }
  }

  private getInputMappingX(): number {
    let maxLength = 0;
    for(let i = 0; i < InputMode.LABELS.length; i++) {
      maxLength = Math.max(maxLength, this.buttonMapping.inputMappingLine(
          InputMode.LABELS[i], InputMode.ACTIONS[i]).length);
    }
    return (MainConstants.DISPLAY_WIDTH - (maxLength << 5)) / 2;
  }

  private renderReading(gc: any, g: any): void {
    this.main.drawString("ON EITHER YOUR KEYBOARD", 144, 304, MainConstants.FONT_GRAY);
    this.main.drawString("OR GAMEPAD, PRESS:", 224, 368, MainConstants.FONT_GRAY);

    if (this.state == InputMode.STATE_READ_FADE) {
      this.main.drawStringAlpha(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex], 464,
          MainConstants.FONT_ORANGE_GRAY, this.delay * InputMode.I_FADE_TIME);
    } else {
      this.main.drawString(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex],
          464, MainConstants.FONT_ORANGE_GRAY);
    }
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

    switch(this.state) {
      case InputMode.STATE_READING:
      case InputMode.STATE_READ_FADE:
        this.renderReading(gc, g);
        break;
      case InputMode.STATE_DONE:
        break;
      default:
        this.renderInputMenu(gc, g);
        break;
    }
  }
}
