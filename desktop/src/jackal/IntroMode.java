package jackal;

import org.newdawn.slick.*;

public class IntroMode implements IMode, IFadeListener, IMenuListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_EXPLOSION = 1;
  public static final int STATE_START_GAME = 2;
  public static final int STATE_OPTIONS = 3;
  public static final int STATE_TITLE = 4;
  public static final int STATE_STORY_SCROLL = 5;
  public static final int STATE_STORY = 6;
  public static final int STATE_SOLDIERS_ENTER = 7;
  public static final int STATE_TYPING = 8;
  public static final int STATE_NAMES_PAUSE = 9;
  public static final int STATE_FADE_OUT = 10;  
  public static final int STATE_DONE = 11;
  
  public static final String[] STORY = {
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
  };
  
  public static final String[][] NAMES = {
    { "Colonel",
      "Decker",
      "Lieut.",
      "Bob", },
    
    { "Sgt.",
      "Quint",
      "Corporal",
      "Grey", },
  }; 
  
  public static final float[][] NAME_XYS = {
    { 528, 128 },
    { 624, 192 },
    { 240, 640 },
    { 304, 736 },
  };

  public static final String FULL_SCREEN_TEXT = "SPACE - FULL-SCREEN MODE";
  public static final float FULL_SCREEN_TEXT_X
      = (Main.DISPLAY_WIDTH - (FULL_SCREEN_TEXT.length() << 5)) / 2f;
  public static final float FULL_SCREEN_TEXT_Y = 800;
  public static final String COPYRIGHT_TEXT = "© 2013, 2026 MEATFIGHTER.COM";
  public static final float COPYRIGHT_TEXT_X
      = (Main.DISPLAY_WIDTH - (COPYRIGHT_TEXT.length() << 5)) / 2f;
  public static final float COPYRIGHT_TEXT_Y = 860;
  
  public static final float UPPER_SOLDIER_Y = 96;
  public static final float LOWER_SOLDIER_Y = 576;
  
  public static final float UPPER_SOLDIER_X0 = 1024;
  public static final float UPPER_SOLDIER_X1 = 112;
  public static final float LOWER_SOLDIER_X0 = -288;
  public static final float LOWER_SOLDIER_X1 = 624;  
  
  public static final int TITLE_DELAY = 600;
  public static final int SCROLL_DELAY = 500;
  public static final int STORY_DELAY = 500;
  public static final int ENTER_DELAY = 40; 
  public static final int EON_DELAY = 45;
  public static final int TYPE_DELAY = 10;
  public static final int NAMES_DELAY = 100;
  public static final int EXPLOSION_DELAY = 100;
  
  public static final float I_SCROLL_DELAY = 1f / SCROLL_DELAY;
  public static final float I_ENTER_DELAY = 1f / ENTER_DELAY;
  
  public Main main;
  public GameContainer gc;
  public IInput input;
  public int state = STATE_FADE_IN;
  public int delay = TITLE_DELAY;
  public float scrollOffsetX;
  public float upperSolderX;
  public float lowerSolderX;
  public int namesIndex;
  public int nameLength;
  public int soldierSet;
  public Menu menu;
  public boolean selectionMade;
  public int selectedIndex;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    main.startFade(false, this);
    
    menu = new Menu(416, 608, main, 0, Menu.ICON_JEEP, 
        this, "start", "options");
    menu.enableKonamiCodeTest();
  }
  
  private void startTitle() {
    state = STATE_TITLE;
    delay = TITLE_DELAY;
    scrollOffsetX = 0;
    main.stopSong();
    menu.setInputEnabled(true);    
  }
  
  private void updateTitleScreen() {
    menu.update();
    
    if (--delay == 0) {
      main.stopSong();
      main.requestSong(main.titleSong);
      state = STATE_STORY_SCROLL;
      delay = SCROLL_DELAY;
      scrollOffsetX = 0;
      menu.setInputEnabled(false);
    }
  }
  
  private void updateStoryScroll() {
    
    scrollOffsetX = Main.DISPLAY_WIDTH * (delay * I_SCROLL_DELAY - 1f);
    
    if (--delay == 0) {
      state = STATE_STORY;
      scrollOffsetX = -Main.DISPLAY_WIDTH;
      delay = STORY_DELAY;
    }
  }
  
  private void startSolidersEnter(int set) {
    soldierSet = set;
    state = STATE_SOLDIERS_ENTER;
    delay = ENTER_DELAY;
    upperSolderX = UPPER_SOLDIER_X0;
    lowerSolderX = LOWER_SOLDIER_X0;
    namesIndex = 0;
    nameLength = 0;
  }
  
  private void updateStory() {
    if (--delay == 0) {      
      startSolidersEnter(0);
    }
  }
  
  private void updateSoldiersEnter() {
    
    float t = 1f - delay * I_ENTER_DELAY;
    upperSolderX = UPPER_SOLDIER_X0 + (UPPER_SOLDIER_X1 - UPPER_SOLDIER_X0) * t;
    lowerSolderX = LOWER_SOLDIER_X0 + (LOWER_SOLDIER_X1 - LOWER_SOLDIER_X0) * t;
        
    if (--delay == 0) {
      main.playSoundAlways(main.introChingSound);
      state = STATE_TYPING;
      upperSolderX = UPPER_SOLDIER_X1;
      lowerSolderX = LOWER_SOLDIER_X1;
      delay = EON_DELAY;
    }
  }
  
  private void updateTyping() {
    if (--delay == 0) {
      if (namesIndex == NAMES[soldierSet].length) {
        state = STATE_NAMES_PAUSE;
        delay = NAMES_DELAY;
      } else if (nameLength == NAMES[soldierSet][namesIndex].length()) {
        nameLength = 0;
        namesIndex++;
        delay = TYPE_DELAY;
      } else {
        main.playSoundAlways(main.introTypeSound);
        nameLength++;
        if (nameLength == NAMES[soldierSet][namesIndex].length()) {
          if (namesIndex == 1) {
            delay = EON_DELAY;
          } else {
            delay = TYPE_DELAY;
          } 
        } else {
          delay = TYPE_DELAY;
        }
      }
    }
  }
  
  private void updateNamesPause() {
    if (--delay == 0) {      
      if (soldierSet == 0) {
        startSolidersEnter(1); 
      } else if (main.isSongPlaying()) {
        delay = 1;
      } else {
        state = STATE_FADE_OUT;
        main.startFade(true, this);
      }
    }
  }
  
  @Override
  public void fadeCompleted() {    
    switch(state) {
      case STATE_FADE_IN:        
        startTitle();        
        break;
      case STATE_FADE_OUT:
        state = STATE_FADE_IN;
        main.startFade(false, this);
        break;
      case STATE_START_GAME:
        state = STATE_DONE;
        main.requestMode(Modes.INTRO_MAP, gc);        
        break;
      case STATE_OPTIONS:
        state = STATE_DONE;
        main.requestMode(Modes.OPTIONS, gc);
        break;
    }
  } 
  
  @Override
  public void selectionChanged(int selectedIndex) {
    if (state == STATE_TITLE) {
      delay = TITLE_DELAY;
    }
  }

  @Override
  public void optionSelected(int selectedIndex) {
    this.selectionMade = true;
    this.selectedIndex = selectedIndex;
    if (state == STATE_TITLE) {
      delay = TITLE_DELAY;
    }
  } 
  
  private boolean isKeypressed() {
    return input.isEnter() || input.isUp() || input.isDown() 
        || input.isRight() || input.isLeft() || input.isShoot()
        || input.isFire();
  }
  
  @Override
  public void update(GameContainer gc) throws SlickException {
    
    switch(state) {      
      case STATE_FADE_IN:
      case STATE_TITLE:
        updateTitleScreen();        
        break;
      case STATE_STORY_SCROLL:
        updateStoryScroll();
        break;
      case STATE_STORY:
        updateStory();
        break;
      case STATE_SOLDIERS_ENTER:
        updateSoldiersEnter();
        break;
      case STATE_TYPING:
        updateTyping();
        break;
      case STATE_NAMES_PAUSE:
        updateNamesPause();
        break;
      case STATE_EXPLOSION:
        if (--delay == 0) {
          state = STATE_START_GAME;
          main.startFade(true, this);
        }
        break;        
    }
    
    if (state >= STATE_STORY_SCROLL && state < STATE_FADE_OUT 
        && isKeypressed()) {
      menu.buttonReleased = false;
      startTitle();
    }
    
    if (state == STATE_TITLE && selectionMade) {
      if (selectedIndex == 0) {
        state = STATE_EXPLOSION;
        delay = EXPLOSION_DELAY;
        main.playSound(main.explodeSound);
      } else if (selectedIndex == 1) {
        state = STATE_OPTIONS;        
        main.startFade(true, this);
        main.playSound(main.explodeSound3);
      }      
    }
  }
  
  private void renderBlankScreen(GameContainer gc, Graphics g) {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
  }
  
  private void renderTitleAndStory(GameContainer gc, Graphics g) {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    if (state == STATE_STORY_SCROLL || state == STATE_STORY) {
      main.translateGraphics(scrollOffsetX, 0);
    }

    if (state <= STATE_TITLE || state == STATE_STORY_SCROLL) {
      main.title.draw(128, 192);
      menu.render();
      main.drawString(FULL_SCREEN_TEXT, FULL_SCREEN_TEXT_X, 
          FULL_SCREEN_TEXT_Y, Main.FONT_GRAY);
      main.drawString(COPYRIGHT_TEXT, COPYRIGHT_TEXT_X, 
          COPYRIGHT_TEXT_Y, Main.FONT_GRAY);
    }

    if (state == STATE_STORY_SCROLL || state == STATE_STORY) {

      for(int i = 0; i < STORY.length; i++) {
        main.drawString(STORY[i], Main.DISPLAY_WIDTH + 96, (i << 6) + 96, 
            Main.FONT_GRAY);
      }

      main.popGraphics();
    }
  }
  
  private void renderSoldiers(GameContainer gc, Graphics g) {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    int offset = soldierSet << 1;
    main.soldiers[offset + 0].draw(upperSolderX, UPPER_SOLDIER_Y);
    main.soldiers[offset + 1].draw(lowerSolderX, LOWER_SOLDIER_Y);
  }
  
  private void renderTyping(GameContainer gc, Graphics g) {
    
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    int offset = soldierSet << 1;
    main.soldiers[offset + 0].draw(UPPER_SOLDIER_X1, UPPER_SOLDIER_Y);
    main.soldiers[offset + 1].draw(LOWER_SOLDIER_X1, LOWER_SOLDIER_Y);
    
    for(int i = 0; i < namesIndex; i++) {
      main.drawString(NAMES[soldierSet][i], NAME_XYS[i][0], NAME_XYS[i][1], 
          Main.FONT_GRAY);
    }
    if (namesIndex != NAMES[soldierSet].length) {
      main.drawString(NAMES[soldierSet][namesIndex], nameLength, 
          NAME_XYS[namesIndex][0], NAME_XYS[namesIndex][1], Main.FONT_GRAY);
    }
  }  

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    
    switch(state) {
      case STATE_FADE_IN:
      case STATE_EXPLOSION:
      case STATE_START_GAME:
      case STATE_OPTIONS:
      case STATE_TITLE:
      case STATE_STORY_SCROLL:
      case STATE_STORY:      
        renderTitleAndStory(gc, g);
        break;
      case STATE_SOLDIERS_ENTER:      
        renderSoldiers(gc, g);
        break;
      case STATE_TYPING:
      case STATE_NAMES_PAUSE:
      case STATE_FADE_OUT:
        renderTyping(gc, g);
        break;
      case STATE_DONE:
        renderBlankScreen(gc, g);
        break;
    }
  }
}
