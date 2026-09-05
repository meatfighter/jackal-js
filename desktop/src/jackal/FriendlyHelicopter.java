package jackal;

import org.newdawn.slick.Image;

public class FriendlyHelicopter extends GameElement {
  
  public static final int DROP_OFF_DELAY = 91;
  public static final float FLIGHT_SPEED = 6f;
  public static final int ACCELERATION_TIME = 45;
  public static final float ACCELERATION = FLIGHT_SPEED / ACCELERATION_TIME;
  public static final int TAKE_OFF_DELAY = 91 * 2;
  public static final float TURN_RADIUS1 = 192;
  public static final float TURN_RADIUS2 = 192;
  public static final int TURNS_LENGTH;
  public static final int INITIAL_PLANE_SPAWN_DELAY = 3 * 91;
  public static final int PLANE_SPAWN_DELAY = 10 * 91;
  
  public static final int STATE_PICK_UP = 0;
  public static final int STATE_REVVING_UP = 1;
  public static final int STATE_LIFTING_OFF = 2;
  public static final int STATE_ACCELERATING = 3;
  public static final int STATE_TURNING = 4;
  public static final int STATE_FLYING_AWAY = 5;
  public static final int STATE_FLYING_TOWARD = 6;
 
  private static final float Z_GROUND = 1;
  private static final float Z_SKY = 0;
  
  private static final float Y0 = 128f;
  private static final float Y1 = 116f;
  private static final float K1 = Y1 / Y0;
  private static final float Z0 = K1 / (K1 - 1f);  
  
  private static final float SHADOW_Y0 = 36;
  private static final float SHADOW_K = (Y1 - SHADOW_Y0) / SHADOW_Y0;
  
  private static final float[] HEIGHTS = new float[91];
  private static final float[][] TURNS; 
  
  static {
    
    for(int i = 0; i < 91; i++) {
      HEIGHTS[i] = 0.5f * (1f + (float)Math.cos(Math.PI * i / 91.0));
    }
    
    int turn1Steps = (int)Math.ceil(
        2 * Math.PI * (45f / 360f) * TURN_RADIUS1 / FLIGHT_SPEED);
    int turn2Steps = (int)Math.ceil(
        2 * Math.PI * (225f / 360f) * TURN_RADIUS2 / FLIGHT_SPEED);
    TURNS_LENGTH = turn1Steps + turn2Steps;
    TURNS = new float[TURNS_LENGTH][3]; // (x, y, angle)
    
    for(int i = 0; i < turn1Steps; i++) {
      float percent = i / (float)turn1Steps;
      float helicopterAngle = 45f * percent;
      float angle = percent * (float)(Math.PI / 4); 
      float X = TURN_RADIUS1 - TURN_RADIUS1 * (float)Math.cos(angle);
      float Y = TURN_RADIUS1 * (float)-Math.sin(angle);
      TURNS[i][0] = X;
      TURNS[i][1] = Y;
      TURNS[i][2] = helicopterAngle;
    }
    
    float distance = TURN_RADIUS1 + TURN_RADIUS2;
    float k = 1f / (float)Math.sqrt(2);
    float centerX = TURN_RADIUS1 - k * distance;
    float centerY = -k * distance;
    
    for(int i = 0; i < turn2Steps; i++) {
      float percent = i / (float)turn2Steps;
      float helicopterAngle = 45f - 225f * percent;
      float angle = (float)(Math.PI / 4 - Math.PI * 1.25 * percent);
      float X = centerX + TURN_RADIUS2 * (float)Math.cos(angle);
      float Y = centerY + TURN_RADIUS2 * (float)Math.sin(angle);
      
      TURNS[turn1Steps + i][0] = X;
      TURNS[turn1Steps + i][1] = Y;
      TURNS[turn1Steps + i][2] = helicopterAngle;
    }
  }
  
  public float angle;
  public float rotorAngle;
  public float rotorSpeed;
  public boolean slowRotor;
  public float z;
  public boolean leftStop;
  public int state;
  public int walkingSoldiers;
  public Player player;
  public int dropOffDelay = 45;
  public int preparingToTakeOff = TAKE_OFF_DELAY;
  public int revvingUp;
  public int liftingOff;
  public int accelerating;
  public int turning;
  public int planeSpawnDelay = INITIAL_PLANE_SPAWN_DELAY;
  public float turnX;
  public float turnY;
  public boolean createdPlane;
  
  public FriendlyHelicopter(float x, float y, 
      boolean landing, boolean leftStop) {
    
    this.x = x;
    this.y = y;
    this.player = gameMode.player;
    this.leftStop = leftStop;
    
    if (landing) {
      slowRotor = false;
      z = 0;
      state = STATE_FLYING_TOWARD;
      rotorSpeed = 30;
      changeLayer(7);
    } else {
      slowRotor = true;
      z = 1;
      state = STATE_PICK_UP;
      rotorSpeed = 15;
    }
  }

