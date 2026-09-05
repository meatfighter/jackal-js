package jackal;

import org.newdawn.slick.*;

public class HardEndingMode implements IMode, IFadeListener {
  
  public static final int STATE_TYPING = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_FADE_OUT = 2;
  public static final int STATE_FADE_IN = 3;
  public static final int STATE_CREDITS = 4;
  public static final int STATE_FINAL_SCORE_FADE_IN = 5;
  public static final int STATE_FINAL_SCORE_JEEP = 6;
  public static final int STATE_FINAL_SCORE = 7;
  public static final int STATE_FINAL_SCORE_FADE_OUT = 8;
  public static final int STATE_DONE = 9;
  
  public static final String[][] CARDS = {
    
    { "Congratulations!!!",
      "",
      "Missing for years, but",
      "never forgotten, the",
      "men that you brought home",
      "thank you. ",
      "",
      "You have demonstrated the",
      "level of courage, cunning",
      "and ferocity of a",
      "wild jackal.", },

    { "Having proven his driving",
      "skills out in the field,",
      "he returned to civilian",
      "life and his one true",
      "love: IndyCar racing.", },    
    
    { "Having accomplished his",
      "mission, the finest", 
      "sharpshooter in the",
      "history of the service",
      "retired to Thailand where",
      "he discovered a talent",
      "for stick fighting.", },
    
    { "Having faced countless",
      "missions against a",
      "seemingly unstoppable",
      "force, he left the",
      "service and he ultimately",
      "reinvented himself as a",
      "Hollywood stunt driver.", },

    { "After commanding this",
      "mission, his engaging war",
      "stories inspired an",
      "award-winning series of",
      "video games that are",
      "enjoyed by players",
      "worldwide to this day." },
  };
  
  public static final String[] NAMES = {
    "Sergeant Quint (Driver)",
    "Lieutenant Bob (Gunner)",
    "Corporal Grey (Driver)",
    "Colonel Decker (Gunner)",
  };
  
  public static final int[][] NAME_INFOS = {
    { 2, computeCenter(0) },
    { 1, computeCenter(1) },
    { 3, computeCenter(2) },
    { 0, computeCenter(3) },
  };
  
  public static final float CARD0_Y 
      = (Main.DISPLAY_HEIGHT - (((CARDS[0].length << 1) - 1) << 5)) >> 1;
  
  public static final String[] CREDITS = {
    
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
  };
  
  public static final int TYPE_DELAY = 11;
  public static final int PAUSE_DELAY = 1 * 91;
  public static final int CREDITS_TIME = 45 * 91; 
  
  public static final int CREDITS_HEIGHT;
  
  static {
    boolean indent = false;
    int y = 0;
    for(int i = 0; i < CREDITS.length; i++, y += 32) {        
      if (!indent) {
        y += 16;
      } 
      indent = CREDITS[i].length() > 0;
      if (!indent) {
        y += 32;
      }
    }
    CREDITS_HEIGHT = y;
  }
  
  public static final float CREDITS_SPEED 
      = (Main.DISPLAY_HEIGHT + CREDITS_HEIGHT) / (float)CREDITS_TIME;
  
  public String finalScore;
  public float finalScoreX;

  public Main main;
  public GameContainer gc;
  public int state = STATE_TYPING;
  public int lineIndex;
  public int lineLength;
  public int cardIndex;
  public int delay = TYPE_DELAY;
  public float creditsY = Main.DISPLAY_HEIGHT;
  public IInput input;
  public float jeepX = -50;
  public int rumble;
  
