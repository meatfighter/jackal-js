package jackal;

import org.newdawn.slick.*;

public class DifficultyMode implements IMode, IFadeListener, IMenuListener {

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
    
    menu = new Menu(448, 512, main, main.hardMode ? 1 : 0, 
        Menu.ICON_MISSILE, this, "normal", "hard");
    
    main.startFade(false, this);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_MENU;
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;
      main.hardMode = (selectedIndex == 1);
      try {
        java.util.prefs.Preferences prefs =
            java.util.prefs.Preferences.userNodeForPackage(Main.class);
        prefs.putBoolean("jackal-difficulty", main.hardMode);
        prefs.flush();
      } catch(Throwable t) {
      }
      main.requestMode(Modes.INTRO, gc);
    }
  }  

  @Override
  public void selectionChanged(int selectedIndex) {
  }

  @Override
  public void optionSelected(int selectedIndex) {
    this.optionSelected = true;
    this.selectedIndex = selectedIndex;
    main.playSound(main.explodeSound2);
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
    
    main.drawString("difficulty", 352, 384, Main.FONT_GRAY);
    menu.render();
  }
}
