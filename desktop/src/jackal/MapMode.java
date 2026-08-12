package jackal;

import org.newdawn.slick.*;

public class MapMode implements IMode, IFadeListener {

  public static final int STATE_FADE_IN = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_MOVING = 2;
  public static final int STATE_PAUSED_2 = 3;
  public static final int STATE_FADE_OUT = 4;
  public static final int STATE_DONE = 5;
  
  public static final int PAUSE_DELAY = 91;
  public static final int SOLDIER_DELAY = 14;
  public static final int PAUSE_DELAY_2 = 3 * 91;
  
  public static final float JEEP_SPEED = 2.25f;
  
  public static final int[] JEEP_YS = { 759, 631, 503, 379, 259 };
  
  public Main main;
  public GameContainer gc;
  public int state = STATE_FADE_IN;
  public int delay = PAUSE_DELAY;
  public float jeepY = 868;
  public int soldierDelay = SOLDIER_DELAY;
  public float targetJeepY;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc; 
    
    targetJeepY = JEEP_YS[main.stageIndex];
    
    main.startFade(false, this);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_PAUSED;
    } else {
      state = STATE_DONE;
      main.advanceStageIndex();
      main.requestMode(Modes.GAME, gc);
    }
  }
  
  @Override
  public void update(GameContainer gc) throws SlickException {
    
    switch(state) {
      case STATE_PAUSED:
        if (--delay == 0) {
          state = STATE_MOVING;
        }
        break;
      case STATE_MOVING:
        if (main.friendlySoldiersPickedUp > 0 && --soldierDelay == 0) {
          soldierDelay = SOLDIER_DELAY;
          main.friendlySoldiersPickedUp--;
          main.addPoints(2000);
        }
        jeepY -= JEEP_SPEED;
        if (jeepY <= targetJeepY) {
          jeepY = targetJeepY;
          if (main.friendlySoldiersPickedUp == 0) {
            state = STATE_PAUSED_2;
            delay = PAUSE_DELAY_2;
          }
        }
        break;
      case STATE_PAUSED_2:
        if (--delay == 0) {
          if (main.isSongPlaying()) {
            delay = 1;
          } else {
            state = STATE_FADE_OUT;
            main.startFade(true, this);
          }
        }
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
    
    main.map.draw(124, 92);
    
    main.drawScaled(main.players[0][2], 288, jeepY, 0.5f);
    
    main.draw(main.friendlySoldiers[0][8], 552, 344);
    
    main.drawString("1P SCORE", 416, 256, Main.FONT_GRAY);
    main.drawString(main.scoreStr, 704, 256, Main.FONT_GRAY);
    main.drawNumber(main.friendlySoldiersPickedUp, 2, 608, 352, Main.FONT_GRAY);    
  }
}