  private static int computeCenter(int index) {
    return (Main.DISPLAY_WIDTH - (NAMES[index].length() << 5)) >> 1;
  }
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    finalScore = "final score: " + main.scoreStr; 
    finalScoreX = (Main.DISPLAY_WIDTH - (this.finalScore.length() << 5)) >> 1;    
  }
  
  private void updateTyping() {
    if (--delay == 0) {
      if (lineIndex == CARDS[cardIndex].length) {
        state = STATE_PAUSED;
        delay = PAUSE_DELAY;
      } else if (lineLength == CARDS[cardIndex][lineIndex].length()) {
        lineLength = 0;
        lineIndex++;
        delay = TYPE_DELAY;
      } else {
        lineLength++;
        delay = TYPE_DELAY;
      }
    }    
  }
  
  private void updatePaused() {
    if (--delay == 0) {
      state = STATE_FADE_OUT;
      main.startFade(true, this);
    }
  }
  
  private void updateCredits() {
    creditsY -= CREDITS_SPEED;
    if (creditsY < -(32 + CREDITS_HEIGHT)) {
      state = STATE_FINAL_SCORE_FADE_IN;
      main.startFade(false, this);
    }
  }
  
  private void updateFinalScoreJeep() {
    if (jeepX < Main.DISPLAY_WIDTH + 50) {
      if (++rumble == Player.RUMBLE_STEPS) {
        rumble = 0;
      }
      jeepX += Player.SPEED;
    } else {
      state = STATE_FINAL_SCORE;
      input.clearKeyPressedRecord();
    }
  }
  
  private void updateFinalScore() {
    if (input.isFire() || input.isShoot() || input.isEnter()) {
      state = STATE_FINAL_SCORE_FADE_OUT;
      main.stopSong();
      main.startFade(true, this);      
    }
  }
  
  @Override
  public void fadeCompleted() {    
    if (state == STATE_FINAL_SCORE_FADE_OUT) {
      state = STATE_DONE;
      main.requestMode(Modes.INTRO, gc);
    } else if (state == STATE_FINAL_SCORE_FADE_IN) {
      state = STATE_FINAL_SCORE_JEEP;      
    } else if (state == STATE_FADE_OUT) {
      lineIndex = 0;
      lineLength = 0;            
      if (++cardIndex == CARDS.length) {
        state = STATE_CREDITS;
      } else {
        state = STATE_FADE_IN;
        main.startFade(false, this);
      }
    } else {
      state = STATE_TYPING;      
      delay = TYPE_DELAY;
    }
  }  

  @Override
  public void update(GameContainer gc) throws SlickException {
    switch(state) {
      case STATE_TYPING:
        updateTyping();
        break;
      case STATE_PAUSED: 
        updatePaused();
        break;
      case STATE_CREDITS:
        updateCredits();
        break;
      case STATE_FINAL_SCORE_JEEP:
        updateFinalScoreJeep();
        break;
      case STATE_FINAL_SCORE:
        updateFinalScore();
        break;
    }
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    if (state == STATE_DONE) {
      return;
    }
    
    if (state >= STATE_FINAL_SCORE_FADE_IN) {
      main.drawString("THE END", 400, 432, Main.FONT_ORANGE_GRAY);
      
      if (state == STATE_FINAL_SCORE) {
        main.drawString(finalScore, finalScoreX, 496, Main.FONT_GRAY);  
      } else if (state == STATE_FINAL_SCORE_JEEP) {
        
        if (jeepX > 0) {
          g.setWorldClip(0, 494, jeepX, 38);
          main.drawString(finalScore, finalScoreX, 496, Main.FONT_GRAY);
          g.clearWorldClip();
        }
        
        main.drawVehicle(main.players[0], 
            jeepX, 512 + Player.RUMBLE[rumble], 0);
      }            
    } else if (state == STATE_CREDITS) {
      main.translateGraphics(0, creditsY);
      boolean indent = false;
      for(int i = 0, y = 0; i < CREDITS.length; i++, y += 32) {        
        main.drawString(CREDITS[i], indent ? 64 : 32, y, 
            indent ? Main.FONT_GRAY : Main.FONT_ORANGE_GRAY);
        if (!indent) {
          y += 16;
        } 
        indent = CREDITS[i].length() > 0;
        if (!indent) {
          y += 32;
        }
      }
      main.popGraphics();
    } else if (cardIndex == 0) {
      for(int i = 0; i < lineIndex; i++) {
        main.drawString(CARDS[cardIndex][i], 96, 
            CARD0_Y + (i << 6), Main.FONT_GRAY);
      }
      if (lineIndex != CARDS[cardIndex].length) {
        main.drawString(CARDS[cardIndex][lineIndex], lineLength, 
            96, CARD0_Y + (lineIndex << 6), Main.FONT_GRAY);
      }
    } else {
      
      main.soldiers[NAME_INFOS[cardIndex - 1][0]].draw(368, 32);
      main.drawString(NAMES[cardIndex - 1], NAME_INFOS[cardIndex - 1][1], 
          384, Main.FONT_GRAY);
      
      for(int i = 0; i < lineIndex; i++) {
        main.drawString(CARDS[cardIndex][i], 96, 
            480 + (i << 6), Main.FONT_GRAY);
      }
      if (lineIndex != CARDS[cardIndex].length) {
        main.drawString(CARDS[cardIndex][lineIndex], lineLength, 
            96, 480 + (lineIndex << 6), Main.FONT_GRAY);
      }
    }
  }
}
