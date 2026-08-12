package jackal;

import org.newdawn.slick.*;

public class JeepHereMode implements IMode, IFadeListener {

  public static final int STATE_FADE_IN = 0;
  public static final int STATE_SLIDE = 1;
  public static final int STATE_HERE = 2;
  public static final int STATE_FADE_OUT = 3;
  public static final int STATE_DONE = 4;  
  
  public static final Color COLOR_CYAN = new Color(0xFF007C8D);
  
  public static final int SLIDE_TIME = 91;
  public static final int HERE_DELAY = 3 * 91;
  
  public static final float SLIDE_SPEED 
      = (Main.DISPLAY_WIDTH - 224) / (float)SLIDE_TIME;
  
  public Main main;
  public GameContainer gc;
  public int state = STATE_FADE_IN;
  public float jeepHereX = Main.DISPLAY_WIDTH;
  public int delay = HERE_DELAY;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    
    main.startFade(false, this);
    main.requestSong(main.cutsceneSong);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_SLIDE;
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;
      main.requestMode(Modes.MAP, gc);
    }
  }  

  @Override
  public void update(GameContainer gc) throws SlickException {
    switch(state) {
      case STATE_SLIDE:
        jeepHereX -= SLIDE_SPEED;
        if (jeepHereX <= 224) {
          jeepHereX = 224;
          state = STATE_HERE;
        }
        break;
      case STATE_HERE:
        if (--delay == 0) {
          state = STATE_FADE_OUT;
          main.startFade(true, this);
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
    
    g.setColor(COLOR_CYAN);
    g.fillRect(0, 288, Main.DISPLAY_WIDTH, 416);
    g.setColor(Color.white);
    g.fillRect(0, 264, Main.DISPLAY_WIDTH, 16);
    g.setColor(Color.white);
    g.fillRect(0, 712, Main.DISPLAY_WIDTH, 16);
        
    main.jeepHere.draw(jeepHereX, 320);
    
    if (state >= STATE_HERE) {
      main.draw(main.heres[0], 160, 320);
      main.draw(main.heres[1], 287, 416);
    }
  }
}
