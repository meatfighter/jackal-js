package jackal;

public abstract class Enemy extends HitElement {

  public boolean solid; // other enemies will avoid bumping into this one
  public boolean mine;  // player will explode if it hits this enemy
  
  public float solidX1;
  public float solidY1;
  public float solidX2;
  public float solidY2;
  
  public float mineX1;
  public float mineY1;
  public float mineX2;
  public float mineY2;
  
  public int bulletHits;  
  public int points;
  
  public float explosionX;
  public float explosionY;
  
  public boolean playSoundOnRemove = true;
  
  public boolean isSolid(float px, float py) {
    px -= x;
    py -= y;
    
    return py >= solidY1 && py <= solidY2 && px >= solidX1 && px <= solidX2;
  }
  
  public boolean isSolid(float x1, float y1, float x2, float y2) {
    
    return overlap(x1, y1, x2, y2,   
        x + solidX1,
        y + solidY1,
        x + solidX2,
        y + solidY2);
  }
  
  public boolean isMine(float px, float py) {
    px -= x;
    py -= y;
    
    return py >= mineY1 && py <= mineY2 && px >= mineX1 && px <= mineX2;
  }
  
  public boolean isMine(float x1, float y1, float x2, float y2) {
    
    return overlap(x1, y1, x2, y2,   
        x + mineX1,
        y + mineY1,
        x + mineX2,
        y + mineY2);
  } 
  
  public void flatten() {
    explode();
  }
  
  public void explode() {
    if (!remove) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
    }
  }
  
  // returns true if player bumped into the enemy
  public boolean bump(float x1, float y1, float x2, float y2, 
      boolean invincible) {  
    if (invincible) {
      return false;
    }
    if (isMine(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }
  
  @Override
  public void remove() {
    remove = true;
    if (playSoundOnRemove) {
      main.playHitExplodeSound(); 
    }
  }
  
  // returns true if attack successful
  public boolean attack(float x1, float y1, float x2, float y2, 
      int attackSource) {
    if (attackSource < AttackSource.PLAYER_EXPLOSION 
        && hit(x1, y1, x2, y2)) {
      remove();
      new Explosion(x + explosionX, y + explosionY);
      main.addPoints(points);
      return true;
    } else {
      return false;
    }
  }
  
  // returns true if player bullet was absorbed by enemy
  public boolean bulletAttack(float x1, float y1, float x2, float y2) {
    if (hit(x1, y1, x2, y2)) {        
      if (--bulletHits <= 0) {
        remove();
        new Explosion(x + explosionX, y + explosionY);
        main.addPoints(points);
      } else {
        main.playSoundAlways(main.bulletHitSound);
      }     
      return true;
    } else {
      return false;
    }
  }  
  
  @Override
  public void checkBounds(float maxY) {
    if (solid) {
      if (y + solidY1 > maxY) {
        playSoundOnRemove = false;
        remove();
      }      
    } else {
      if (y + hitY1 > maxY) {
        playSoundOnRemove = false;
        remove();
      }
    }
  }  
}
