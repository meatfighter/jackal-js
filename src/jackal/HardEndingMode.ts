// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/HardEndingMode.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { IFadeListener } from "./IFadeListener.js";
import { IMode } from "./IMode.js";
import { Main } from "./Main.js";
import { Modes } from "./Modes.js";
import { Player } from "./Player.js";
export class HardEndingMode implements IMode, IFadeListener {
  
  public static readonly STATE_TYPING: number = 0;
  public static readonly STATE_PAUSED: number = 1;
  public static readonly STATE_FADE_OUT: number = 2;
  public static readonly STATE_FADE_IN: number = 3;
  public static readonly STATE_CREDITS: number = 4;
  public static readonly STATE_FINAL_SCORE_FADE_IN: number = 5;
  public static readonly STATE_FINAL_SCORE_JEEP: number = 6;
  public static readonly STATE_FINAL_SCORE: number = 7;
  public static readonly STATE_FINAL_SCORE_FADE_OUT: number = 8;
  public static readonly STATE_DONE: number = 9;
  
  public static readonly CARDS: any[] = [
    
    [ "Congratulations!!!",
      "",
      "Missing for years, but",
      "never forgotten, the",
      "men that you brought home",
      "thank you. ",
      "",
      "You have demonstrated the",
      "level of courage, cunning",
      "and ferocity of a",
      "wild jackal.", ],

    [ "Having proven his driving",
      "skills out in the field,",
      "he returned to civilian",
      "life and his one true",
      "love: IndyCar racing.", ],    
    
    [ "Having accomplished his",
      "mission, the finest", 
      "sharpshooter in the",
      "history of the service",
      "retired to Thailand where",
      "he discovered a talent",
      "for stick fighting.", ],
    
    [ "Having faced countless",
      "missions against a",
      "seemingly unstoppable",
      "force, he left the",
      "service and he ultimately",
      "reinvented himself as a",
      "Hollywood stunt driver.", ],

    [ "After commanding this",
      "mission, his engaging war",
      "stories inspired an",
      "award-winning series of",
      "video games that are",
      "enjoyed by players",
      "worldwide to this day." ],
  ];
  
  public static readonly NAMES: any[] = [
    "Sergeant Quint (Driver)",
    "Lieutenant Bob (Gunner)",
    "Corporal Grey (Driver)",
    "Colonel Decker (Gunner)",
  ];
  
  public static readonly NAME_INFOS: any[] = [
    [ 2, HardEndingMode.computeCenter(0) ],
    [ 1, HardEndingMode.computeCenter(1) ],
    [ 3, HardEndingMode.computeCenter(2) ],
    [ 0, HardEndingMode.computeCenter(3) ],
  ];
  
  public static readonly CARD0_Y: number = (Main.DISPLAY_HEIGHT - (((HardEndingMode.CARDS[0].length <<1)-1)<<5))>> 1;
  
  public static readonly CREDITS: any[] = [
    
    "programmed by",
    "michael birken", 
    "",
    
    "inspired by",
    "`jackal\" for the",
    "nintendo entertainment system",
    "and the brilliant works of",
    "konami",
    "",

    "based on graphics designed by",
    "shimoide",
    "satoh",
    "",

    "adopted music by",
    "sakamoto",
    "fujio",
    "",
                           
    "based on characters created by",
    "fujiwara",
    "yoshimoto",
    "maruo",
    "",

    "based on code by",
    "hori",
    "yanagisawa",
    "",
    
    "presented by",
    "meatfighter.com",  
    "",

    "thanks for playing",
    "you are a super player!!!",
  ];
  
  public static readonly TYPE_DELAY: number = 11;
  public static readonly PAUSE_DELAY: number = 1 * 91;
  public static readonly CREDITS_TIME: number = 45 * 91; 
  
  public static readonly CREDITS_HEIGHT: number = 0;
  
