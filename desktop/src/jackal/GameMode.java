package jackal;

import java.util.*;
import org.lwjgl.opengl.*;
import org.newdawn.slick.*;

public class GameMode implements IMode, IFadeListener {
  
  public static final float CAMERA_MARGIN_NORTH = 384;
  public static final float CAMERA_MARGIN_SOUTH = 192;
  public static final float CAMERA_MARGIN_SIDES = 256;
  public static final float CAMERA_BOUND = 224;
  public static final float REMOVE_BOUND = 1536;
  public static final float BOSS_PAN_CAMERA_SPEED = 4;
  public static final float ENDING_PAN_CAMERA_SPEED = 2;
  public static final float CONVEYOR_SPEED = Player.SPEED / 3;
  public static final int STAGE_COMPLETED_DELAY = 228;
  
  public static final int TYPE_SOLID = 0;
  public static final int TYPE_EMPTY = 1;
  public static final int TYPE_SHIELD = 2;
  public static final int TYPE_WATER = 3;
  public static final int TYPE_SWAMP = 4;
  public static final int TYPE_CONVEYOR = 5;
  
  public static final int DIR_UP = 0;
  public static final int DIR_DOWN = 1;
  public static final int DIR_LEFT = 2;
  public static final int DIR_RIGHT = 3;
  public static final int DIR_UP_LEFT = 4;
  public static final int DIR_UP_RIGHT = 5;
  public static final int DIR_DOWN_LEFT = 6;
  public static final int DIR_DOWN_RIGHT = 7;  
  
  public static final float[] DIRECTION_RADIANS = {
    (float)(3.0 * Math.PI / 2.0),
    (float)(Math.PI / 2.0),
    (float)(Math.PI),
    (float)(0.0),
    (float)(5.0 * Math.PI / 4.0),
    (float)(7.0 * Math.PI / 4.0),
    (float)(3.0 * Math.PI / 4.0),
    (float)(Math.PI / 4.0),
  };
  
  public static final int[] DIRECTION_DEGREES = {
    270,
    90,
    180,
    0,    
    225,
    315,
    135,
    45,    
  };  
  
  public static final int WATER_ALPHAS_PERIOD = 136;
  public static final float[] WATER_ALPHAS = new float[WATER_ALPHAS_PERIOD];
  static {
    for(int i = 0; i < WATER_ALPHAS_PERIOD; i++) {
      WATER_ALPHAS[i] = 0.5f + 0.5f 
          * (float)Math.sin(2.0 * Math.PI * i / (double)WATER_ALPHAS_PERIOD);
    }
  }
  
  public Main main;
  public GameContainer gc;
  public IInput input;
    
  public Stage stage;
  
  public int[][] tileMap;         // mutable during gameplay
  public int[][] typesMap;        // mutable during gameplay
  public boolean[] triggedGroups; // mutable during gameplay
  
  public Image[] tiles;
  public int[][][] groups;  
  public int[][][] triggerMap;
  public byte[][] groupsMap;
  public int mapWidth;
  public int mapHeight;
  public long[] directions;
  public int directionsWidth;
  public int directionsHeight;  
  public Graphics g;
  public int waterAlphaIndex;
  public float conveyorOffset;
  public int conveyorLastIndex;
  public float conveyorDelta;
  
  public Player player;  
  public float cameraX;
  public float cameraY;
  public float maxCameraX;
  public float maxCameraY; 
  public boolean paused;
  public int triggerY;
  public boolean bossCameraPan;
  public boolean endingCameraPan;
  public boolean playing = true;
  public ICameraPanListener cameraPanListener;
  
  public int stageIndex;
  
  public boolean stageCompleted;
  public int stageCompletedDelay = STAGE_COMPLETED_DELAY;
  
  public ArrayList<GameElement>[] elements = new ArrayList[8];
  
  public ArrayList<Enemy> enemies = new ArrayList<Enemy>(256);
  public ArrayList<Enemy> solids = new ArrayList<Enemy>(256);
  public ArrayList<Enemy> mines = new ArrayList<Enemy>(256);
  
