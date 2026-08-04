// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/IntroMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMenuListener } from "./IMenuListener.js";
import { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
export class IntroMode implements IMode, IFadeListener, IMenuListener {
  
  public static readonly STATE_FADE_IN: number = 0;
  public static readonly STATE_EXPLOSION: number = 1;
  public static readonly STATE_START_GAME: number = 2;
  public static readonly STATE_OPTIONS: number = 3;
  public static readonly STATE_TITLE: number = 4;
  public static readonly STATE_STORY_SCROLL: number = 5;
  public static readonly STATE_STORY: number = 6;
  public static readonly STATE_SOLDIERS_ENTER: number = 7;
  public static readonly STATE_TYPING: number = 8;
  public static readonly STATE_NAMES_PAUSE: number = 9;
  public static readonly STATE_FADE_OUT: number = 10;  
  public static readonly STATE_DONE: number = 11;
  
  public static readonly STORY: any[] = [
    "Your brothers-in-arms are",
    "hostages behind enemy",
    "lines, and you're their",
    "only hope for freedom.",
    "But the firepower you'll",
    "face to rescue them is",
    "awesome.",
    "Rescue the POW's in the",
    "buildings.",
    "You'll need a pocket full",
    "of miracles, and the",
    "ferocity of a wild jackal.",    
  ];
  
  public static readonly NAMES: any[] = [
    [ "Colonel",
      "Decker",
      "Lieut.",
      "Bob", ],
    
    [ "Sgt.",
      "Quint",
      "Corporal",
      "Grey", ],
  ]; 
  
  public static readonly NAME_XYS: any[] = [
    [ 528, 128 ],
    [ 624, 192 ],
    [ 240, 640 ],
    [ 304, 736 ],
  ];
  
  public static readonly UPPER_SOLDIER_Y: number = 96;
  public static readonly LOWER_SOLDIER_Y: number = 576;
  
  public static readonly UPPER_SOLDIER_X0: number = 1024;
  public static readonly UPPER_SOLDIER_X1: number = 112;
  public static readonly LOWER_SOLDIER_X0: number = -288;
  public static readonly LOWER_SOLDIER_X1: number = 624;  
  
  public static readonly TITLE_DELAY: number = 600;
  public static readonly SCROLL_DELAY: number = 500;
  public static readonly STORY_DELAY: number = 500;
  public static readonly ENTER_DELAY: number = 40; 
  public static readonly EON_DELAY: number = 45;
  public static readonly TYPE_DELAY: number = 10;
  public static readonly NAMES_DELAY: number = 100;
  public static readonly EXPLOSION_DELAY: number = 100;
  
  public static readonly I_SCROLL_DELAY: number = 1 / IntroMode.SCROLL_DELAY;
  public static readonly I_ENTER_DELAY: number = 1 / IntroMode.ENTER_DELAY;
  
  public main: any = null as any;
  public gc: any = null as any;
  public input: any = null as any;
  public state: number = IntroMode.STATE_FADE_IN;
  public delay: number = IntroMode.TITLE_DELAY;
  public scrollOffsetX: number = 0;
  public upperSolderX: number = 0;
  public lowerSolderX: number = 0;
  public namesIndex: number = 0;
  public nameLength: number = 0;
  public soldierSet: number = 0;
  public menu: any = null as any;
  public selectionMade: boolean = false;
  public selectedIndex: number = 0;

  public init(main: any, gc: any): void {
    
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    main.startFade(false, this);
    
    this.menu = new Menu(416, 608, main, 0, Menu.ICON_JEEP, 
        this, "start", "options");
    this.menu.enableKonamiCodeTest();
  }
  
  private startTitle(): void {
    this.state = IntroMode.STATE_TITLE;
    this.delay = IntroMode.TITLE_DELAY;
    this.scrollOffsetX = 0;
    this.main.stopSong();
    this.menu.setInputEnabled(true);    
  }
  
  private updateTitleScreen(): void {
    this.menu.update();
    
    if (--this.delay == 0) {
      this.main.stopSong();
      this.main.requestSong(this.main.titleSong);
      this.state = IntroMode.STATE_STORY_SCROLL;
      this.delay = IntroMode.SCROLL_DELAY;
      this.scrollOffsetX = 0;
      this.menu.setInputEnabled(false);
    }
  }
  
  private updateStoryScroll(): void {
    
    this.scrollOffsetX = MainConstants.DISPLAY_WIDTH * (this.delay * IntroMode.I_SCROLL_DELAY - 1);
    
    if (--this.delay == 0) {
      this.state = IntroMode.STATE_STORY;
      this.scrollOffsetX = -MainConstants.DISPLAY_WIDTH;
      this.delay = IntroMode.STORY_DELAY;
    }
  }
  
  private startSolidersEnter(set: any): void {
    this.soldierSet = set;
    this.state = IntroMode.STATE_SOLDIERS_ENTER;
    this.delay = IntroMode.ENTER_DELAY;
    this.upperSolderX = IntroMode.UPPER_SOLDIER_X0;
    this.lowerSolderX = IntroMode.LOWER_SOLDIER_X0;
    this.namesIndex = 0;
    this.nameLength = 0;
  }
  
  private updateStory(): void {
    if (--this.delay == 0) {      
      this.startSolidersEnter(0);
    }
  }
  
  private updateSoldiersEnter(): void {
    
    let t = 1 - this.delay * IntroMode.I_ENTER_DELAY;
    this.upperSolderX = IntroMode.UPPER_SOLDIER_X0 + (IntroMode.UPPER_SOLDIER_X1 - IntroMode.UPPER_SOLDIER_X0) * t;
    this.lowerSolderX = IntroMode.LOWER_SOLDIER_X0 + (IntroMode.LOWER_SOLDIER_X1 - IntroMode.LOWER_SOLDIER_X0) * t;
        
    if (--this.delay == 0) {
      this.main.playSoundAlways(this.main.introChingSound);
      this.state = IntroMode.STATE_TYPING;
      this.upperSolderX = IntroMode.UPPER_SOLDIER_X1;
      this.lowerSolderX = IntroMode.LOWER_SOLDIER_X1;
      this.delay = IntroMode.EON_DELAY;
    }
  }
  
  private updateTyping(): void {
    if (--this.delay == 0) {
      if (this.namesIndex == IntroMode.NAMES[this.soldierSet].length) {
        this.state = IntroMode.STATE_NAMES_PAUSE;
        this.delay = IntroMode.NAMES_DELAY;
      } else if (this.nameLength == IntroMode.NAMES[this.soldierSet][this.namesIndex].length) {
        this.nameLength = 0;
        this.namesIndex++;
        this.delay = IntroMode.TYPE_DELAY;
      } else {
        this.main.playSoundAlways(this.main.introTypeSound);
        this.nameLength++;
        if (this.nameLength == IntroMode.NAMES[this.soldierSet][this.namesIndex].length) {
          if (this.namesIndex == 1) {
            this.delay = IntroMode.EON_DELAY;
          } else {
            this.delay = IntroMode.TYPE_DELAY;
          } 
        } else {
          this.delay = IntroMode.TYPE_DELAY;
        }
      }
    }
  }
  
  private updateNamesPause(): void {
    if (--this.delay == 0) {      
      if (this.soldierSet == 0) {
        this.startSolidersEnter(1); 
      } else if (this.main.isSongPlaying()) {
        this.delay = 1;
      } else {
        this.state = IntroMode.STATE_FADE_OUT;
        this.main.startFade(true, this);
      }
    }
  }

  public fadeCompleted(): void {    
    switch(this.state) {
      case IntroMode.STATE_FADE_IN:        
        this.startTitle();        
        break;
      case IntroMode.STATE_FADE_OUT:
        this.state = IntroMode.STATE_FADE_IN;
        this.main.startFade(false, this);
        break;
      case IntroMode.STATE_START_GAME:
        this.state = IntroMode.STATE_DONE;
        this.main.requestMode(Modes.INTRO_MAP, this.gc);        
        break;
      case IntroMode.STATE_OPTIONS:
        this.state = IntroMode.STATE_DONE;
        this.main.requestMode(Modes.OPTIONS, this.gc);
        break;
    }
  } 

  public selectionChanged(selectedIndex: any): void {
    if (this.state == IntroMode.STATE_TITLE) {
      this.delay = IntroMode.TITLE_DELAY;
    }
  }

  public optionSelected(selectedIndex: any): void {
    this.selectionMade = true;
    this.selectedIndex = selectedIndex;
    if (this.state == IntroMode.STATE_TITLE) {
      this.delay = IntroMode.TITLE_DELAY;
    }
  } 
  
  private isKeypressed(): boolean {
    return this.input.isEnter() || this.input.isUp() || this.input.isDown() 
        || this.input.isRight() || this.input.isLeft() || this.input.isShoot()
        || this.input.isFire();
  }

  public update(gc: any): void {
    
    switch(this.state) {      
      case IntroMode.STATE_FADE_IN:
      case IntroMode.STATE_TITLE:
        this.updateTitleScreen();        
        break;
      case IntroMode.STATE_STORY_SCROLL:
        this.updateStoryScroll();
        break;
      case IntroMode.STATE_STORY:
        this.updateStory();
        break;
      case IntroMode.STATE_SOLDIERS_ENTER:
        this.updateSoldiersEnter();
        break;
      case IntroMode.STATE_TYPING:
        this.updateTyping();
        break;
      case IntroMode.STATE_NAMES_PAUSE:
        this.updateNamesPause();
        break;
      case IntroMode.STATE_EXPLOSION:
        if (--this.delay == 0) {
          this.state = IntroMode.STATE_START_GAME;
          this.main.startFade(true, this);
        }
        break;        
    }
    
    if (this.state >= IntroMode.STATE_STORY_SCROLL && this.state < IntroMode.STATE_FADE_OUT 
        && this.isKeypressed()) {
      this.menu.buttonReleased = false;
      this.startTitle();
    }
    
    if (this.state == IntroMode.STATE_TITLE && this.selectionMade) {
      if (this.selectedIndex == 0) {
        this.state = IntroMode.STATE_EXPLOSION;
        this.delay = IntroMode.EXPLOSION_DELAY;
        this.main.playSound(this.main.explodeSound);
      } else if (this.selectedIndex == 1) {
        this.state = IntroMode.STATE_OPTIONS;        
        this.main.startFade(true, this);
        this.main.playSound(this.main.explodeSound3);
      }      
    }
  }
  
  private renderBlankScreen(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
  }
  
  private renderTitleAndStory(gc: any, g: any): void {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    if (this.state == IntroMode.STATE_STORY_SCROLL || this.state == IntroMode.STATE_STORY) {
      this.main.translateGraphics(this.scrollOffsetX, 0);
    }

    if (this.state <= IntroMode.STATE_TITLE || this.state == IntroMode.STATE_STORY_SCROLL) {
      this.main.title.draw(128, 192);
      this.menu.render();
    }

    if (this.state == IntroMode.STATE_STORY_SCROLL || this.state == IntroMode.STATE_STORY) {

      for(let i = 0; i < IntroMode.STORY.length; i++) {
        this.main.drawString(IntroMode.STORY[i], MainConstants.DISPLAY_WIDTH + 96, (i << 6) + 96, 
            MainConstants.FONT_GRAY);
      }

      this.main.popGraphics();
    }
  }
  
  private renderSoldiers(gc: any, g: any): void {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    let offset = this.soldierSet << 1;
    this.main.soldiers[offset + 0].draw(this.upperSolderX, IntroMode.UPPER_SOLDIER_Y);
    this.main.soldiers[offset + 1].draw(this.lowerSolderX, IntroMode.LOWER_SOLDIER_Y);
  }
  
  private renderTyping(gc: any, g: any): void {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);
    
    let offset = this.soldierSet << 1;
    this.main.soldiers[offset + 0].draw(IntroMode.UPPER_SOLDIER_X1, IntroMode.UPPER_SOLDIER_Y);
    this.main.soldiers[offset + 1].draw(IntroMode.LOWER_SOLDIER_X1, IntroMode.LOWER_SOLDIER_Y);
    
    for(let i = 0; i < this.namesIndex; i++) {
      this.main.drawString(IntroMode.NAMES[this.soldierSet][i], IntroMode.NAME_XYS[i][0], IntroMode.NAME_XYS[i][1], 
          MainConstants.FONT_GRAY);
    }
    if (this.namesIndex != IntroMode.NAMES[this.soldierSet].length) {
      this.main.drawString(IntroMode.NAMES[this.soldierSet][this.namesIndex], this.nameLength, 
          IntroMode.NAME_XYS[this.namesIndex][0], IntroMode.NAME_XYS[this.namesIndex][1], MainConstants.FONT_GRAY);
    }
  }  

  public render(gc: any, g: any): void {
    
    switch(this.state) {
      case IntroMode.STATE_FADE_IN:
      case IntroMode.STATE_EXPLOSION:
      case IntroMode.STATE_START_GAME:
      case IntroMode.STATE_OPTIONS:
      case IntroMode.STATE_TITLE:
      case IntroMode.STATE_STORY_SCROLL:
      case IntroMode.STATE_STORY:      
        this.renderTitleAndStory(gc, g);
        break;
      case IntroMode.STATE_SOLDIERS_ENTER:      
        this.renderSoldiers(gc, g);
        break;
      case IntroMode.STATE_TYPING:
      case IntroMode.STATE_NAMES_PAUSE:
      case IntroMode.STATE_FADE_OUT:
        this.renderTyping(gc, g);
        break;
      case IntroMode.STATE_DONE:
        this.renderBlankScreen(gc, g);
        break;
    }
  }
}