  @Override
  public void init() {
    layer = 3;
  }
  
  @Override
  public void remove() {
    remove = true;
    main.stopSound(main.helicopterSound2);
  }  
  
  @Override
  public void update() {
    
    rotorAngle -= rotorSpeed;
    if (rotorAngle <= -360) {
      rotorAngle += 360;
    }
    
    if (state >= STATE_ACCELERATING) {
      main.playSoundIfNotPlaying(main.helicopterSound2);
    }    
    
    switch(state) {
      case STATE_PICK_UP: {
        if (player.pows > 0) {
          float dx = player.x - x;
          
          if (Math.abs(player.y - y) <= 128) {
            if (--planeSpawnDelay == 0) {              
              planeSpawnDelay = PLANE_SPAWN_DELAY;
              if (gameMode.stageIndex == 5) {
                new EnemyHelicopter(true);
              } else if (gameMode.stageIndex == 4) {
                new Airplane(leftStop);
              } else if (gameMode.stageIndex == 1) {
                if (!createdPlane) {
                  createdPlane = true;
                  new Airplane(leftStop);
                }                
              }
            }            
          }
          
          if (player.y > y - 66 && player.y < y + 49 
              && ((!leftStop && dx > 0 && dx < 320) 
                  || (leftStop && dx < 0 && dx > -320))) {
            if (dropOffDelay > 0) {
              dropOffDelay--;
            } else {
              dropOffDelay = DROP_OFF_DELAY;
              new FriendlySoldier(player.x, player.y + 28, this,
                  player.pows == 1);
              player.dropOffPOW();
              walkingSoldiers++;
            } 
          }
        }
        if (walkingSoldiers == 0 && player.y < y + 80
            && ((FriendlySoldier.count == 0 && player.pows == 0) 
                || player.y < y - 512)) {
          if (preparingToTakeOff > 0) {
            preparingToTakeOff--;
          } else {
            state = STATE_REVVING_UP;            
          }
        } else {
          preparingToTakeOff = TAKE_OFF_DELAY;
        }
        break;
      }
      case STATE_REVVING_UP:        
        rotorSpeed = 15f + 15f * revvingUp / 90f;
        if (revvingUp >= 45) {
          slowRotor = false;
          changeLayer(7);
        }
        if (++revvingUp == 91) {
          rotorSpeed = 30f;
          state = STATE_LIFTING_OFF;
        }
        break;
      case STATE_LIFTING_OFF:
        if (liftingOff < 91) {
          z = HEIGHTS[liftingOff];
        } else {
          z = 0;
        }
        if (++liftingOff == 114) {
          state = STATE_ACCELERATING;
        }
        break;
      case STATE_ACCELERATING:
        y -= accelerating * ACCELERATION;
        if (++accelerating == ACCELERATION_TIME) {
          state = STATE_TURNING;
          turnX = x;
          turnY = y;
        }
        break;
      case STATE_TURNING:
        x = turnX + TURNS[turning][0];
        y = turnY + TURNS[turning][1];
        angle = TURNS[turning][2];
        if (++turning == TURNS_LENGTH) {
          state = STATE_FLYING_AWAY;
          angle = -180;
        }
        break;
      case STATE_FLYING_AWAY:
        y += FLIGHT_SPEED;
        if (y > gameMode.cameraY + Main.DISPLAY_HEIGHT + 128) {
          remove();
        }
        break;
      case STATE_FLYING_TOWARD:
        y -= FLIGHT_SPEED;
        if (y < gameMode.cameraY - 128) {
          remove();
        }        
        break;
    }
  }
  
  public void friendlySoldierPickedUp() {    
    walkingSoldiers--;
    if (!main.friendlySoldierPickedUp()) {
      main.playSound(main.helicopterPickupSound);
    }
  }

  @Override
  public void render() {       
    Image blade = null;
    int offset = 0;
    if (slowRotor) {
      blade = main.friendlyHelicopters[2];
      offset = -9;
    } else {
      blade = main.friendlyHelicopters[3];
      offset = -14;      
    }
        
    if (z < 1) {
      float s0 = 1 + SHADOW_K * z;
      float s1 = 1 - z;
      main.drawRotated(main.friendlyHelicopters[1], 
          x + 32 * s1, y + 37 * s1, -10, -18, angle, s0, 1 - z);
    }
    
    float scale = Z0 / (Z0 - z);    
    main.drawRotated(main.friendlyHelicopters[0], x, y, -36, -60, angle, scale);
    main.drawRotated(blade, x, y, 0, offset, rotorAngle, scale);
    main.drawRotated(blade, x, y, 0, offset, rotorAngle + 90, scale);
    main.drawRotated(blade, x, y, 0, offset, rotorAngle + 180, scale);
    main.drawRotated(blade, x, y, 0, offset, rotorAngle + 270, scale);
  }
}
