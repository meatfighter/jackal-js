package jackal;

public class Airplane extends Enemy {
  
  public static final float SPEED = 5f;
  public static final int BOMB_DELAY = 68;
  public static final float APPEAR_DISTANCE = 192;
  
  public int bombDelay;
  public boolean up;
  public int orientationIndex;
  
  public Airplane(boolean leftLandingPort) {
    
    this.x = gameMode.player.x 
        + (leftLandingPort ? -APPEAR_DISTANCE : APPEAR_DISTANCE);
    
    this.y = gameMode.cameraY - 124;
  }  
  
  public Airplane(float x, float y, boolean up) {
    this(x, y);
    this.up = up;
    orientationIndex = 1;
  }

  public Airplane(float x, float y) {
    
    this.x = gameMode.player.x 
        + (main.random.nextBoolean() ? -APPEAR_DISTANCE : APPEAR_DISTANCE);
    if (this.x - 96 < gameMode.cameraX) {
      this.x = gameMode.player.x + APPEAR_DISTANCE;
    } else if (this.x + 96 > gameMode.cameraX + Main.DISPLAY_WIDTH) {
      this.x = gameMode.player.x - APPEAR_DISTANCE;
    }
    
    this.y = y;
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 7;

    hitX1 = -40;
    hitY1 = -40;
    hitX2 = 40;
    hitY2 = 40;
    
    points = 1000;
  }
  
  @Override
  public void remove() {
    remove = true;
    if (playSoundOnRemove) {
      main.playHitExplodeSound(); 
    }
    main.stopSound(main.planeSound);
  }  
  
  @Override
  public void update() {

    main.playSoundIfNotPlaying(main.planeSound);
    
    if (up) {
      y -= SPEED;
      if (y < gameMode.cameraY - 384) {
        playSoundOnRemove = false;
        remove();
      }
    } else {
      y += SPEED;
    }
    
    if (--bombDelay < 0) {
      bombDelay = BOMB_DELAY;
      new Bomb(x, y, true);      
    }
  }
  
  // returns true if player bumped into the enemy
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    return false;
  }  
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    return false;
  }  

  @Override
  public void render() {
    main.draw(main.airplanes[orientationIndex][1], x + 24, y + 24);
    main.draw(main.airplanes[orientationIndex][0], x - 60, y - 62);
  }  
}
