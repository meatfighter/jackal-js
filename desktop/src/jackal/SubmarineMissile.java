package jackal;

import org.newdawn.slick.*;

public class SubmarineMissile extends Enemy {
  
  public static final float SPEED = 8f;
  
  public static final float TO_DEGREES = (float)(180.0 / Math.PI);

  public float vy;
  public float vx;
  public float tx;
  public float ty;
  public int angle;
  public int explodeDelay;

  public SubmarineMissile(float x, float y) {
    
    y -= 20;
    
    Player player = gameMode.player;
    float ang = 180 
        + TO_DEGREES * (float)Math.atan2(y - player.y, x - player.x);
    angle = 45 * Math.round(ang / 45f);
    float[] v = main.createUnitVector(angle);
    vx = SPEED * v[0];
    vy = SPEED * v[1];
    tx = 18 * v[0];
    ty = 18 * v[1];
    
    this.x = x + v[0] * 24;
    this.y = y + v[1] * 24;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 4;
    
    bulletHits = 1;
    
    hitX1 = -22;
    hitY1 = -22;
    hitX2 = 22;
    hitY2 = 22;
    
    mine = true;
    mineX1 = -8;
    mineY1 = -8;
    mineX2 = 8;
    mineY2 = 8;  
  }
  
  @Override
  public void update() {
    x += vx;
    y += vy;
    
    if (gameMode.isOutsideOfFrame(x - 32, y - 32, x + 32, y + 32)) {
      playSoundOnRemove = false;
      remove();      
    }
  }

  @Override
  public void render() {
    main.drawRotated(main.statueMissiles[0], x, y, angle);
  }  
}

