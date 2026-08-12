package jackal;

public class TroopsTruck extends Enemy {
  
  public static final int STATE_PAUSED = 0;
  public static final int STATE_MOVING = 1;
  public static final int STATE_RELEASING_TROOPS = 2;
  
  public static final float SPEED = 1.25f;
  public static final int TRAVEL_TIME = 291;
  public static final float PLAYER_DISTANCE = 256;
  public static final int TROOPS = 12;
  public static final int TROOPS_DELAY = 2 * 91;
  
  public int state = STATE_PAUSED;
  public Player player;
  public int traveling = TRAVEL_TIME;
  public int troops = TROOPS;
  public int troopsDelay;
  
  public TroopsTruck(float x, float y) {
    this.x = x;
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();   
    
    player = gameMode.player;
    
    layer = 4;
    
    bulletHits = 4;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 120;
    hitY2 = 76;
    
    mine = true;
    mineX1 = 8;
    mineY1 = 8;
    mineX2 = 120;
    mineY2 = 76;
    
    solid = true;
    solidX1 = 0;
    solidY1 = 0;
    solidX2 = 128;
    solidY2 = 84;
    
    points = 1000;
    
    explosionX = 64;
    explosionY = 42;
  }
  
  @Override
  public void update() {
    switch(state) {
      case STATE_PAUSED:
        if (player.y - y <= PLAYER_DISTANCE) {
          state = STATE_MOVING;
        } 
        break;
      case STATE_MOVING:
        x += SPEED;
        if (--traveling == 0) {
          state = STATE_RELEASING_TROOPS;
        }
        break;
      case STATE_RELEASING_TROOPS:
        if (--troopsDelay < 0) {
          troopsDelay = TROOPS_DELAY;
          if (troops > 0) {
            troops--;
            new EnemySoldier(x + 16, y + 66, EnemySoldierType.TROOPS_TRUCK);
          }
        }
        break;
    }
  }
  
  @Override
  public void render() {
    main.draw(main.troopsTruck, x, y);
  }
}
