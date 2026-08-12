package jackal;

import org.newdawn.slick.*;

public class JeepYeahPlane {
  
  public static final float CENTER_X = Main.DISPLAY_WIDTH / 2;
  public static final float CENTER_Y = Main.DISPLAY_HEIGHT / 2;
  
  public static final float Z1 = 2;
  public static final float K1 = 2;
  public static final float Z0 = (K1 * Z1) / (K1 - 1);
  
  public float x;
  public float y;
  public float z;
  public boolean left;
  public float angle;
  
  public JeepYeahPlane(boolean left) {
    
    this.left = left;
    
    if (left) {
      z = -8;
      x = -650;
      y = -300;
    } else {
      z = -15;
      x = -950;
      y = -400;
      angle = -30;
    }
  }
  
  public void update() {
    z += 0.02f;
    if (left) {
      angle -= 0.1f;
    } else {
      angle += 0.1f;
    }
  }
  
  public void render(Main main, Graphics g) {
    
    float k = Z0 / (Z0 - z);
    
    g.setWorldClip(0, 288, Main.DISPLAY_WIDTH, 416);
    if (left) {
      if (z < -7) {
        main.drawRotated(main.blackPlane, CENTER_X + k * x, CENTER_Y + k * y, 
            -64, -20, angle, k, 8 + z);
      } else {
        main.drawRotated(main.blackPlane, CENTER_X + k * x, CENTER_Y + k * y, 
            -64, -20, angle, k);
      }
    } else {
      if (z < -14) {
        main.drawRotated(main.blackPlane, CENTER_X + k * x, CENTER_Y + k * y, 
            -64, -20, angle, k, 15 + z);
      } else {
        main.drawRotated(main.blackPlane, CENTER_X + k * x, CENTER_Y + k * y, 
            -64, -20, angle, k);
      }
    }
    g.clearWorldClip();
  }
}