  @Override
  public void init(Main main, GameContainer gc) throws SlickException {
    this.main = main;
    this.gc = gc;
    this.input = main.input;
    
    main.friendlySoldiersPickedUp = 0;
    FriendlySoldier.resetCount();
    
    for(int i = 0; i < elements.length; i++) {      
      elements[i] = new ArrayList<GameElement>(256);
    }  
    
    triggerY = mapHeight;
    maxCameraX = (mapWidth - 32) * 32;
    maxCameraY = (mapHeight - 31) * 32; 
    cameraX = 0;
    cameraY = maxCameraY;

    player = new Player();
    player.y = cameraY + 2 * Main.DISPLAY_HEIGHT;        
  }
  
  public void setStage(int stageIndex, Stage stage, boolean hard) {
    this.stageIndex = stageIndex;
    this.stage = stage;
    
    this.tiles = stage.tiles;
    this.groups = stage.groups;  
    this.triggerMap = stage.triggerMap[hard ? 1 : 0];
    this.groupsMap = stage.groupsMap;
    this.mapWidth = stage.mapWidth;
    this.mapHeight = stage.mapHeight;
    this.directions = stage.directions;
    this.directionsWidth = stage.directionsWidth;
    this.directionsHeight = stage.directionsHeight;  
    
    tileMap = new int[stage.tileMap.length][stage.tileMap[0].length];
    for(int i = stage.tileMap.length - 1; i >= 0; i--) {
      System.arraycopy(stage.tileMap[i], 0, tileMap[i], 0, 
          stage.tileMap[i].length);
    }
    
    typesMap = new int[stage.typesMap.length][stage.typesMap[0].length];
    for(int i = stage.typesMap.length - 1; i >= 0; i--) {
      System.arraycopy(stage.typesMap[i], 0, typesMap[i], 0, 
          stage.typesMap[i].length);
    }
    
    triggedGroups = new boolean[groups.length];
  }  
  
  private boolean isBossEntryBlockedByDeath() {
    return player.respawning > 0
        && (main.extraLives == 0
            || (main.currentSong != null && main.currentSong.lastLifeSuspended));
  }

  public void startBossCameraPan(ICameraPanListener cameraPanListener) {
    bossCameraPan = true;
    this.cameraPanListener = cameraPanListener;
  }
  
  public boolean tryStartEndingCameraPan(ICameraPanListener cameraPanListener) {
    if (main.mode != this || player.respawning != 0) {
      return false;
    }
    playing = false;
    endingCameraPan = true;
    this.cameraPanListener = cameraPanListener;
    return true;
  }
  
  public void rotate(float[] v, float angle) {

    float cos = (float)Math.cos(angle);
    float sin = (float)Math.sin(angle);
    
    float x = v[0];
    float y = v[1];
    
    v[0] = x * cos - y * sin;
    v[1] = x * sin + y * cos;
  }
  
  public void triggerGroup(int groupIndex) {
    if (!triggedGroups[groupIndex]) {
      triggedGroups[groupIndex] = true;
      int[][] group = groups[groupIndex];
      for(int i = group.length - 1; i >= 0; i--) {
        int[] g = group[i];
        int x = g[0];
        int y = g[1];
        int tile = g[2];
        int type = g[3];
        tileMap[y][x] = tile;
        typesMap[y][x] = type;
      }
    }
  }
  
  // rotates 90+ degrees, used after a collision
  public float[] suggestDirection(float vx, float vy) {
    
    boolean clockwise = true;
    
    if (vy >= 0) {
      if (vx >= 0) {
        if (vy > vx) {
          clockwise = false;
        }
      } else {
        if (-vx > vy) {
          clockwise = false;
        }
      } 
    } else {
      if (vx >= 0) {
        if (vx > -vy) {
          clockwise = false;
        }
      } else {
        if (vx >= vy) {
          clockwise = false;
        }
      }
    }  
    
    float angle = 1.571f + 0.4f * main.random.nextFloat();
    float[] v = main.unitVector;
    v[0] = vx;
    v[1] = vy;
    if (clockwise) {
      rotate(v, angle);
    } else {      
      rotate(v, -angle);
    }
    
    return v;
  }
  
