package jackal;

public class ElephantMissile extends GameElement {
  
  public static final float SPEED = 6f;
  public static final float DIAGONAL_SPEED = (float)(SPEED / Math.sqrt(2));
  
  public float angle;
  public float vx;
  public float vy;
  public float maxY;
  public float explosionOffset;
  public float tipX;
  public float tipY;
  public Player player;
  
  public ElephantMissile(float x, float y, int angle, boolean left) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    
    switch(angle) {
      case 45:
        vx = DIAGONAL_SPEED;
        vy = DIAGONAL_SPEED;
        explosionOffset = 32;
        tipX = 10;
        tipY = 10;
        break;
      case 90:
        vx = 0;
        vy = SPEED;
        if (!left) {
          explosionOffset = 32;
        }
        tipX = 0;
        tipY = 16;
        break;
      case 135:
        vx = -DIAGONAL_SPEED;
        vy = DIAGONAL_SPEED; 
        tipX = -10;
        tipY = 10;
        break;
    }
    
    if (angle == 90) {
      maxY = 908;
    } else {
      maxY = main.random.nextBoolean() ? 598 : 822;
    }
    
    main.playSound(main.laserSound);
  }

  @Override
  public void init() {
    layer = 4;
    
    this.player = gameMode.player;
  }

  @Override
  public void update() {
    x += vx;
    y += vy;
    if (y >= maxY) {
      remove();
      int X = ((int)x) >> 5;
      int Y = ((int)y) >> 5;             
      int groupIndex = gameMode.groupsMap[Y][X]; 
      gameMode.triggerGroup(groupIndex);
      new Explosion((X << 5) + explosionOffset, (Y << 5) + 32)
          .setDamagesEnemies(false);
    } else if (player.attack(x + tipX, y + tipY)) {
      remove();
      new Explosion(x + tipX, y + tipY);
    }
  }

  @Override
  public void render() {
    main.drawRotated(main.elephantGuns[8], x, y, angle);
  }  
}
