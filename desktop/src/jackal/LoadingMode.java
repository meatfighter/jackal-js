package jackal;

import org.newdawn.slick.*;

public class LoadingMode implements IMode {

  public Main main;
  public GameContainer gc;
  public int percentWidth; // 0 to 516
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    main.hardMode = java.util.prefs.Preferences
        .userNodeForPackage(Main.class)
        .getBoolean("jackal-difficulty", false);
  }

  @Override
  public void update(GameContainer gc) throws SlickException {
    try {
      percentWidth = (int)(516 * main.loadNext());
    } catch(Throwable t) {
      throw new SlickException("Loading error", t);
    }
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    main.draw(main.controllers[0], 256, 307);
    g.setWorldClip(254, 305, percentWidth, 222);
    main.draw(main.controllers[1], 256, 307);
    g.clearWorldClip();
    main.drawString("loading", 400, 557, Main.FONT_GRAY);
  }  
}
