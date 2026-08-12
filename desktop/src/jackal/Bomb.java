package jackal;

public class Bomb extends Enemy {
  
  public static final float CLOSE_MARGIN = 128;
  public static final float DISTANCE = 160;
  public static final float MIN_SCALE = 32f / 44f; 
  public static final int TRAVEL_TIME = 114;
  public static final int HALF_TIME = TRAVEL_TIME / 2;
  public static final float GRAVITY = -2f * (1f - MIN_SCALE) 
      / (HALF_TIME * HALF_TIME);
  public static final float HALF_GRAVITY2 = (MIN_SCALE - 1f) 
      / (TRAVEL_TIME * TRAVEL_TIME);
  public static final float VELOCITY = DISTANCE / TRAVEL_TIME;  
  public static final float HALF_GRAVITY = GRAVITY / 2;
  public static final float V0 = -GRAVITY * HALF_TIME;
  public static final float ANGULAR_VELOCITY = 5;
  public static final float ERROR = 64;
  
  public float vx;
  public float vy;
  public float scale;
  public float angle;
  public int t;  
  public boolean airplane;
  
  public Bomb(float x, float y, boolean airplane) {
    this(x, y, airplane, 0f, 0f);
  }

  public Bomb(float x, float y, boolean airplane, float vx, float vy) {

    this.x = x;
    this.y = y;
    this.airplane = airplane;
    
    this.vx = (gameMode.player.x + main.random.nextFloat() * ERROR - ERROR) - x;
    this.vy = (gameMode.player.y + main.random.nextFloat() * ERROR - ERROR) - y;
    float imag = (airplane ? VELOCITY : 0.75f * VELOCITY)
        / (float)Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.vx *= imag;
    this.vy *= imag;
    
    this.vx += vx;
    this.vy += vy;
    
    angle = main.random.nextInt(4) * 90; 
    
    if (airplane || isCloseToFrame()) {
      main.playSound(main.throwSound);
    }    
  }
  
  private boolean isCloseToFrame() {
    float X = x - gameMode.cameraX;
    float Y = y - gameMode.cameraY;
    return X >= -CLOSE_MARGIN && X <= Main.DISPLAY_WIDTH + CLOSE_MARGIN
        && Y >= -CLOSE_MARGIN && Y <= Main.DISPLAY_HEIGHT + CLOSE_MARGIN;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 5;
    
    hitX1 = -19;
    hitY1 = -19;
    hitX2 = 19;
    hitY2 = 19;
    
    mine = true;
    mineX1 = -19;
    mineY1 = -19;
    mineX2 = 19;
    mineY2 = 19;
  }
  
  @Override
  public void remove() {
    remove = true;
    if (!gameMode.isOutsideOfFrame(x, y) && playSoundOnRemove) {
      main.playExplodeSound2();
    }
  }  
  
  @Override
  public void update() {
    x += vx;
    y += vy;
    if (airplane) {
      scale = 1f + HALF_GRAVITY2 * t * t;
    } else {
      scale = MIN_SCALE + t * (V0 + HALF_GRAVITY * t);
    }
    angle += ANGULAR_VELOCITY;
    
    if (++t > TRAVEL_TIME) {
      remove();
      new Explosion(x, y).setDamagesEnemies(false);
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    return false;
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  } 
  
  // returns true if player bumped into the enemy
  @Override
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {
    if (t < TRAVEL_TIME - 2 || invincible) {
      return false;
    }
    if (isMine(x1, y1, x2, y2)) {
      remove();
      new Explosion(x, y);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {
    main.draw(main.bomb, x, y, angle, scale);
  }
  
}
