package jackal;

public class GrayBoat extends Enemy {
  
  public static final int SPRITE_TOGGLE_FRAMES = 12;
  public static final int UPDATE_GUN_FRAMES = 4;
  public static final int BULLET_DELAY = 91;
  public static final int BULLET_TRAVEL_TIME = 2 * 91;
  public static final float SPEED = 1.75f;
  public static final int MOVEMENT_TIME = 227;
  public static final float TO_DEGREES = 180f / (float)Math.PI;
  
  public Player player;
  public int spriteIndex;
  public int spriteIndexCounter;
  public int bulletDelay;
  public int movementDelay = MOVEMENT_TIME; 
  public float gunAngle;
  public int updateGun;
  
  public GrayBoat(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 8;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 56;
    hitY2 = 184;    
    
    points = 800;
  }

  @Override
  public void update() {
    if (movementDelay > 0) {
      movementDelay--;
      y += SPEED;
    }
    if (--spriteIndexCounter < 0) {
      spriteIndexCounter = SPRITE_TOGGLE_FRAMES;
      spriteIndex ^= 1;      
    }
    if (--updateGun < 0) {
      updateGun = UPDATE_GUN_FRAMES;
      gunAngle = TO_DEGREES * (float)Math.atan2(
          player.y - (y + 131), player.x - (x + 32));
    }
    if (--bulletDelay < 0) {
      bulletDelay = BULLET_DELAY;
      float X = x + 32;
      float Y = y + 131;
      float dx = player.x - X;
      float dy = player.y - Y;
      float imag = 1f / (float)Math.sqrt(dx * dx + dy * dy);
      dx *= imag;
      dy *= imag;
      
      new EnemyBullet(X + 34 * dx, Y + 34 * dy, 
          dx, dy, BULLET_TRAVEL_TIME, true);
    }
  }
  
  // returns true if attack successful
  @Override
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + 32, y + 96);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {       
      if (--bulletHits <= 0) {
        remove();
        new Explosion(x + 32, y + 96);
        main.addPoints(points);
      }      
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {
    main.draw(main.grayBoats[spriteIndex], x, y);
    main.drawRotated(main.grayBoats[2], x + 32, y + 131, -14, -13, gunAngle);
  }  
}
