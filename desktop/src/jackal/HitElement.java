package jackal;

public abstract class HitElement extends GameElement {
  
  public boolean hit;
  
  public float hitX1;
  public float hitY1;
  public float hitX2;
  public float hitY2;
  
  public int[] trail = new int[8];
  public int trailIndex = 7;
  
  public HitElement() {
    for(int i = 0; i < 8; i++) {
      trail[i] = -i;
    }
  }
  
  @Override
  public void init() {    
    enemy = true;
  }
  
  public boolean overlap(float ax1, float ay1, float ax2, float ay2,
      float bx1, float by1, float bx2, float by2) {
    
    return ax1 <= bx2 && ax2 >= bx1 && ay1 <= by2 && ay2 >= by1;
  }
  
  public boolean hitPoint(HitElement h) {
    return hit(h.x, h.y);
  }
  
  public boolean hit(HitElement h) {
    return overlap(  
        h.x + h.hitX1,
        h.y + h.hitY1,
        h.x + h.hitX2,
        h.y + h.hitY2,    
        x + hitX1,
        y + hitY1,
        x + hitX2,
        y + hitY2);
  }
  
  public boolean hit(float px, float py) {

    px -= x;
    py -= y;
    
    return py >= hitY1 && py <= hitY2 && px >= hitX1 && px <= hitX2;
  }
  
  public boolean hit(float x1, float y1, float x2, float y2) {
    
    return overlap(x1, y1, x2, y2,   
        x + hitX1,
        y + hitY1,
        x + hitX2,
        y + hitY2);
  }
  
  public boolean isHit() {
    return hit;
  }
  
  public void setHit(boolean hit) {
    this.hit = hit;
  }  
  
  public void updateTrail() {    
    int cell = ((((int)y) >> 7) << 4) | (((int)x) >> 7);
    if (cell != trail[trailIndex]) {
      if (--trailIndex < 0) {
        trailIndex = 7;
      }
      trail[trailIndex] = cell;
    }    
  }
  
  public boolean trailContainsLoop() {
    
    int i0 = trailIndex;
    int i1 = (trailIndex + 1) & 7;
    int i2 = (trailIndex + 2) & 7;
    int i3 = (trailIndex + 3) & 7;
    
    if (trail[i0] == trail[i2] && trail[i1] == trail[i3]) {
      return true;
    }
    
    int i4 = (trailIndex + 4) & 7;
    int i5 = (trailIndex + 5) & 7;
    
    if (trail[i0] == trail[i3] && trail[i1] == trail[i4] 
        && trail[i2] == trail[i5]) {
      return true;
    }
    
    int i6 = (trailIndex + 6) & 7;
    int i7 = (trailIndex + 7) & 7;
    
    if (trail[i0] == trail[i4] && trail[i1] == trail[i5]
        && trail[i2] == trail[i6] && trail[i3] == trail[i7]) {
      return true;
    }
    
    return false;
  }
  
  @Override
  public void checkBounds(float maxY) {
    if (y + hitY1 > maxY) {
      remove();
    }
  }
}
