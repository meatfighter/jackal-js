package jackal;

import org.newdawn.slick.*;

public class IntroMapMode implements IMode, IFadeListener {

  public static final int STATE_FADE_IN = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_FADE_OUT = 2;
  public static final int STATE_DONE = 3;  
  
  public static final int PAUSE_DELAY = 250;
  
  public Main main;
  public GameContainer gc;
  public int delay = PAUSE_DELAY;
  public int state = STATE_FADE_IN;  
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc; 
    
    main.requestSong(main.introSong);
    main.startFade(false, this);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_PAUSED;
    } else {
      state = STATE_DONE;
      main.startPlayer();
      main.requestMode(Modes.GAME, gc);
    }
  }  

  @Override
  public void update(GameContainer gc) throws SlickException {
    
    if (state == STATE_PAUSED && --delay == 0) {
      state = STATE_FADE_OUT;
      main.startFade(true, this);
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
    
    main.drawString("This battle will", 416, 224, Main.FONT_GRAY);
    main.drawString("make your blood", 416, 288, Main.FONT_GRAY);
    main.drawString("boil.", 416, 352, Main.FONT_GRAY);
    main.drawString("Good luck!", 480, 416, Main.FONT_GRAY);
  }  
}