  static {
    let indent = false;
    let y = 0;
    for(let i = 0; i < HardEndingMode.CREDITS.length; i++, y += 32) {        
      if (!indent) {
        y += 16;
      } 
      indent = HardEndingMode.CREDITS[i].length > 0;
      if (!indent) {
        y += 32;
      }
    }
    HardEndingMode.CREDITS_HEIGHT = y;
  }
  
  public static readonly CREDITS_SPEED: number = (Main.DISPLAY_HEIGHT + HardEndingMode.CREDITS_HEIGHT) / HardEndingMode.CREDITS_TIME;
  
  public finalScore: string = null as any;
  public finalScoreX: number = 0;

  public main: any = null as any;
  public gc: any = null as any;
  public state: number = HardEndingMode.STATE_TYPING;
  public lineIndex: number = 0;
  public lineLength: number = 0;
  public cardIndex: number = 0;
  public delay: number = HardEndingMode.TYPE_DELAY;
  public creditsY: number = Main.DISPLAY_HEIGHT;
  public input: any = null as any;
  public jeepX: number = -50;
  public rumble: number = 0;
  
  private static computeCenter(index: any): number {
    return (Main.DISPLAY_WIDTH - (HardEndingMode.NAMES[index].length <<5))>> 1;
  }

  public init(main: any, gc: any): void {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    this.finalScore = "final score: " + main.scoreStr; 
    this.finalScoreX = (Main.DISPLAY_WIDTH - (this.finalScore.length <<5))>> 1;    
  }
  
  private updateTyping(): void {
    if (--this.delay == 0) {
      if (this.lineIndex == HardEndingMode.CARDS[this.cardIndex].length) {
        this.state = HardEndingMode.STATE_PAUSED;
        this.delay = HardEndingMode.PAUSE_DELAY;
      } else if (this.lineLength == HardEndingMode.CARDS[this.cardIndex][this.lineIndex].length) {
        this.lineLength = 0;
        this.lineIndex++;
        this.delay = HardEndingMode.TYPE_DELAY;
      } else {
        this.lineLength++;
        this.delay = HardEndingMode.TYPE_DELAY;
      }
    }    
  }
  
  private updatePaused(): void {
    if (--this.delay == 0) {
      this.state = HardEndingMode.STATE_FADE_OUT;
      this.main.startFade(true, this);
    }
  }
  
  private updateCredits(): void {
    this.creditsY -= HardEndingMode.CREDITS_SPEED;
    if (this.creditsY < -(32 + HardEndingMode.CREDITS_HEIGHT)) {
      this.state = HardEndingMode.STATE_FINAL_SCORE_FADE_IN;
      this.main.startFade(false, this);
    }
  }
  
  private updateFinalScoreJeep(): void {
    if (this.jeepX < Main.DISPLAY_WIDTH + 50) {
      this.jeepX += Player.SPEED;
    } else {
      this.state = HardEndingMode.STATE_FINAL_SCORE;
      this.input.clearKeyPressedRecord();
    }
  }
  
  private updateFinalScore(): void {
    if (this.input.isFire() || this.input.isShoot() || this.input.isEnter()) {
      this.state = HardEndingMode.STATE_FINAL_SCORE_FADE_OUT;
      this.main.stopSong();
      this.main.startFade(true, this);      
    }
  }

  public fadeCompleted(): void {    
    if (this.state == HardEndingMode.STATE_FINAL_SCORE_FADE_OUT) {
      this.state = HardEndingMode.STATE_DONE;
      this.main.requestMode(Modes.INTRO, this.gc);
    } else if (this.state == HardEndingMode.STATE_FINAL_SCORE_FADE_IN) {
      this.state = HardEndingMode.STATE_FINAL_SCORE_JEEP;      
    } else if (this.state == HardEndingMode.STATE_FADE_OUT) {
      this.lineIndex = 0;
      this.lineLength = 0;            
      if (++this.cardIndex == HardEndingMode.CARDS.length) {
        this.state = HardEndingMode.STATE_CREDITS;
      } else {
        this.state = HardEndingMode.STATE_FADE_IN;
        this.main.startFade(false, this);
      }
    } else {
      this.state = HardEndingMode.STATE_TYPING;      
      this.delay = HardEndingMode.TYPE_DELAY;
    }
  }  