  public float[] straightDirection(float x1, float y1, float x2, float y2) {
    
    float angle = (float)Math.toDegrees(Math.atan2(y2 - y1, x2 - x1));
    if (angle < 0) {
      angle += 360;
    }    
    
    int ang = 45 * (int)Math.round(angle / 45f);
    float[] v =  main.createUnitVector(ang);
    v[2] = ang;
    
    return v;
  }  
  
  public float[] suggestDirection(float x1, float y1, float x2, float y2,
      int currentAngle, boolean addRandomness) {
    
    float[] v;
    
    int X1 = ((int)x1) >> 7;
    int Y1 = ((int)y1) >> 7;
    int X2 = ((int)x2) >> 7;
    int Y2 = ((int)y2) >> 7;
    
    if (X1 < 0 || Y1 < 0 
        || X1 >= directionsWidth || Y1 >= directionsHeight
        || X2 < 0 || Y2 < 0 
        || X2 >= directionsWidth || Y2 >= directionsHeight) {
      return straightDirection(x1, y1, x2, y2);
    }
    
    int i = (((Y1 << 4) + X1) << 4) * directionsHeight + ((Y2 << 4) + X2);
    int index = i / 21;
    int shift = 3 * (i % 21);
    
    if (index < 0 || index >= directions.length) {
      return straightDirection(x1, y1, x2, y2);
    }
    
    int direction = (int)((directions[index] >> shift) & 7L);
    
    if (addRandomness) {
      float angle = DIRECTION_RADIANS[direction] 
          + (main.random.nextFloat() - 0.5f) * 0.7854f;

      v = main.createUnitVector2(angle);
      v[2] = angle;
    } else {
      int targetAngle = DIRECTION_DEGREES[direction];            
      int deltaAngle = (targetAngle - currentAngle + 180) % 360;
      if (deltaAngle < 0) {
        deltaAngle += 180;
      } else {
        deltaAngle -= 180;
      }
      if (deltaAngle != 0) {
        if (deltaAngle < 0) {
          currentAngle -= 45;
        } else {
          currentAngle += 45;
        }
        if (currentAngle < 0) {
          currentAngle += 360;
        } else if (currentAngle >= 360) {
          currentAngle -= 360;
        }
      }            
      
      v = main.createUnitVector(currentAngle);
      v[2] = currentAngle;
    }
    
    return v;
  } 
  
  public float[] suggestDirection(float x1, float y1, float x2, float y2,
      boolean addRandomness) {
    
    float[] v;
    
    int X1 = ((int)x1) >> 7;
    int Y1 = ((int)y1) >> 7;
    int X2 = ((int)x2) >> 7;
    int Y2 = ((int)y2) >> 7;
    
    if (X1 < 0 || Y1 < 0 
        || X1 >= directionsWidth || Y1 >= directionsHeight
        || X2 < 0 || Y2 < 0 
        || X2 >= directionsWidth || Y2 >= directionsHeight) {
      return straightDirection(x1, y1, x2, y2);
    }
    
    int i = (((Y1 << 4) + X1) << 4) * directionsHeight + ((Y2 << 4) + X2);
    int index = i / 21;
    int shift = 3 * (i % 21);
    
    if (index < 0 || index >= directions.length) {
      return straightDirection(x1, y1, x2, y2);
    }    
    
    int direction = (int)((directions[index] >> shift) & 7L);
    
    if (addRandomness) {
      float angle = DIRECTION_RADIANS[direction] 
          + (main.random.nextFloat() - 0.5f) * 0.7854f;

      v = main.createUnitVector2(angle);
      v[2] = angle;
    } else {
      int angle = DIRECTION_DEGREES[direction];
      v = main.createUnitVector(angle);
      v[2] = DIRECTION_DEGREES[direction];
    }
    
    return v;
  }
  
