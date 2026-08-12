package jackal;

public class GreenBoat extends Enemy {
  
  public static final int SPRITE_TOGGLE_FRAMES = 12;
  public static final int BULLET_DELAY = 91;
  public static final int BULLET_TRAVEL_TIME = 2 * 91;
  public static final float SPEED = 0.75f;
  public static final int MOVEMENT_TIME = 181;
  
  public Player player;
  public int spriteIndex;
  public int spriteIndexCounter;
  public int bulletDelay;
  public int movementDelay = MOVEMENT_TIME;
  
  public GreenBoat(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;    
    
    layer = 3;
    
    bulletHits = 6;
    
    hitX1 = -40;
    hitY1 = -40;
    hitX2 = 40;
    hitY2 = 40;    
    
    points = 800;
  }

  @Override
  public void update() {
    if (movementDelay > 0) {
      movementDelay--;
      x -= SPEED;
      y += SPEED;
    }
    if (--spriteIndexCounter < 0) {
      spriteIndexCounter = SPRITE_TOGGLE_FRAMES;
      spriteIndex ^= 1;
    }
    if (--bulletDelay < 0) {
      bulletDelay = BULLET_DELAY;
      float X = x - 16;
      float Y = y + 16;
      float dx = player.x - X;
      float dy = player.y - Y;
      float imag = 1f / (float)Math.sqrt(dx * dx + dy * dy);
      
      new EnemyBullet(X, Y, dx * imag, dy * imag, BULLET_TRAVEL_TIME, true);
    }
  }

  @Override
  public void render() {
    main.draw(main.greenBoats[spriteIndex], x - 58, y - 64);
  }
}
