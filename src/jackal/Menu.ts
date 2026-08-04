// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Menu.java.
// Original Java imports: none.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
export class Menu {  public constructor(...args: any[]) {
    this.__construct_Menu(...args);
  }
  private __construct_Menu(...args: any[]): void {
    if (args.length >= 6 && typeof args[0] === "number" && typeof args[1] === "number" && typeof args[3] === "number" && typeof args[4] === "number") {
        let xLocal = args[0];
        let yLocal = args[1];
        let mainLocal = args[2];
        let selectedIndexLocal = args[3];
        let iconLocal = args[4];
        let menuListenerLocal = args[5];
        let optionsLocal = args.slice(6);
            this.x = xLocal;
                this.y = yLocal;
                this.main = mainLocal;      
                this.selectedIndex = selectedIndexLocal;
                this.icon = iconLocal;
                this.menuListener = menuListenerLocal;
                this.options = optionsLocal;          
    
                this.input = mainLocal.input;    
                this.iconY = 16 + (selectedIndexLocal << 6);
    
                this.input.clearKeyPressedRecord();
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly ICON_JEEP: number = 0;
  public static readonly ICON_GRENADE: number = 1;
  public static readonly ICON_MISSILE: number = 2;
  public static readonly ICON_EXPLOSION: number = 3;
  public static readonly ICON_TANK: number = 4;
  
  private static readonly SELECT_STATE_STATIONARY: number = 0;
  private static readonly SELECT_STATE_ACCELERATING: number = 1;
  private static readonly SELECT_STATE_DECELERATING: number = 2;
  
  private static readonly SELECT_TIME: number = 8;
  
  private static readonly I_SELECT_TIME2: number = 1 / (Menu.SELECT_TIME * Menu.SELECT_TIME);
  
  public main: any = null as any;
  public options: any[] = null as any;
  public input: any = null as any;
  public x: number = 0;
  public y: number = 0;
  public iconY: number = 0;
  public selectedIndex: number = 0;
  public menuListener: any = null as any;
  public icon: number = 0;
  public buttonReleased: boolean = false;
  public selectState: number = Menu.SELECT_STATE_STATIONARY;
  public iconVy: number = 0;
  public iconMidY: number = 0;
  public iconA: number = 0;
  public targetY: number = 0;
  public selectionMade: boolean = false;
  public inputEnabled: boolean = true;
  public konamiCodeTest: boolean = false;
  
  
  
  public enableKonamiCodeTest(): void {
    this.konamiCodeTest = true;
  }
  
  public setInputEnabled(inputEnabled: any): void {
    this.inputEnabled = inputEnabled;
  }
  
  private moveIcon(): void {
    if (this.menuListener != null) {
      this.menuListener.selectionChanged(this.selectedIndex);
    }
    this.selectState = Menu.SELECT_STATE_ACCELERATING;
    this.targetY = 16 + (this.selectedIndex << 6);
    this.iconMidY = 0.5 * (this.iconY + this.targetY);
    this.iconVy = 0;
    this.iconA = 2 * (this.targetY - this.iconY) * Menu.I_SELECT_TIME2; 
  }

  public update(): void {
    
    if (this.konamiCodeTest) {
      this.main.konamiCode.update();
      if (this.main.konamiCode.gettingClose() 
          || (this.main.konamiCode.enabled && !this.main.konamiCode.keyReleased)) {
        return;
      }
    }
    
    if (!(this.input.isDown() || this.input.isUp() 
        || this.input.isShoot() || this.input.isFire())) {
      this.buttonReleased = true;
    }
    
    if (this.buttonReleased) {
      if (this.input.isDown()) {
        this.buttonReleased = false;
        if (this.inputEnabled && !this.selectionMade 
            && this.selectedIndex != this.options.length - 1) {
          this.selectedIndex++;
          this.moveIcon();
        }
      } else if (this.input.isUp()) {
        this.buttonReleased = false;
        if (this.inputEnabled && !this.selectionMade && this.selectedIndex != 0) {
          this.selectedIndex--;
          this.moveIcon();
        }
      } else if (this.input.isFire() || this.input.isShoot()) {
        this.buttonReleased = false;
        if (!this.selectionMade && this.inputEnabled) { 
          this.selectionMade = true;
          if (this.menuListener != null) {
            this.menuListener.optionSelected(this.selectedIndex);
          }
        }
      }  
    }  
    
    if (!this.selectionMade && this.input.isEnter() && this.inputEnabled) { 
      this.selectionMade = true;
      if (this.menuListener != null) {
        this.menuListener.optionSelected(this.selectedIndex);
      }
    }
    
    switch(this.selectState) {
      case Menu.SELECT_STATE_ACCELERATING:
        this.iconVy += this.iconA;
        this.iconY += this.iconVy;
        if (this.iconA > 0) {
          if (this.iconY >= this.iconMidY) {
            this.selectState = Menu.SELECT_STATE_DECELERATING;
          }
        } else {
          if (this.iconY <= this.iconMidY) {
            this.selectState = Menu.SELECT_STATE_DECELERATING;
          }
        }
        break;
      case Menu.SELECT_STATE_DECELERATING:
        this.iconVy -= this.iconA;
        this.iconY += this.iconVy;
        if (this.iconA > 0) {
          if (this.iconY >= this.targetY || this.iconVy <= 0) {
            this.selectState = Menu.SELECT_STATE_STATIONARY;
            this.iconY = this.targetY;
          }
        } else {
          if (this.iconY <=this.targetY||this.iconVy>= 0) {
            this.selectState = Menu.SELECT_STATE_STATIONARY;
            this.iconY = this.targetY;
          }
        }
        break;
    }
  }

  public render(): void {
    this.main.translateGraphics(this.x, this.y);
    for(let i = this.options.length - 1; i >= 0; i--) {
      this.main.drawString(this.options[i], 0, i << 6, MainConstants.FONT_GRAY);
    }
    
    switch(this.icon) {
      case Menu.ICON_JEEP:
        this.main.drawRotated(this.main.players[0][0], -72, this.iconY, 0);
        break;
      case Menu.ICON_GRENADE:
        this.main.drawRotated(this.main.grenade, -64, this.iconY, 0);
        break;
      case Menu.ICON_MISSILE:
        this.main.drawRotated(this.main.playerMissile, -64, this.iconY, 0);
        break;
      case Menu.ICON_EXPLOSION:
        this.main.drawRotated(this.main.explosions[0], -64, this.iconY, 0);
        break;
      case Menu.ICON_TANK:
        this.main.drawRotated(this.main.bossBlueTanks[0][0], -72, this.iconY, 0);
        break;
    }
    this.main.popGraphics();
  }
}
