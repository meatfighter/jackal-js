package jackal;

public class BossHeadquarters extends Enemy {

  public static final int STATE_FLASHING = 0;
  public static final int STATE_EXPLOSIONS = 1;
  public static final int STATE_DEBRIS = 2;
  
  public static final int FLASH_DELAY = 68;
  public static final int FLASH_DURATION = 12;  
  
  public static final int HITS = 12;
  
  public static final int EXPLODE_DELAY = 16;
  public static final int EXPLODE_TIME = 5 * 91;
  
  public boolean flashing;
  public int flashDelay = FLASH_DELAY;
  public int flashIndex = -1;  
  public int state = STATE_FLASHING;
  public int hits;
  public int explodeDelay;
  public int explodeTime = EXPLODE_TIME;
  public BossHeadquartersManager bossHeadquartersManager;
  public Player player;
  
  public BossHeadquarters(BossHeadquartersManager bossHeadquartersManager) {
    this.x = 896;
    this.y = 96;
    this.bossHeadquartersManager = bossHeadquartersManager;
  }
  
  @Override
  public void init() {
    super.init();
    
    player = gameMode.player;
    
    layer = 0;
    
    hitX1 = 8;
    hitY1 = 8;
    hitX2 = 248;
    hitY2 = 152;
    
    points = 5000;
  }
  
  private void startExploding() {
    state = STATE_EXPLOSIONS;
    main.stopSong();    
    explodeDelay = 1;
    bossHeadquartersManager.remove();
    gameMode.destroyAll(this);
    main.playSoundAlways(main.headquartersExplodesSound);
  }
  
  private void startDebris() {
    state = STATE_DEBRIS; 
    main.requestSong(main.superTankSong);
    new BossSuperTank(gameMode.player.x - 210, 32);
    int[][] group = gameMode.groups[0];
    for(int i = group.length - 1; i >= 0; i--) {
      int[] g = group[i];      
      new TileDebris(g[0], g[1], g[2], g[3]);
    }
  }
  
  @Override
  public void update() {
    if (state == STATE_EXPLOSIONS) {
      if (--explodeDelay == 0) {
        explodeDelay = EXPLODE_DELAY;
        for(int i = 0; i < 2; i++) {
          new Explosion(gameMode.cameraX + main.random.nextInt(1280) - 128, 
              224 + main.random.nextInt(224)).setDamagesEnemies(false);
        }
        new Explosion(896 + main.random.nextInt(256), 
            96 + main.random.nextInt(416)).setDamagesEnemies(false);
      }
      if (--explodeTime == 0) {
        startDebris();
        remove();
      }
    } else {
      if (main.hasMissiles) {
        hitY2 = 152;
      } else {
        hitY2 = 192;
      }
    }
  }
  
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (state == STATE_FLASHING
        && attackSource == AttackSource.PLAYER_WEAPON
        && hit(x1, y1, x2, y2)) {
      if (++hits == HITS) {
        startExploding();
      } else {
        main.playHitExplodeSound();
        for(int i = 0; i < 7; i++) {
          float Y = y + 160 - (i << 5);
          for(int j = 0; j < 4; j++) {
            if ((j == 0 || j == 3) && (i == 0 || i == 6)) {
              continue;
            }
            new Explosion(
                x + (j << 6) + 12 + main.random.nextInt(32), 
                Y + main.random.nextInt(8), true, (i + 1) * 4, 0.5f);
          }
        }  
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  }  

  @Override
  public void render() {
    switch(state) {
      case STATE_FLASHING:        
        if (--flashDelay == 0) {
          if (flashing) {
            flashing = false;
            flashDelay = FLASH_DELAY;
          } else {
            flashing = true;
            flashDelay = FLASH_DURATION;
          }
        }
        if (flashing) {
          if (++flashIndex == 2) {
            flashIndex = -1;
          } else {
            main.draw(main.headquartersLights[flashIndex], 932, 188);
            main.draw(main.headquartersLights[flashIndex], 996, 220);
            main.draw(main.headquartersLights[flashIndex], 1028, 220);
            main.draw(main.headquartersLights[flashIndex], 1092, 188);
          }
        }
        break;
    }
  }  
}
