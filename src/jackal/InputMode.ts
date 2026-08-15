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
  public static readonly STATE_SAVED: number = 6;

  public static readonly OPTION_CHANGE: number = 0;
  public static readonly OPTION_RESET: number = 1;
  public static readonly OPTION_DONE: number = 2;

  public static readonly FADE_TIME: number = 11;

  public static readonly I_FADE_TIME: number = 1 / InputMode.FADE_TIME;
  public static readonly DONE_DELAY: number = 30;
  public static readonly ARM_DELAY: number = 8;
  public static readonly CONTROLLER_INDEX_LIMIT: number = 16;
  public static readonly GAMEPAD_AXIS_LIMIT: number = 16;
  public static readonly AXIS_THRESHOLD: number = 0.5;
  public static readonly AXIS_RECENTER_THRESHOLD: number = 0.05;
  public static readonly EXTRA_HORIZONTAL_AXES: any[] = [2, 6];
  public static readonly EXTRA_VERTICAL_AXES: any[] = [3, 7];

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
  public draftButtonMapping: any = null as any;
  public assignedKeys: any = new Set();
  public assignedControllerButtons: any = new Set();
  public message: string = "";
  public armDelay: number = 0;
  public extraAxisBaselines: any[] = javaArray(
      InputMode.CONTROLLER_INDEX_LIMIT * InputMode.GAMEPAD_AXIS_LIMIT, Number.NaN);
  public extraAxisUpDown: boolean = false;
  public extraAxisDownDown: boolean = false;
  public extraAxisLeftDown: boolean = false;
  public extraAxisRightDown: boolean = false;
  public inputMappingLines: any[] = javaArray(InputMode.LABELS.length, "");
  public inputMappingX: number = 0;

  public init(main: any, gc: any): void {

    this.main = main;
    this.gc = gc;
    this.buttonMapping = main.buttonMapping;
    this.refreshInputMappingLines();
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
        this.refreshInputMappingLines();
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
    this.draftButtonMapping = this.copyButtonMapping(this.buttonMapping);
    this.assignedKeys.clear();
    this.assignedControllerButtons.clear();
    this.message = "";
    this.armDelay = InputMode.ARM_DELAY;
    this.resetExtraAxisBaselines();
    this.addInputListeners();
    this.syncExtraAxisDirectionState();
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
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT, controllerIndex);
  }

  public controllerLeftReleased(i: any): void {
  }

  public controllerRightPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT, controllerIndex);
  }

  public controllerRightReleased(controllerIndex: any): void {
  }

  public controllerUpPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP, controllerIndex);
  }

  public controllerUpReleased(controllerIndex: any): void {
  }

  public controllerDownPressed(controllerIndex: any): void {
    this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN, controllerIndex);
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

    if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {
      this.message = "ALREADY USED";
      return;
    }

    this.advance();
  }

  private bindControllerDirection(buttonIndex: any, controllerIndex: any): void {
    if (this.state != InputMode.STATE_READING || this.isActionStep()) {
      return;
    }

    if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {
      this.message = "ALREADY USED";
      return;
    }

    this.advance();
  }

  public keyPressed(i: any, c: any): void {

    if (this.state != InputMode.STATE_READING) {
      return;
    }

    if (ButtonMapping.isReservedKey(i)) {
      return;
    }

    if (!this.bindDraftKeyboardKey(i)) {
      this.message = "ALREADY USED";
      return;
    }

    this.advance();
  }

  public keyReleased(i: any, c: any): void {
  }

  private bindDraftKeyboardKey(i: any): boolean {
    if (this.assignedKeys.has(i)) {
      return false;
    }
    this.clearDraftKey(i);
    switch(this.getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        this.draftButtonMapping.keyUp = i;
        break;
      case ButtonMapping.ACTION_DOWN:
        this.draftButtonMapping.keyDown = i;
        break;
      case ButtonMapping.ACTION_LEFT:
        this.draftButtonMapping.keyLeft = i;
        break;
      case ButtonMapping.ACTION_RIGHT:
        this.draftButtonMapping.keyRight = i;
        break;
      case ButtonMapping.ACTION_GRENADE:
        this.draftButtonMapping.keyGrenade = i;
        break;
      case ButtonMapping.ACTION_GUN:
        this.draftButtonMapping.gunKeyMapped = true;
        this.draftButtonMapping.keyGun = i;
        break;
      case ButtonMapping.ACTION_START:
        this.draftButtonMapping.keyStart = i;
        break;
    }
    this.assignedKeys.add(i);
    return true;
  }

  private bindDraftControllerButton(buttonIndex: any, controllerIndex: any): boolean {
    if (this.assignedControllerButtons.has(buttonIndex)) {
      return false;
    }
    this.clearDraftControllerButton(buttonIndex);
    this.draftButtonMapping.controller = true;
    this.draftButtonMapping.controllerIndex = controllerIndex;
    switch(this.getCurrentAction()) {
      case ButtonMapping.ACTION_UP:
        this.draftButtonMapping.controllerUp = buttonIndex;
        break;
      case ButtonMapping.ACTION_DOWN:
        this.draftButtonMapping.controllerDown = buttonIndex;
        break;
      case ButtonMapping.ACTION_LEFT:
        this.draftButtonMapping.controllerLeft = buttonIndex;
        break;
      case ButtonMapping.ACTION_RIGHT:
        this.draftButtonMapping.controllerRight = buttonIndex;
        break;
      case ButtonMapping.ACTION_GRENADE:
        this.draftButtonMapping.controllerGrenade = buttonIndex;
        break;
      case ButtonMapping.ACTION_GUN:
        this.draftButtonMapping.controllerGun = buttonIndex;
        break;
      case ButtonMapping.ACTION_START:
        this.draftButtonMapping.controllerStart = buttonIndex;
        break;
    }
    this.assignedControllerButtons.add(buttonIndex);
    return true;
  }

  private copyButtonMapping(source: any): any {
    let copy = new ButtonMapping();
    copy.keyUp = source.keyUp;
    copy.keyDown = source.keyDown;
    copy.keyLeft = source.keyLeft;
    copy.keyRight = source.keyRight;
    copy.keyGrenade = source.keyGrenade;
    copy.keyGun = source.keyGun;
    copy.keyStart = source.keyStart;
    copy.controller = source.controller;
    copy.controllerIndex = source.controllerIndex;
    copy.controllerUp = source.controllerUp;
    copy.controllerDown = source.controllerDown;
    copy.controllerLeft = source.controllerLeft;
    copy.controllerRight = source.controllerRight;
    copy.controllerGrenade = source.controllerGrenade;
    copy.controllerGun = source.controllerGun;
    copy.controllerStart = source.controllerStart;
    copy.gunKeyMapped = source.gunKeyMapped;
    return copy;
  }

  private clearDraftKey(key: any): void {
    if (this.draftButtonMapping.keyUp == key) {
      this.draftButtonMapping.keyUp = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyDown == key) {
      this.draftButtonMapping.keyDown = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyLeft == key) {
      this.draftButtonMapping.keyLeft = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyRight == key) {
      this.draftButtonMapping.keyRight = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyGrenade == key) {
      this.draftButtonMapping.keyGrenade = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyGun == key) {
      this.draftButtonMapping.keyGun = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.keyStart == key) {
      this.draftButtonMapping.keyStart = ButtonMapping.NO_BINDING;
    }
  }

  private clearDraftControllerButton(buttonIndex: any): void {
    if (this.draftButtonMapping.controllerUp == buttonIndex) {
      this.draftButtonMapping.controllerUp = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerDown == buttonIndex) {
      this.draftButtonMapping.controllerDown = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerLeft == buttonIndex) {
      this.draftButtonMapping.controllerLeft = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerRight == buttonIndex) {
      this.draftButtonMapping.controllerRight = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerGrenade == buttonIndex) {
      this.draftButtonMapping.controllerGrenade = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerGun == buttonIndex) {
      this.draftButtonMapping.controllerGun = ButtonMapping.NO_BINDING;
    }
    if (this.draftButtonMapping.controllerStart == buttonIndex) {
      this.draftButtonMapping.controllerStart = ButtonMapping.NO_BINDING;
    }
  }

  private commitDraftButtonMapping(): void {
    this.buttonMapping.keyUp = this.draftButtonMapping.keyUp;
    this.buttonMapping.keyDown = this.draftButtonMapping.keyDown;
    this.buttonMapping.keyLeft = this.draftButtonMapping.keyLeft;
    this.buttonMapping.keyRight = this.draftButtonMapping.keyRight;
    this.buttonMapping.keyGrenade = this.draftButtonMapping.keyGrenade;
    this.buttonMapping.keyGun = this.draftButtonMapping.keyGun;
    this.buttonMapping.keyStart = this.draftButtonMapping.keyStart;
    this.buttonMapping.controller = this.draftButtonMapping.controller;
    this.buttonMapping.controllerIndex = this.draftButtonMapping.controllerIndex;
    this.buttonMapping.controllerUp = this.draftButtonMapping.controllerUp;
    this.buttonMapping.controllerDown = this.draftButtonMapping.controllerDown;
    this.buttonMapping.controllerLeft = this.draftButtonMapping.controllerLeft;
    this.buttonMapping.controllerRight = this.draftButtonMapping.controllerRight;
    this.buttonMapping.controllerGrenade = this.draftButtonMapping.controllerGrenade;
    this.buttonMapping.controllerGun = this.draftButtonMapping.controllerGun;
    this.buttonMapping.controllerStart = this.draftButtonMapping.controllerStart;
    this.buttonMapping.gunKeyMapped = this.draftButtonMapping.gunKeyMapped;
    this.draftButtonMapping = null;
    this.refreshInputMappingLines();
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

  private bindExtraAxisDirectionPressed(): void {
    if (this.state != InputMode.STATE_READING || this.isActionStep()) {
      this.syncExtraAxisDirectionState();
      return;
    }
    let buttonIndex = this.getPressedExtraAxisDirection();
    if (buttonIndex != null) {
      this.bindControllerDirection(buttonIndex, 0);
    }
  }

  private getPressedExtraAxisDirection(): any {
    if (this.isExtraAxisUpPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_UP;
    }
    if (this.isExtraAxisDownPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_DOWN;
    }
    if (this.isExtraAxisLeftPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_LEFT;
    }
    if (this.isExtraAxisRightPressed()) {
      return ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }
    return null;
  }

  private isExtraAxisUpDown(): boolean {
    return this.isAnyAxisLessThan(InputMode.EXTRA_VERTICAL_AXES, -InputMode.AXIS_THRESHOLD);
  }

  private isExtraAxisDownDown(): boolean {
    return this.isAnyAxisGreaterThan(InputMode.EXTRA_VERTICAL_AXES, InputMode.AXIS_THRESHOLD);
  }

  private isExtraAxisLeftDown(): boolean {
    return this.isAnyAxisLessThan(InputMode.EXTRA_HORIZONTAL_AXES, -InputMode.AXIS_THRESHOLD);
  }

  private isExtraAxisRightDown(): boolean {
    return this.isAnyAxisGreaterThan(InputMode.EXTRA_HORIZONTAL_AXES, InputMode.AXIS_THRESHOLD);
  }

  private isExtraAxisUpPressed(): boolean {
    let down = this.isExtraAxisUpDown();
    let pressed = down && !this.extraAxisUpDown;
    this.extraAxisUpDown = down;
    return pressed;
  }

  private isExtraAxisDownPressed(): boolean {
    let down = this.isExtraAxisDownDown();
    let pressed = down && !this.extraAxisDownDown;
    this.extraAxisDownDown = down;
    return pressed;
  }

  private isExtraAxisLeftPressed(): boolean {
    let down = this.isExtraAxisLeftDown();
    let pressed = down && !this.extraAxisLeftDown;
    this.extraAxisLeftDown = down;
    return pressed;
  }

  private isExtraAxisRightPressed(): boolean {
    let down = this.isExtraAxisRightDown();
    let pressed = down && !this.extraAxisRightDown;
    this.extraAxisRightDown = down;
    return pressed;
  }

  private isAnyAxisLessThan(axes: any, threshold: any): boolean {
    for(let controller = 0; controller < InputMode.CONTROLLER_INDEX_LIMIT; controller++) {
      for(let i = 0; i < axes.length; i++) {
        if (this.readExtraAxisValue(controller, axes[i]) < threshold) {
          return true;
        }
      }
    }
    return false;
  }

  private isAnyAxisGreaterThan(axes: any, threshold: any): boolean {
    for(let controller = 0; controller < InputMode.CONTROLLER_INDEX_LIMIT; controller++) {
      for(let i = 0; i < axes.length; i++) {
        if (this.readExtraAxisValue(controller, axes[i]) > threshold) {
          return true;
        }
      }
    }
    return false;
  }

  private readExtraAxisValue(controller: any, axis: any): number {
    try {
      let input = this.gc.getInput();
      if (input.getAxisCount(controller) <= axis) {
        return 0;
      }
      let value = input.getAxisValue(controller, axis);
      let baselineIndex = controller * InputMode.GAMEPAD_AXIS_LIMIT + axis;
      let baseline = this.extraAxisBaselines[baselineIndex];
      if (Number.isNaN(baseline)) {
        baseline = value;
        this.extraAxisBaselines[baselineIndex] = baseline;
      }
      if (Math.abs(value) <= InputMode.AXIS_RECENTER_THRESHOLD) {
        baseline = 0;
        this.extraAxisBaselines[baselineIndex] = baseline;
      }
      return value - baseline;
    } catch(e) {
      return 0;
    }
  }

  private resetExtraAxisBaselines(): void {
    for(let i = 0; i < this.extraAxisBaselines.length; i++) {
      this.extraAxisBaselines[i] = Number.NaN;
    }
  }

  private syncExtraAxisDirectionState(): void {
    this.extraAxisUpDown = this.isExtraAxisUpDown();
    this.extraAxisDownDown = this.isExtraAxisDownDown();
    this.extraAxisLeftDown = this.isExtraAxisLeftDown();
    this.extraAxisRightDown = this.isExtraAxisRightDown();
  }

  private getCurrentAction(): number {
    return InputMode.ACTIONS[this.nameIndex];
  }

  private advance(): void {
    this.main.playSoundAlways(this.main.bulletHitSound);
    this.message = "";
    this.state = InputMode.STATE_READ_FADE;
    this.delay = InputMode.FADE_TIME;
  }

  public update(gc: any): void {
    switch(this.state) {
      case InputMode.STATE_MENU:
        this.menu.update();
        break;
      case InputMode.STATE_READING:
        if (this.armDelay > 0) {
          this.syncExtraAxisDirectionState();
          this.armDelay--;
        } else {
          this.bindExtraAxisDirectionPressed();
        }
        break;
      case InputMode.STATE_READ_FADE:
        if (--this.delay == 0) {
          if (++this.nameIndex == InputMode.NAMES.length) {
            this.removeInputListeners();
            this.commitDraftButtonMapping();
            this.main.notifyInputMappingChanged();
            this.main.clearInputPressedRecords();
            this.message = "SAVED";
            this.delay = InputMode.DONE_DELAY;
            this.state = InputMode.STATE_SAVED;
          } else {
            this.state = InputMode.STATE_READING;
            this.armDelay = InputMode.ARM_DELAY;
            this.syncExtraAxisDirectionState();
          }
        }
        break;
      case InputMode.STATE_SAVED:
        if (--this.delay == 0) {
          this.message = "";
          this.state = InputMode.STATE_MENU;
          this.createMenu(InputMode.OPTION_DONE);
        }
        break;
    }
  }

  private renderInputMenu(gc: any, g: any): void {
    this.main.drawString(InputMode.INPUT_TITLE, InputMode.INPUT_TITLE_X,
        InputMode.INPUT_TITLE_Y, MainConstants.FONT_GRAY);

    let mappingX = this.getInputMappingX();
    for(let i = 0; i < InputMode.LABELS.length; i++) {
      this.main.drawString(this.inputMappingLines[i], mappingX,
          InputMode.INPUT_MAPPING_Y + i * InputMode.INPUT_MAPPING_ROW_HEIGHT,
          MainConstants.FONT_GRAY);
    }

    if (this.menu != null) {
      this.menu.render();
    }
  }

  private getInputMappingX(): number {
    return this.inputMappingX;
  }

  private refreshInputMappingLines(): void {
    let maxLength = 0;
    for(let i = 0; i < InputMode.LABELS.length; i++) {
      let line = this.buttonMapping.inputMappingLine(InputMode.LABELS[i],
          InputMode.ACTIONS[i]);
      this.inputMappingLines[i] = line;
      if (line.length > maxLength) {
        maxLength = line.length;
      }
    }
    this.inputMappingX = (MainConstants.DISPLAY_WIDTH - (maxLength << 5)) / 2;
  }

  private renderReading(gc: any, g: any): void {
    if (this.state == InputMode.STATE_SAVED) {
      this.main.drawString(this.message, this.centerStringX(this.message), 464,
          MainConstants.FONT_GRAY);
      return;
    }

    this.main.drawString("ON EITHER YOUR KEYBOARD", 144, 304, MainConstants.FONT_GRAY);
    this.main.drawString("OR GAMEPAD, PRESS:", 224, 368, MainConstants.FONT_GRAY);

    if (this.state == InputMode.STATE_READ_FADE) {
      this.main.drawStringAlpha(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex], 464,
          MainConstants.FONT_ORANGE_GRAY, this.delay * InputMode.I_FADE_TIME);
    } else {
      this.main.drawString(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex],
          464, MainConstants.FONT_ORANGE_GRAY);
    }
    if (this.state == InputMode.STATE_READING && this.message.length > 0) {
      this.main.drawString(this.message, this.centerStringX(this.message), 560,
          MainConstants.FONT_GRAY);
    }
  }

  private centerStringX(text: any): number {
    return (MainConstants.DISPLAY_WIDTH - (text.length << 5)) / 2;
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

    switch(this.state) {
      case InputMode.STATE_READING:
      case InputMode.STATE_READ_FADE:
      case InputMode.STATE_SAVED:
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
