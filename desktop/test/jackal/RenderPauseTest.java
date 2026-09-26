package jackal;

import java.lang.reflect.*;
import java.util.*;
import org.newdawn.slick.*;

/** Real constructors and inherited production renders; immutable pre-guard references from 9719c8e. */
public final class RenderPauseTest {
  interface Reference { void referenceRender(); }
  static final List<String> trace = new ArrayList<String>();
  static final class Sprite extends Image {
    final String id;
    Sprite(String id) { super(); this.id=id; }
    public String toString() { return id; }
  }
  static void record(String operation, Object... values) {
    for(Object v:values) if(v==null) throw new AssertionError("Invalid sprite in "+operation);
    trace.add(operation+Arrays.deepToString(values));
  }
  static final class QuietGraphics extends Graphics {
    public void setWorldClip(float x,float y,float w,float h) { record("clip",x,y,w,h); }
    public void clearWorldClip() { record("unclip"); }
  }
  static class QuietMain extends Main {
    public void draw(Image i,float x,float y) { record("draw",i,x,y); }
    public void drawVehicle(Image[] i,float x,float y,float a,float alpha) { record("vehicle",i,x,y,a,alpha); }
    public void drawRotated(Image i,float x,float y,float cx,float cy,float a) { record("rotate",i,x,y,cx,cy,a); }
    public void drawRotatedScaled(Image i,float x,float y,float cx,float cy,float a,float sx,float sy,float alpha) { record("scaled",i,x,y,cx,cy,a,sx,sy,alpha); }
    public void drawCenteredAlpha(Image i,float x,float y,float a) { record("alpha",i,x,y,a); }
    public void drawCentered(Image i,float x,float y,float s,float a) { record("center",i,x,y,s,a); }
  }
  static QuietMain setup() throws Exception {
    QuietMain m=new QuietMain(); Main.main=m;
    GameMode w=new GameMode(); Main.gameMode=w; w.main=m;
    w.groupsMap=new byte[64][64]; w.typesMap=new int[64][64]; w.mapWidth=64; w.mapHeight=64;
    for(int[] row:w.typesMap)Arrays.fill(row,GameMode.TYPE_EMPTY);
    for(int i=0;i<w.elements.length;i++) w.elements[i]=new ArrayList<GameElement>();
    w.player=new Player(); w.g=new QuietGraphics();
    for(Field f:Main.class.getFields()) {
      if(Modifier.isStatic(f.getModifiers())) continue;
      if(f.getType()==Image.class) f.set(m,new Sprite(f.getName()));
      if(f.getType()==Image[].class) { Image[] a=new Image[32]; for(int i=0;i<a.length;i++)a[i]=new Sprite(f.getName()+":"+i);f.set(m,a); }
      if(f.getType()==Image[][].class) { Image[][] a=new Image[8][32]; for(int i=0;i<a.length;i++)for(int j=0;j<a[i].length;j++)a[i][j]=new Sprite(f.getName()+":"+i+":"+j);f.set(m,a); }
    }
    return m;
  }
  static void set(Object o,String name,Object value) throws Exception {
    Field f;try {f=o.getClass().getField(name);}catch(NoSuchFieldException absent){return;}
    if(f.getType()==float.class)f.setFloat(o,((Number)value).floatValue());
    else if(f.getType()==int.class)f.setInt(o,((Number)value).intValue());
    else f.set(o,value);
  }
  static Map<String,Object> state(Object o)throws Exception {
    Map<String,Object> result=new TreeMap<String,Object>();
    for(Field f:o.getClass().getFields())if(!Modifier.isStatic(f.getModifiers())&&f.getType().isPrimitive())result.put(f.getName(),f.get(o));
    return result;
  }
  static void check(boolean value,String message) {if(!value)throw new AssertionError(message);}
  static List<String> draw(GameElement o,boolean original) {
    trace.clear(); if(original)((Reference)o).referenceRender();else o.render();return new ArrayList<String>(trace);
  }
  static void seed(GameElement o)throws Exception {
    String[] zero={"angle","positionDriftTime","positionDriftDx","wobbleX","wobbleY","orientation","legIndex","asterDelay","splashing"};
    for(String f:zero)set(o,f,0);
    set(o,"x",160);set(o,"y",160);set(o,"length",64);set(o,"alpha",0.5);set(o,"delay",12);set(o,"aiming",12);set(o,"shots",2);
    set(o,"openY",16);set(o,"doorY",16);set(o,"vehicleY",176);set(o,"vehicle",new Image[]{new Sprite("vehicle")});
    set(o,"visible",true);set(o,"colorChanging",true);set(o,"beamIndex",1);
  }
  static void matrix(Class<? extends GameElement> type,Map<String,Object[]> axes)throws Exception {
    GameElement o=type.newInstance(),ref=type.newInstance();seed(o);seed(ref);
    for(Field f:type.getFields())if(!Modifier.isStatic(f.getModifiers()))f.set(ref,f.get(o));
    List<Object> states=new ArrayList<Object>();
    for(Field f:type.getFields())if(f.getName().startsWith("STATE_")&&Modifier.isStatic(f.getModifiers()))states.add(f.get(null));
    if(!states.isEmpty())axes.put("state",states.toArray());
    List<Map<String,Object>> rows=new ArrayList<Map<String,Object>>();rows.add(new LinkedHashMap<String,Object>());
    for(Map.Entry<String,Object[]> axis:axes.entrySet()) {
      List<Map<String,Object>> next=new ArrayList<Map<String,Object>>();
      for(Map<String,Object> row:rows)for(Object v:axis.getValue()){Map<String,Object> n=new LinkedHashMap<String,Object>(row);n.put(axis.getKey(),v);next.add(n);} rows=next;
    }
    int visible=0;
    for(Map<String,Object> row:rows) {
      for(Map.Entry<String,Object> e:row.entrySet()){set(o,e.getKey(),e.getValue());set(ref,e.getKey(),e.getValue());}
      Main.gameMode.paused=false;
      for(int i=0;i<160;i++){check(draw(o,false).equals(draw(ref,true)),type+" original trace "+row+" step "+i);check(state(o).equals(state(ref)),type+" original fields");}
      for(Map.Entry<String,Object> e:row.entrySet()){set(o,e.getKey(),e.getValue());set(ref,e.getKey(),e.getValue());}
      Main.gameMode.paused=true;Map<String,Object> frozen=state(o);List<String> first=draw(o,false);if(!first.isEmpty())visible++;
      check(state(o).equals(frozen),type+" paused fields "+row);
      for(int i=0;i<200;i++){check(draw(o,false).equals(first),type+" paused trace");check(state(o).equals(frozen),type+" paused fields");}
      Main.gameMode.paused=false;check(draw(o,false).equals(draw(ref,true)),type+" resume trace");check(state(o).equals(state(ref)),type+" resume fields");
    }
    check(visible>0,type+" no visible fixture");System.out.println("ok - Java render pause "+type.getSimpleName()+" "+rows.size()+" states");
  }
  static Map<String,Object[]> axes(Object... entries){Map<String,Object[]> r=new LinkedHashMap<String,Object[]>();for(int i=0;i<entries.length;i+=2)r.put((String)entries[i],(Object[])entries[i+1]);return r;}
  static Object[] values(Object... values){return values;}
  public static void main(String[] args)throws Exception {
    setup();
    matrix(RBossGarage.class,axes("lightIndex",values(1,2,3)));
    matrix(RBossHeadquarters.class,axes("flashDelay",values(1,2,12,68),"flashing",values(false,true),"flashIndex",values(-1,0,1)));
    matrix(RBossHelicopter.class,axes("rotorAngle",values(0,-30,-60),"tailIndexCounter",values(false,true),"tailIndex",values(3,4)));
    matrix(RBossShipGun.class,axes("colorIndex",values(0,1,2,3)));
    matrix(RBossStatue.class,axes("eyesVisible",values(0,1,2,3)));
    matrix(REnemyHelicopter.class,axes("rotorAngle",values(0,-30,-60)));
    matrix(REnemySoldier.class,axes("blink",values(0,1,2,3,4),"fire",values(false,true),"inSwamp",values(false,true),"aiming",values(12,23,24)));
    matrix(RFire.class,axes("flickerCounter",values(0,1,2,3),"flickerIndex",values(0,1),"length",values(64,96,128)));
    matrix(RFlame.class,axes("spriteCounter",values(0,1,2,3,4,5,6,7),"spriteIndex",values(0,1)));
    matrix(RFloorGun.class,axes("colorIndex",values(0,1,2,3)));
    matrix(RFriendlySoldier.class,axes("colorIndex",values(0,1,2,3),"colorChanging",values(false,true)));
    matrix(RLasersManager.class,axes("flash",values(false,true),"colorIndex",values(0,1,2,3)));
    matrix(RMine.class,axes("spriteIndex",values(0,1,2,3),"visible",values(false,true)));
    matrix(RStar.class,axes("flashingIndex",values(0,1,2,3),"type",values(0,1,2)));
    matrix(RStatue.class,axes("eyesVisible",values(0,1,2,3)));
    matrix(RSuperFire.class,axes("flickerCounter",values(0,0.5,1,1.5,2,2.5,3),"flickerIndex",values(0,1)));
    matrix(RSwampMissileLauncher.class,axes("splashIndex",values(0,1,2,3,4,5),"splashing",values(0,1,8,9)));
  }
  public static class RBossGarage extends BossGarage implements Reference {
    public RBossGarage(){super(160,160,null);}
    public void referenceRender() {

    if (state == STATE_CLOSED) {
      main.draw(main.garages[0], x, y);
    } else {

      if (--lightIndex == 0) {
        lightIndex = 3;
      }

      main.draw(main.garages[1], x, y);
      if (state == STATE_OPEN) {
        gameMode.g.setWorldClip(x - 1, y, 130, 256);
        main.drawVehicle(vehicle, x + 64, vehicleY, 90,
            isBrownTank ? (vehicleY - (y - 8)) * 0.0125f
                      : (vehicleY - (y - 24)) * 0.0096154f);
        gameMode.g.clearWorldClip();
      }
      main.draw(main.garages[4], x, y);
      if (lightIndex > 1) {
        main.draw(main.garages[lightIndex], x + 46, y - 4);
      }

      if (state == STATE_OPENING || state == STATE_CLOSING) {
        gameMode.g.setWorldClip(x - 1, y, 130, 256);
        main.draw(main.garages[0], x, y - doorY);
        gameMode.g.clearWorldClip();
      }
    }
  }
  }
  public static class RBossHeadquarters extends BossHeadquarters implements Reference {
    public RBossHeadquarters(){super(null);}
    public void referenceRender() {
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
  public static class RBossHelicopter extends BossHelicopter implements Reference {
    public RBossHelicopter(){super();}
    public void referenceRender() {

    rotorAngle -= 30;
    if (rotorAngle == -90) {
      rotorAngle = 0;
    }
    tailIndexCounter ^= true;
    if (tailIndexCounter) {
      tailIndex = tailIndex == 3 ? 4 : 3;
    }

    float ang = angle - DRIFT_ANGLES[positionDriftTime] * positionDriftDx;

    main.drawRotated(main.bossHelicopters[5], x + 64, y + 64, -18, -65, ang);
    main.drawRotated(main.bossHelicopters[0], x, y, -64, -232, ang);
    main.drawRotated(main.bossHelicopters[1], x, y, 0, -232, ang);
    main.drawRotated(main.bossHelicopters[tailIndex], x, y, -16, -224, ang);
    for(int i = 0; i < 4; i++) {
      main.drawRotated(main.bossHelicopters[2], x, y, 0, -32,
          90 * i + rotorAngle);
    }
  }
  }
  public static class RBossShipGun extends BossShipGun implements Reference {
    public RBossShipGun(){super(160,160,null);}
    public void referenceRender() {

    switch(state) {
      case STATE_CLOSED:
        main.draw(main.shipGuns[1], x, y);
        main.draw(main.shipGuns[2], x, y + 32);
        main.draw(main.shipGuns[0], x, y);
        break;
      case STATE_OPENING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.floorGuns[0], x + 3, y + 51 - openY * 1.5f);
        main.draw(main.shipGuns[1], x, y - openY);
        main.draw(main.shipGuns[2], x, y + 32 + openY);
        main.draw(main.shipGuns[0], x, y);
        gameMode.g.clearWorldClip();
        break;
      case STATE_AIMING:
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.shipGuns[0], x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_SHOOTING:
        if (++colorIndex == 4) {
          colorIndex = 0;
        }
        main.draw(main.floorGuns[colorIndex == 1 ? 5 : 4], x, y);
        main.draw(main.shipGuns[0], x, y);
        main.drawRotated(main.floorGuns[colorIndex],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_CLOSING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32 + 48 - openY * 1.5f, -29, -29, angle - 90);
        main.draw(main.shipGuns[1], x, y - openY);
        main.draw(main.shipGuns[2], x, y + 32 + openY);
        main.draw(main.shipGuns[0], x, y);
        gameMode.g.clearWorldClip();
        break;
    }
  }
  }
  public static class RBossStatue extends BossStatue implements Reference {
    public RBossStatue(){super(160,160,0,null);}
    public void referenceRender() {

    switch(state) {
      case STATE_EYES_FLASHING:
        if (eyesVisible < 2) {
          main.draw(main.statueWhiteEyes, x + 32, y + 64);
        }
        if (++eyesVisible == 4) {
          eyesVisible = 0;
        }
        break;
      case STATE_MOUTH_OPEN:
        main.draw(main.statueWhiteMouth, x + 32, y + 96);
        break;
    }
  }
  }
  public static class REnemyHelicopter extends EnemyHelicopter implements Reference {
    public REnemyHelicopter(){super(true);}
    public void referenceRender() {
    rotorAngle -= 30;
    if (rotorAngle == -90) {
      rotorAngle = 0;
    }

    float ang = angle - BossHelicopter.DRIFT_ANGLES[positionDriftTime]
        * positionDriftDx;

    main.drawRotated(main.enemyHelicopters[2], x + 32, y + 40, -30, -11, ang);
    main.drawRotated(main.enemyHelicopters[0], x, y, -74, -28, ang);

    for(int i = 0; i < 4; i++) {
      main.drawRotated(main.enemyHelicopters[1], x, y, 0, -18,
          90 * i + rotorAngle);
    }
  }
  }
  public static class REnemySoldier extends EnemySoldier implements Reference {
    public REnemySoldier(){super(160,160,EnemySoldierType.APPEARING);}
    public void referenceRender() {
    if (--blink < 0) {
      blink = 4;
    }
    if (fire) {
      main.draw((inSwamp ? main.swampSoldiers : main.enemySoldiers)
          [blink < 2 && state == STATE_AIMING
              && aiming <= AIM_BLINKING ? 0 : 1][orientation + legIndex],
                  x + wobbleX - 16, y + wobbleY - 54);
    } else {
      main.draw((inSwamp ? main.swampSoldiers : main.enemySoldiers)
          [blink < 2 && state == STATE_AIMING
              && aiming <= AIM_BLINKING ? 1 : 0][orientation + legIndex],
                  x + wobbleX - 16, y + wobbleY - 54);
    }
  }
  }
  public static class RFire extends Fire implements Reference {
    public RFire(){super(160,160,1,0,90,null);}
    public void referenceRender() {
    if (++flickerCounter == 4) {
      flickerIndex ^= 1;
      flickerCounter = 0;
    }
    int index = 0;
    float scale = 1;
    if (length < 96) {
      scale = length * 0.015625f;
    } else {
      index = 1;
      scale = length * 0.0078125f;
    }
    if (state == STATE_SHRINKING) {
      scale = -scale;
    }
    main.drawRotatedScaled(main.fires[flickerIndex][index],
        x, y, 0, -8, angle, scale, 1, alpha);
  }
  }
  public static class RFlame extends Flame implements Reference {
    public RFlame(){super(160,160);}
    public void referenceRender() {
    if (++spriteCounter == 8) {
      spriteCounter = 0;
      spriteIndex ^= 1;
    }
    main.drawCenteredAlpha(main.fires[spriteIndex][2], x, y, ALPHAS[delay]);
  }
  }
  public static class RFloorGun extends FloorGun implements Reference {
    public RFloorGun(){super(160,160);}
    public void referenceRender() {

    switch(state) {
      case STATE_CLOSED:
        main.draw(panel, x, y);
        main.draw(panel, x, y + 32);
        main.draw(mask, x, y);
        break;
      case STATE_OPENING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.draw(main.floorGuns[0], x + 3, y + 51 - openY * 1.5f);
        main.draw(panel, x, y - openY);
        main.draw(panel, x, y + 32 + openY);
        main.draw(mask, x, y);
        gameMode.g.clearWorldClip();
        break;
      case STATE_AIMING:
        main.draw(main.floorGuns[4], x, y);
        main.draw(mask, x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_SHOOTING:
        if (++colorIndex == 4) {
          colorIndex = 0;
        }
        main.draw(main.floorGuns[colorIndex == 1 ? 5 : 4], x, y);
        main.draw(mask, x, y);
        main.drawRotated(main.floorGuns[colorIndex],
            x + 32, y + 32, -29, -29, angle - 90);
        break;
      case STATE_CLOSING:
        gameMode.g.setWorldClip(x, y, 64, 64);
        main.draw(main.floorGuns[4], x, y);
        main.drawRotated(main.floorGuns[0],
            x + 32, y + 32 + 48 - openY * 1.5f, -29, -29, angle - 90);
        main.draw(panel, x, y - openY);
        main.draw(panel, x, y + 32 + openY);
        main.draw(mask, x, y);
        gameMode.g.clearWorldClip();
        break;
    }
  }
  }
  public static class RFriendlySoldier extends FriendlySoldier implements Reference {
    public RFriendlySoldier(){super(160,160,FriendlySoldierType.WANDERER);}
    public void referenceRender() {
    if (colorChanging) {
      colorIndex = (colorIndex + 1) & 3;
    }
    main.draw(main.friendlySoldiers[colorIndex][orientation + legIndex],
        x + wobbleX - 16, y + wobbleY
            - (orientation == ORIENTATION_LEFT
                || orientation == ORIENTATION_RIGHT ? 60 : 56));
  }
  }
  public static class RLasersManager extends LasersManager implements Reference {
    public RLasersManager(){super(160,160);}
    public void referenceRender() {

    flash = !flash;
    if (++colorIndex == 4) {
      colorIndex = 0;
    }

    float X = x + BEAM_SPACING * beamIndex;

    switch(state) {
      case STATE_OUTER_FLASHING:
        if (flash) {
          float Y = y + 40;
          for(int i = 0; i < 2; i++, Y -= VERTICAL_SPACE) {
            main.draw(main.lasers[4], X + 16, Y);
            main.draw(main.lasers[4], X + 96, Y);
          }
          Y += 64;
          main.draw(main.lasers[4], X + 16, Y);
          main.draw(main.lasers[4], X + 96, Y);
        }
        break;
      case STATE_INNER_FLASHING:
        if (flash) {
          float Y = y + 44;
          for(int i = 0; i < 2; i++, Y -= VERTICAL_SPACE) {
            main.draw(main.lasers[5], X + 48, Y);
            main.draw(main.lasers[5], X + 68, Y);
          }
          Y += 64;
          main.draw(main.lasers[5], X + 48, Y);
          main.draw(main.lasers[5], X + 68, Y);
        }
        break;
      case STATE_WARMING_UP:
        break;
      case STATE_LASERING:
        for(int i = 1; i < 13; i++) {
          main.draw(main.lasers[colorIndex], X + 48, y - (i << 5) + 4);
        }
        for(int i = 1; i < 11; i++) {
          main.draw(main.lasers[colorIndex], X + 48, y - (i << 5) - 508);
        }
        break;
    }
  }
  }
  public static class RMine extends Mine implements Reference {
    public RMine(){super(160,160);}
    public void referenceRender() {
    if (visible) {
      if (++spriteIndex == 4) {
        spriteIndex = 0;
      }
      main.draw(main.mines[spriteIndex], x, y);
    }
  }
  }
  public static class RStar extends Star implements Reference {
    public RStar(){super(160,160,Star.TYPE_FLASHING);}
    public void referenceRender() {
    switch(type) {
      case TYPE_BROWN:
        main.draw(main.stars[SPRITE_BROWN], x - 32, y - 32);
        break;
      case TYPE_GREEN:
        main.draw(main.stars[SPRITE_GREEN], x - 32, y - 32);
        break;
      case TYPE_FLASHING:
        main.draw(main.stars[flashingIndex], x - 32, y - 32);
        if (--flashingIndex < 0) {
          flashingIndex = 3;
        }
        break;
    }
  }
  }
  public static class RStatue extends Statue implements Reference {
    public RStatue(){super(160,160,0);}
    public void referenceRender() {

    switch(state) {
      case STATE_EYES_FLASHING:
        if (eyesVisible < 2) {
          main.draw(main.statueBlueEyes, x + 32, y + 64);
        }
        if (++eyesVisible == 4) {
          eyesVisible = 0;
        }
        break;
      case STATE_MOUTH_OPEN:
        main.draw(main.statueBlueMouth, x + 32, y + 96);
        break;
    }
  }
  }
  public static class RSuperFire extends SuperFire implements Reference {
    public RSuperFire(){super(160,160,null);}
    public void referenceRender() {
    if (flickerCounter >= 2.5f) {
      flickerCounter -= 2.5f;
    } else {
      flickerIndex ^= 1;
    }
    flickerCounter++;
    float X = x - 48;
    float halfLength = length * 0.5f;
    switch(state) {
      case STATE_ASTER:
        for(int i = 0; i < ASTER_SPINES; i++) {
          main.drawCentered(main.elephantGuns[4],
              x + ASTERS_XYS[asterDelay][i][0],
              y + ASTERS_XYS[asterDelay][i][1],
              ASTER_SCALES[asterDelay],
              ASTER_SCALES[asterDelay]);
        }
        break;
      case STATE_DIAMOND:
        gameMode.g.setWorldClip(X - 1, y, 98, halfLength);
        main.draw(main.superFires[flickerIndex][0], X, y);
        gameMode.g.setWorldClip(X - 1, y + halfLength, 98, halfLength);
        main.draw(main.superFires[flickerIndex][2], X, y + length - 64);
        gameMode.g.clearWorldClip();
        break;
      case STATE_GROWING:
        main.draw(main.superFires[flickerIndex][0], X, y);
        gameMode.g.setWorldClip(X - 1, y + 64, 98, length);
        for(int i = 1 + (((int)(length - 128)) >> 5); i >= 0; i--) {
          main.draw(main.superFires[flickerIndex][1], X,
              y + length - (i << 5) - 64);
        }
        gameMode.g.clearWorldClip();
        main.draw(main.superFires[flickerIndex][2], X, y + length - 64);
        break;
      default:
      case STATE_MOVING:
        main.draw(main.superFires[flickerIndex][0], X, y);
        for(int i = 0; i < 12; i++) {
          main.draw(main.superFires[flickerIndex][1], X, y + 64 + (i << 5));
        }
        main.draw(main.superFires[flickerIndex][2], X, y + 448);
        break;
    }
  }
  }
  public static class RSwampMissileLauncher extends SwampMissileLauncher implements Reference {
    public RSwampMissileLauncher(){super(160,160);}
    public void referenceRender() {
    if (splashing > 8) {
      main.draw(main.swampMissiles[4], x + 2, y);
    } else if (splashing > 0) {
      main.draw(main.swampMissiles[3], x + 16, y);
    } else {
      if (++splashIndex == 6) {
        splashIndex = 0;
      }
      if (splashIndices[splashIndex]) {
        main.draw(main.swampMissiles[2], x + 8, y);
      } else {
        main.draw(main.swampMissiles[1], x + 24, y);
      }
    }
  }
  }
}
