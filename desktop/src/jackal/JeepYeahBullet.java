package jackal;

import org.newdawn.slick.*;

public class JeepYeahBullet {
  
  public static final float VX0 = -2f;
  public static final float VY0 = -5f;
  public static final float G = 0.25f;
  public static final float ANGLE_SPEED = -5f;
  public static final float SCALE_SPEED = 0.015f;
  
  public float x = 308;
  public float y = 408;
  public float vx = VX0;
  public float vy = VY0;
  public float angle = -50;
  public boolean remove;
  public float scale = 1;

  public void update() {
    angle += ANGLE_SPEED;
    vy += G;
    x += vx;
    y += vy;
    
    scale -= SCALE_SPEED;
    if (scale <= 0) {
      remove = true;
    }
  }
  
  public void render(Main main) {
    main.drawRotated(main.jeepYeahBullet, x, y, -10, -2, angle, scale);
  }
}
