package jackal;

import org.newdawn.slick.*;

public class ContinueMode implements IMode, IFadeListener, IMenuListener {

  public static final int STATE_FADE_IN = 0;
  public static final int STATE_MENU = 1;
  public static final int STATE_FADE_OUT = 2;
  public static final int STATE_DONE = 3;
  
  public Main main;
  public GameContainer gc;
  public IInput input;  
  public int state = STATE_FADE_IN;
  public Menu menu;
  public boolean optionSelected;
  public int selectedIndex;
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    menu = new Menu(480, 512, main, 0, Menu.ICON_GRENADE, this, "yes", "no");
    
    main.stopAllSound();
    main.requestSong(main.continueSong);
    main.startFade(false, this);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_MENU;
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;      
      if (selectedIndex == 0) {
        main.continuePlayer();
        main.requestMode(Modes.GAME, gc);
      } else {
        main.requestMode(Modes.INTRO, gc);
      }
    }
  }  

  @Override
  public void selectionChanged(int selectedIndex) {
  }

  @Override
  public void optionSelected(int selectedIndex) {
    this.optionSelected = true;
    this.selectedIndex = selectedIndex;  
    main.stopSong();
  }  
  
  @Override
  public void update(GameContainer gc) throws SlickException {
    menu.update();
    
    if (state == STATE_MENU && optionSelected) {
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
    
    main.drawString("continue", 384, 384, Main.FONT_GRAY);
    menu.render();
  }
}
