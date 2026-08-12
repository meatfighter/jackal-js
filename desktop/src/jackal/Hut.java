package jackal;

public class Hut extends Enemy {
  
  public int groupIndex;
  public boolean shack;
  public boolean tank;
  
  public Hut(float x, float y, boolean shack, boolean tank) {
    this.x = x;
    this.y = y;
    this.shack = shack;
    this.tank = tank;
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5;
              
    if (shack) {
      groupIndex = gameMode.groupsMap[Y + 3][X + 2]; 
    } else {
      groupIndex = gameMode.groupsMap[Y + 1][X + 1]; 
    }
    
    for(int i = shack ? 5 : 4; i >= 0; i--) {
      for(int j = 0; j < 6; j++) {
        gameMode.typesMap[Y + i][X + j] = GameMode.TYPE_SOLID;
      }
    }
  }
  
  @Override
  public void init() {
    super.init();
    
    layer = 0;
    
    hitX1 = 0;
    hitY1 = 0;
    hitX2 = 192;
    hitY2 = shack ? 192 : 160;   
  }
  
  @Override
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource <= AttackSource.TRAVELING_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      playSoundOnRemove = false;
      main.playSound(main.hutSound);
      remove();
      new Explosion(x + (shack ? 96 : 80), y + 96);
      gameMode.triggerGroup(groupIndex);
      if (tank) {
        new GrayTank(x + 86, y + 96, true);
        main.addPoints(500);
      } else {
        new FriendlySoldier(
            x + 96, y + 48 + (shack ? 64 : 0), 
                FriendlySoldierType.WEAPON_CARRIER, 0, shack);
        main.addPoints(300);
      }
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  @Override
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {             
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void explode() {
  }  
  
  @Override
  public void update() {
  }

  @Override
  public void render() {
  }  
}