  public update(gc: any): void {
    switch(this.state) {
      case HardEndingMode.STATE_TYPING:
        this.updateTyping();
        break;
      case HardEndingMode.STATE_PAUSED: 
        this.updatePaused();
        break;
      case HardEndingMode.STATE_CREDITS:
        this.updateCredits();
        break;
      case HardEndingMode.STATE_FINAL_SCORE_JEEP:
        this.updateFinalScoreJeep();
        break;
      case HardEndingMode.STATE_FINAL_SCORE:
        this.updateFinalScore();
        break;
    }
  }

  public render(gc: any, g: any): void {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    if (this.state == HardEndingMode.STATE_DONE) {
      return;
    }
    
    if (this.state >= HardEndingMode.STATE_FINAL_SCORE_FADE_IN) {
      this.main.drawString("THE END", 400, 432, Main.FONT_ORANGE_GRAY);
      
      if (this.state == HardEndingMode.STATE_FINAL_SCORE) {
        this.main.drawString(this.finalScore, this.finalScoreX, 496, Main.FONT_GRAY);  
      } else if (this.state == HardEndingMode.STATE_FINAL_SCORE_JEEP) {
        
        if (this.jeepX > 0) {
          g.setWorldClip(0, 494, this.jeepX, 38);
          this.main.drawString(this.finalScore, this.finalScoreX, 496, Main.FONT_GRAY);
          g.clearWorldClip();
        }
        
        if (++this.rumble == 17) {
          this.rumble = 0;
        }
        this.main.drawVehicle(this.main.players[0], 
            this.jeepX, 512 + Player.RUMBLE[this.rumble], 0);
      }            
    } else if (this.state == HardEndingMode.STATE_CREDITS) {
      this.main.translateGraphics(0, this.creditsY);
      let indent = false;
      for(let i = 0, y = 0; i < HardEndingMode.CREDITS.length; i++, y += 32) {        
        this.main.drawString(HardEndingMode.CREDITS[i], indent ? 64 : 32, y, 
            indent ? Main.FONT_GRAY : Main.FONT_ORANGE_GRAY);
        if (!indent) {
          y += 16;
        } 
        indent = HardEndingMode.CREDITS[i].length > 0;
        if (!indent) {
          y += 32;
        }
      }
      this.main.popGraphics();
    } else if (this.cardIndex == 0) {
      for(let i = 0; i < this.lineIndex; i++) {
        this.main.drawString(HardEndingMode.CARDS[this.cardIndex][i], 96, 
            HardEndingMode.CARD0_Y + (i << 6), Main.FONT_GRAY);
      }
      if (this.lineIndex != HardEndingMode.CARDS[this.cardIndex].length) {
        this.main.drawString(HardEndingMode.CARDS[this.cardIndex][this.lineIndex], this.lineLength, 
            96, HardEndingMode.CARD0_Y + (this.lineIndex << 6), Main.FONT_GRAY);
      }
    } else {
      
      this.main.soldiers[HardEndingMode.NAME_INFOS[this.cardIndex - 1][0]].draw(368, 32);
      this.main.drawString(HardEndingMode.NAMES[this.cardIndex - 1], HardEndingMode.NAME_INFOS[this.cardIndex - 1][1], 
          384, Main.FONT_GRAY);
      
      for(let i = 0; i < this.lineIndex; i++) {
        this.main.drawString(HardEndingMode.CARDS[this.cardIndex][i], 96, 
            480 + (i << 6), Main.FONT_GRAY);
      }
      if (this.lineIndex != HardEndingMode.CARDS[this.cardIndex].length) {
        this.main.drawString(HardEndingMode.CARDS[this.cardIndex][this.lineIndex], this.lineLength, 
            96, 480 + (this.lineIndex << 6), Main.FONT_GRAY);
      }
    }
  }
}
