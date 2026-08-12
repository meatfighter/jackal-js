package jackal;

import java.util.*;
import org.newdawn.slick.*;

public class JeepYeahMode implements IMode, IFadeListener {
  
  public static final int STATE_FADE_IN = 0;
  public static final int STATE_PAUSED = 1;
  public static final int STATE_FADE_OUT = 2;
  public static final int STATE_DONE = 3;
  
  public static final int YEAH_DELAY = 136;
  public static final int BULLET_DELAY = 11;
  
  public static final float SMOKE_VX = 0.25f;
  public static final float SMOKE_VY = 0.5f;

  public Main main;
  public GameContainer gc; 
  public float smokeX;
  public float smokeY;
  public JeepYeahExplosion explosion;
  public JeepYeahPlane leftPlane;
  public JeepYeahPlane rightPlane;
  public JeepYeahFireRight fireRight;
  public JeepYeahFireLeft fireLeft;
  public ArrayList<JeepYeahBullet> bullets = new ArrayList<JeepYeahBullet>();
  public int bulletDelay = BULLET_DELAY;
  public int yeahVisible = YEAH_DELAY;
  public boolean yeah;
  public int state = STATE_FADE_IN;
  
  public JeepYeahMode(boolean yeah) {
    this.yeah = yeah;
  }
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    
    leftPlane = new JeepYeahPlane(true);
    rightPlane = new JeepYeahPlane(false);
    fireLeft = new JeepYeahFireLeft();
    fireRight = new JeepYeahFireRight();
    
    main.startFade(false, this);
    main.requestSong(main.cutsceneSong);
  }
  
  @Override
  public void fadeCompleted() {
    if (state == STATE_FADE_IN) {
      state = STATE_PAUSED;
    } else if (state == STATE_FADE_OUT) {
      state = STATE_DONE;      
      main.requestMode(Modes.MAP, gc);
    }
  }  

  @Override
  public void update(GameContainer gc) throws SlickException {
    
    if (yeahVisible > 0) {
      yeahVisible--;
    }
    
    smokeX += SMOKE_VX;
    if (smokeX >= 64) {
      smokeX -= 64;
    }
    
    smokeY += SMOKE_VY;
    if (smokeY >= 32) {
      smokeY -= 32;
    }
    
    if (explosion == null || explosion.remove) {
      explosion = new JeepYeahExplosion(136, 608);
    }
    explosion.update();
    
    if (state == STATE_PAUSED) {
      leftPlane.update();
      rightPlane.update();    

      if (rightPlane.z > 0) {
        state = STATE_FADE_OUT;
        main.startFade(true, this);
      }
    }
    
    fireLeft.update();
    fireRight.update();
    
    if (--bulletDelay == 0) {
      bulletDelay = BULLET_DELAY;
      bullets.add(new JeepYeahBullet());
    }
    for(int i = bullets.size() - 1; i >= 0; i--) {
      JeepYeahBullet bullet = bullets.get(i);
      bullet.update();
      if (bullet.remove) {
        bullets.remove(i);
      }
    }
  }

  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    g.setColor(Color.black);
    g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
    
    if (state == STATE_DONE) {
      return;
    }
    
    for(int y = 0; y < 6; y++) {
      for(int x = 0; x < 3; x++) {
        main.draw(main.smoke, 864 + (x << 6) - smokeX, 288 + (y << 5) - smokeY);
      }
    }
    explosion.render(main);
    
    main.jeepYeah.draw(0, 256);
    
    leftPlane.render(main, g);
    rightPlane.render(main, g);
    fireLeft.render(main);
    fireRight.render(main);
    
    for(int i = bullets.size() - 1; i >= 0; i--) {
      bullets.get(i).render(main);
    }
    
    if (yeahVisible == 0) {
      main.draw(main.yeahs[0], 452, 128);
      main.draw(main.yeahs[1], 534, 226);
      if (yeah) {
        main.draw(main.yeahs[2], 500, 164);
      } else {
        main.draw(main.yeahs[3], 485, 164);
      }
    }
  }
}