  private void cameraTrackPlayer() {
    if (player.x - cameraX < CAMERA_MARGIN_SIDES) {
      cameraX = player.x - CAMERA_MARGIN_SIDES;
      if (cameraX < 0) {
        cameraX = 0;
      }
    } else if (cameraX - player.x < CAMERA_MARGIN_SIDES - Main.DISPLAY_WIDTH) {
      cameraX = player.x + CAMERA_MARGIN_SIDES - Main.DISPLAY_WIDTH;
      if (cameraX > maxCameraX) {
        cameraX = maxCameraX;
      }
    }
    
    if (player.y - cameraY < CAMERA_MARGIN_NORTH) {
      cameraY = player.y - CAMERA_MARGIN_NORTH;
      if (cameraY < 0) {
        cameraY = 0;
      }
    } else if (cameraY - player.y < CAMERA_MARGIN_SOUTH - Main.DISPLAY_HEIGHT) {
      cameraY = player.y + CAMERA_MARGIN_SOUTH - Main.DISPLAY_HEIGHT;
      if (cameraY > maxCameraY) {
        cameraY = maxCameraY;
      }
    }
    
    float maxY = cameraY + CAMERA_BOUND;
    if (maxY < maxCameraY) {
      maxCameraY = maxY;
    }
  }
  
  private void processTriggers() {
    int row = (((int)cameraY) >> 5) - 1;
    if (row >= 0) {
      while(triggerY > row) {        
        int[][] triggers = triggerMap[--triggerY];
        for(int i = triggers.length - 1; i >= 0; i--) {
          int[] trigger = triggers[i];
          processTrigger(trigger[0], trigger[1], trigger[2]);
        }
      }
    }
  }
  
