package jackal;

import org.newdawn.slick.*;

public class JeepYeahFireRight {
  
  public static final int STATE_GROWING = 0;
  public static final int STATE_MOVING = 1;
  public static final int STATE_SHRINKING = 2;
  public static final int STATE_PAUSED = 3;
  
  public static final float SPEED = 20f;
  
  public static final float ANGLE = -30;
  public static final double RADIANS = Math.toRadians(ANGLE);
  public static final float rx = (float)Math.cos(RADIANS);
  public static final float ry = (float)Math.sin(RADIANS);
  public static final float vx = SPEED * rx;
  public static final float vy = SPEED * ry;
  
  public static final int MOVE_TIME = 1;
  public static final int SHRINK_STEPS = (int)(75 / SPEED);
  public static final int PAUSE_TIME = 3;
  
  public static final float I_SHRINK_STEPS = 1f / SHRINK_STEPS;
  
  public float scale;
  public int state;
  public float x;
  public float y;
  public int delay;
  
  public void update() {
    switch(state) {
      case STATE_GROWING:
        x += SPEED;
        scale = x / 75;
        if (scale >= 1) {
          state = STATE_MOVING;
          delay = MOVE_TIME;
          x = 768;
          y = 437;
        }
        break;
      case STATE_MOVING:
        x += vx;
        y += vy;
        if (--delay == 0) {
          state = STATE_SHRINKING;
          delay = SHRINK_STEPS;
        }
        break;
      case STATE_SHRINKING:
        x += vx;
        y += vy;
        scale = I_SHRINK_STEPS * delay;
        if (--delay == 0) {
          state = STATE_PAUSED;
          delay = PAUSE_TIME;
        }
        break;
      case STATE_PAUSED:
        if (--delay == 0) {
          state = STATE_GROWING;
          x = 0;
          scale = 0;
        }
        break;
    }
  }
  
  public void render(Main main) {
    switch(state) {
      case STATE_GROWING:
        main.drawRotatedScaled(main.gunFires[0], 768, 437, 0, -18, ANGLE, 
            scale, 1);
        break;
      case STATE_MOVING:
        main.drawRotated(main.gunFires[0], x, y, 0, -18, ANGLE);
        break;
      case STATE_SHRINKING:
        main.drawRotatedScaled(main.gunFires[0], x, y, 0, -18, ANGLE, 
            scale, 1);
        break;
    }    
  }
}