  private void processTrigger(int index, int x, int y) {
    
    switch(index) {      
      case Triggers.GRAY_GUN:
        new RotatingGun(x + 64, y + 64, true);
        break;
      case Triggers.SOLDIER_WALKER:
        new EnemySoldier(x + 32, y + 74, EnemySoldierType.WALKER);
        break;
      case Triggers.SOLDIER_STATIONARY:
        new EnemySoldier(x + 32, y + 74, EnemySoldierType.STATIONARY);
        break;
      case Triggers.GREEN_BOAT:
        new GreenBoat(x + 72, y + 56);
        break;
      case Triggers.BROWN_TANK:
        new BrownTank(x + 32, y + 48);
        break;
      case Triggers.FRIENDLY_HELICOPTER_LANDING:
        new FriendlyHelicopter(cameraX + Main.DISPLAY_WIDTH / 2, 
            cameraY + Main.DISPLAY_HEIGHT + 128, true, false);
        break;
      case Triggers.YELLOW_GUN:
        new RotatingGun(x + 64, y + 64, false);
        break;
      case Triggers.STAR_BROWN:
        new InvisibleStar(x + 32, y + 32, Star.TYPE_BROWN);
        break;
      case Triggers.GRAY_TANK:
        new GrayTank(x + 64, y + 64);
        break;
      case Triggers.STAR_FLASHING:
        new InvisibleStar(x + 32, y + 32, Star.TYPE_FLASHING);
        break;        
      case Triggers.AIRPLANE:
        new Airplane(x + 60, y + 62);
        break;
      case Triggers.GRAY_JEEP:
        new GrayJeep(x + 32, y + 46);
        break;
      case Triggers.PARKED_GRAY_JEEP:
        new ParkedGrayJeep(x + 32, y + 46);
        break;
      case Triggers.GRAY_BOAT:
        new GrayBoat(x, y);
        break;
      case Triggers.APPEARING_SOLDIER:
        new AppearingSoldier(x + 32, y + 74);
        break;
      case Triggers.APPEARING_BROWN_TANK:
        new AppearingBrownTank(x + 8, y + 12);
        break;
      case Triggers.SUBMARINE:
        new Submarine(x + 32, y + 128);
        break;
      case Triggers.TROOPS_TRUCK:
        new TroopsTruck(x, y + 8);
        break;
      case Triggers.FLOOR_GUN:
        new FloorGun(x, y + 28);
        break;
      case Triggers.SWAMP_MISSILE_LAUNCHER:
        new SwampMissileLauncher(x, y);
        break;
      case Triggers.ROCK:
        new Rock(x + 32, y + 32);
        break;
      case Triggers.CANNON_TRUCK_RIGHT:
        new CannonTruck(x + 16, y, true);
        break;
      case Triggers.MINE:
        new Mine(x + 16, y);
        break;
      case Triggers.CLIFF_MISSILE_LAUNCHER:
        new CliffMissileLauncher(x + 16, y + 20);
        break;
      case Triggers.TRAIN:
        new TrainManager(x + 4, y);
        break;
      case Triggers.CANNON_TRUCK_LEFT:
        new CannonTruck(x + 16, y, false);
        break;
      case Triggers.HOUSE_LEFT:
        new House(x, y, true);
        break;
      case Triggers.HOUSE_RIGHT:
        new House(x, y, false);
        break;
      case Triggers.HUT:
        new Hut(x, y, false, false);
        break;
      case Triggers.SHACK:
        new Hut(x, y, true, false);
        break;
      case Triggers.GATE:
        new Gate(x, y);
        break;
      case Triggers.TANK_SHACK:
        new Hut(x, y, true, true);
        break;   
      case Triggers.CLIFF_GUN:
        new CliffGun(x, y);
        break;
      case Triggers.FIRE_TANK:
        new FireTank(x + 64, y + 64);
        break;
      case Triggers.SOLDIER_FIRE:
        new EnemySoldier(x + 32, y + 74, EnemySoldierType.FIRE);
        break;
      case Triggers.PARKED_BROWN_TANK:
        new ParkedBrownTank(x + 32, y + 40);
        break;
      case Triggers.PLAYER:
        createPlayer(x + 48, y + 48);       
        main.startFade(false, null);
        switch(main.stageIndex) {
          case 3:
            main.requestSong(main.stageSong0);
            break;
          case 1:
          case 4:
            main.requestSong(main.stageSong1);
            break;
          case 2:
          case 5:
            main.requestSong(main.stageSong2);
            break;
        }        
        break;
      case Triggers.GREEN_GUN:
        new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_GREEN);
        break;
      case Triggers.APPEARING_PLANE:
        new AppearingPlane(x + 60, y + 62);
        break;
      case Triggers.ENEMY_HELICOPTER:
        new EnemyHelicopter(true);
        break;
      case Triggers.FLOOR_GUN_PLAIN:
        new FloorGun(x, y + 28, true);
        break;
      case Triggers.BROWN_GUN:
        new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_BROWN);
        break;
      case Triggers.APPEARING_ENEMY_HELICOPTER:
        new AppearingEnemyHelicopter(y);
        break;
      case Triggers.APPEARING_GRAY_JEEP:
        new AppearingGrayJeep(x + 32, y + 46);
        break;
      case Triggers.FLOOR_MISSILE_LAUNCHER:
        new FloorMissileLauncher(x + 16, y + 8);
        break;
      case Triggers.STATUE_NONE:
        new Statue(x, y, Statue.TYPE_NONE);
        break;
      case Triggers.STATUE_LEFT:
        new Statue(x, y, Statue.TYPE_LEFT);
        break;
      case Triggers.STATUE_RIGHT:
        new Statue(x, y, Statue.TYPE_RIGHT);
        break;
      case Triggers.COLUMN:
        new Column(x, y);
        break;
      case Triggers.LANDING_PORT_LEFT:
        new LandingPort(x, y, LandingPort.TYPE_LEFT);
        break;
      case Triggers.LANDING_PORT_RIGHT:
        new LandingPort(x, y, LandingPort.TYPE_RIGHT);
        break;
      case Triggers.LANDING_PORT_CIRCLE:
        new LandingPort(x, y, LandingPort.TYPE_CIRCLE);
        break;
      case Triggers.BOSS_BLUE_TANKS:        
        new BossBlueTanksManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.BOSS_STATUES:
        new BossStatuesManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.LASER:
        new LasersManager(x, y);
        break;
      case Triggers.BOSS_SHIP:
        new BossShipManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.BOSS_HELICOPTER:
        new BossHelicopterManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.STAR_GREEN:
        new InvisibleStar(x + 32, y + 32, Star.SPRITE_GREEN);
        break;
      case Triggers.BOSS_GARAGE:
        new BossGarageManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.BOSS_HEADQUARTERS:
        new BossHeadquartersManager();
        main.queueGameplaySong(main.bossSong);
        break;
      case Triggers.CHINOOK:
        new Chinook();
        if (main.continued) {
          main.requestSong(main.stageSong0);
        }
        main.startFade(false, null);
        break;
    }
  }
  
  private void createPlayer(float x, float y) {
    cameraX = x - CAMERA_MARGIN_NORTH - 48;
    if (cameraX < 0) {
      cameraX = 0;
    }
    player.x = x;
    player.y = y;    
    player.makeInvincible();
  }
  
  public boolean isMissileTarget(float x, float y) {
    int type = getTileType(x, y);
    return type == TYPE_SOLID || type == TYPE_SHIELD;
  }
  
  public boolean isDriveable(float x1, float y1, float x2, float y2) {
    return isDriveable(x1, y1) 
        && isDriveable(x2, y2)
        && isDriveable(x1, y2)
        && isDriveable(x2, y1);       
  }
  
  public boolean isSolidTile(int x, int y) {
    return typesMap[y][x] == TYPE_SOLID;
  }  
  
  public boolean isDriveable(float x, float y) {
    int type = getTileType(x, y);
    return type == TYPE_EMPTY || type == TYPE_SWAMP || type == TYPE_CONVEYOR;
  }
  
  public boolean isDriveableLand(float x, float y) {
    int type = getTileType(x, y);
    return type == TYPE_EMPTY || type == TYPE_CONVEYOR;
  }  
  
  public boolean isSolid(float x, float y) {
    return getTileType(x, y) == TYPE_SOLID;
  }
  
  public boolean isEmpty(float x, float y) {
    return getTileType(x, y) == TYPE_EMPTY;
  } 
  
  public boolean isShield(float x, float y) {
    return getTileType(x, y) == TYPE_SHIELD;
  }
  
  public boolean isWater(float x, float y) {
    return getTileType(x, y) == TYPE_WATER;
  }
  
  public boolean isSwamp(float x, float y) {
    return getTileType(x, y) == TYPE_SWAMP;
  }  
  
  public boolean isConveyor(float x, float y) {
    return getTileType(x, y) == TYPE_CONVEYOR;
  }
  
  public boolean isOutsideOfFrame(float x, float y) {
    return y > cameraY + Main.DISPLAY_HEIGHT || x < cameraX || y < cameraY
        || x > cameraX + Main.DISPLAY_WIDTH;
  }
  
  public boolean isOutsideOfFrame(float x1, float y1, float x2, float y2) {
    return y1 > cameraY + Main.DISPLAY_HEIGHT || x2 < cameraX || y2 < cameraY
        || x1 > cameraX + Main.DISPLAY_WIDTH;
  }
  
  public float distanceOutsideOfFrame(float x, float y) {
    if (y < cameraY) {
      return cameraY - y;
    }
    if (y > cameraY + Main.DISPLAY_HEIGHT) {
      return y - (cameraY + Main.DISPLAY_HEIGHT);
    }
    if (x < cameraX) {
      return cameraX - x;
    }
    if (x > cameraX + Main.DISPLAY_WIDTH) {
      return x - (cameraX + Main.DISPLAY_WIDTH);
    }
    return 0;
  }
  
  public float audioVolume(float x, float y) {
    float d = distanceOutsideOfFrame(x, y);
    if (d == 0) {
      return 1;
    } else if (d >= 256) {
      return 0;
    } else {
      return 1f - d / 256f;
    }
  }
  
  public void destroyAll(Enemy exceptEnemy) {
    for(int i = enemies.size() - 1; i >= 0; i--) {
      Enemy enemy = enemies.get(i);
      if (enemy != exceptEnemy) {
        enemy.explode();
      }
    }    
    for(int i = 7; i >= 0; i--) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (element.enemyBullet) {
          element.remove = true;
        }
      }
    }    
  }  
  
  public void destroyAll() {
    for(int i = enemies.size() - 1; i >= 0; i--) {
      Enemy enemy = enemies.get(i);
      enemy.explode();
    }    
    for(int i = 7; i >= 0; i--) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (element.enemyBullet) {          
          element.remove();
        }
      }
    }    
  }  
  
  public void destroyAllWithinFrame() {
    for(int i = enemies.size() - 1; i >= 0; i--) {
      Enemy enemy = enemies.get(i);
      if (!isOutsideOfFrame(enemy.x + enemy.hitX1, enemy.y + enemy.hitY1,
          enemy.x + enemy.hitX2, enemy.y + enemy.hitY2)) {
        enemy.explode();
      }
    }    
    for(int i = 7; i >= 0; i--) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (element.enemyBullet) {
          element.remove = true;
        }
      }
    }    
  }
  
  public int getTileType(float x, float y) {
    
    int X = ((int)x) >> 5;
    int Y = ((int)y) >> 5;
    if (X < 0) {
      X = 0;
    } else if (X >= mapWidth) {
      X = mapWidth - 1;
    }
    if (Y < 0) {
      Y = 0;
    } else if (Y >= mapHeight) {
      Y = mapHeight - 1;
    }
    
    return typesMap[Y][X];
  }
  
  public void add(Enemy enemy) {
    elements[enemy.layer].add(enemy);
    enemies.add(enemy);
    if (enemy.solid) {
      solids.add(enemy);
    }
    if (enemy.mine) {
      mines.add(enemy);
    }
  }
  
  public void add(GameElement gameElement) {
    if (gameElement.enemy) {
      add((Enemy)gameElement);
    } else {
      elements[gameElement.layer].add(gameElement);
    }
  }
  
  public void stageCompleted() {
    stageCompleted = true;
    main.stopSong();
  }
  
  @Override
  public void fadeCompleted() {
    if (main.mode != this) return;
    if (stageIndex == 5) {
      main.requestMode(Modes.SUNSET, gc);
    } else {
      CutsceneSequence.requestCutscene(gc);
    }
  }  
  
  @Override
  public void update(GameContainer gc) throws SlickException {  
    
    if (paused) {
      if (input.isPause()) {
        paused = false;
        gc.setMusicOn(true);
      }
      main.resetNextFrameTime();
      return;
    } else if (input.isPause() && !stageCompleted && playing 
        && (player.respawning == 0 || main.extraLives > 0) && main.isSongPlaying()) {
      paused = true;
      main.playSound(main.pauseSound);
      gc.setMusicOn(false);
      // Accepting Pause terminates this simulation tick, just like unpausing.
      main.resetNextFrameTime();
      return;
    }    
    
    if (++waterAlphaIndex == WATER_ALPHAS_PERIOD) {
      waterAlphaIndex = 0;
    }
    
    if (stageIndex == 5) {
      conveyorOffset += CONVEYOR_SPEED;
      if (conveyorOffset >= 16) {
        conveyorOffset -= 16;
      }
      int conveyorIndex = (int)conveyorOffset;
      conveyorDelta = conveyorIndex - conveyorLastIndex;
      if (conveyorDelta < 0) {
        conveyorDelta += 16;
      }
      tiles[0] = main.conveyors[conveyorIndex];
      conveyorLastIndex = conveyorIndex;
    }
    
    if (bossCameraPan && !isBossEntryBlockedByDeath()) {
      if (cameraY != 0) {
        cameraY -= BOSS_PAN_CAMERA_SPEED;
        if (cameraY > 0) {
          return;
        }
      }
      maxCameraY = cameraY = 0;
      bossCameraPan = false;
      cameraPanListener.panComplete();
      if (main.mode != this) return;
    }
    
    if (endingCameraPan) {
      if (cameraX > 512) {
        cameraX -= ENDING_PAN_CAMERA_SPEED;
        if (cameraX <= 512) {
          cameraX = 512;
          endingCameraPan = false;
          cameraPanListener.panComplete();
        } else {
          return;
        }
      } else {
        cameraX += ENDING_PAN_CAMERA_SPEED;
        if (cameraX >= 512) {
          cameraX = 512;
          endingCameraPan = false;
          cameraPanListener.panComplete();
        } else {
          return;
        }
      }
    }
    
    processTriggers();
    
    float maxBoundY = maxCameraY + REMOVE_BOUND;
    
    for(int i = 7; i >= 0; i--) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (!element.remove) {
          element.checkBounds(maxBoundY);
        }
        if (!element.remove) {
          element.update();
          if (element.changeLayer >= 0) {
            if (element.layer != element.changeLayer) {
              element.layer = element.changeLayer;
              list.remove(j);
              elements[element.layer].add(element);
            }
            element.changeLayer = -1;
          }
        }
        if (element.remove) {
          list.remove(j);
          if (element.enemy) {
            Enemy enemy = (Enemy)element;
            enemies.remove(enemy);
            if (enemy.solid) {
              solids.remove(enemy);
            }
            if (enemy.mine) {
              mines.remove(enemy);
            }
          }
        }
      }
    }
     
    if (playing) {
      player.update();
      // Player.update may synchronously replace this mode with Continue.
      if (main.mode != this) {
        return;
      }
      cameraTrackPlayer();
    }
    
    if (stageCompleted && stageCompletedDelay > 0 && (stageCompletedDelay > 1 || player.respawning == 0) && --stageCompletedDelay == 0) {
      main.startFade(true, this);    
    }    
  }
  
  private void drawBackground() {
    float xOffset = cameraX % 32;
    float yOffset = cameraY % 32;
    int xTile = (int)(cameraX / 32);
    int yTile = (int)(cameraY / 32);  
    int xStart = 32 + xTile == mapWidth ? 31 : 32;
    
    if (stageIndex > 0) {
      
      if (stageIndex == 2) {
        for(int i = 0; i < 4; i++) {
          tiles[i].setAlpha(WATER_ALPHAS[waterAlphaIndex]);
        }
        // tile sheet 2 (includes water rendering)
        for(int y = 30; y >= 0; y--) {   
          float Y = (y << 5) - yOffset;
          for(int x = xStart; x >= 0; x--) {
            int tile = tileMap[y + yTile][x + xTile];
            float X = (x << 5) - xOffset;            
            if (tile < 32) {
              int water = (((y + yTile) & 1) << 1) + ((x + xTile) & 1);
              main.draw(tiles[water + 4], X, Y);
              main.draw(tiles[water], X, Y);
            }
            if (tile < 225) {
              main.draw(tiles[tile], X, Y);
            }
          }
        }
      } else {
        // tile sheet [stage index]
        for(int y = 30; y >= 0; y--) { 
          float Y = (y << 5) - yOffset;
          for(int x = xStart; x >= 0; x--) {
            int tile = tileMap[y + yTile][x + xTile];
            if (tile < 225) {
              main.draw(tiles[tile], (x << 5) - xOffset, Y);
            }
          }
        }        
      }
      
      // tile sheet 6
      for(int y = 30; y >= 0; y--) { 
        float Y = (y << 5) - yOffset;
        for(int x = xStart; x >= 0; x--) {
          int tile = tileMap[y + yTile][x + xTile];
          if (tile >= 225) {
            main.draw(tiles[tile], (x << 5) - xOffset, Y);
          }
        }
      }
    } else {    
      
      // tile sheet [stage index]
      for(int y = 30; y >= 0; y--) {      
        for(int x = xStart; x >= 0; x--) {
          main.draw(tiles[tileMap[y + yTile][x + xTile]], 
              (x << 5) - xOffset, (y << 5) - yOffset);
        }
      }
    }
  }
  
  private void drawSprites() {
    GL11.glPushMatrix();    
    GL11.glTranslatef(-cameraX, -cameraY, 0); 

    for(int i = 0; i < 4; i++) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (!element.remove) {
          element.render();      
        }
      }
    }
    
    player.render();
        
    for(int i = 4; i < 8; i++) {
      ArrayList<GameElement> list = elements[i];
      for(int j = list.size() - 1; j >= 0; j--) {
        GameElement element = list.get(j);
        if (!element.remove) {
          element.render();      
        }      
      }
    }   
    
    GL11.glPopMatrix();
  }
  
  private void drawScore() {
    main.drawString("1P", 64, 804, Main.FONT_WHITE);
    main.drawString(main.scoreStr, 160, 804, Main.FONT_WHITE);
    main.drawString("P", 176, 868, Main.FONT_WHITE);
    main.drawString(main.extraLivesStr, 216, 868, Main.FONT_WHITE);
  }
  
  @Override
  public void render(GameContainer gc, Graphics g) throws SlickException {
    
    this.g = g;
    
    drawBackground();  
    drawSprites();
    
    if (playing) {
      drawScore();    
    }
  }
}
