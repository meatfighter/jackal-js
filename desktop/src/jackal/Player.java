package jackal;

import java.awt.geom.*;
import java.util.*;

public class Player {
  
  public static final float SPEED = 2.5f;
  public static final int ANGLE_STEPS = 8;
  public static final float ANGLE_VELOCITY = 45f / ANGLE_STEPS; 
  public static final int DIAGONAL_DELAY = 4;
  public static final int GUN_ARMED_DELAY = 45;
  public static final int RESPAWN_DELAY = 91 * 2;
  public static final int INVINCIBLE_DELAY = 91 * 3;
  
  public static final int SENSOR_X = 32;
  public static final int SENSOR_Y = 16;
  public static final int SENSOR_D_X0;
  public static final int SENSOR_D_X1;
  public static final int SENSOR_D_X2;
  public static final int SENSOR_D_Y0;
  public static final int SENSOR_D_Y1;
  public static final int SENSOR_D_Y2;
  
  public static final int RUMBLE_STEPS = 85;
  public static final float[] RUMBLE = new float[RUMBLE_STEPS];
  public static final float[] WAKE_ALPHAS = new float[RUMBLE_STEPS];
  
  static {
    for(int i = 0; i < RUMBLE_STEPS; i++) {
      float angle = (float)((12 * Math.PI * i) / RUMBLE_STEPS);
      WAKE_ALPHAS[i] = 0.5f + 0.5f * (float)Math.sin(angle);
      RUMBLE[i] = 1.6f * (float)Math.sin(angle);
    }
    
    Point2D.Float p0 = Main.rotate(
        SENSOR_X + SPEED, 0, (float)(Math.PI / 4));
    Point2D.Float p1 = Main.rotate(
        SENSOR_X + SPEED, SENSOR_Y, (float)(Math.PI / 4));
    Point2D.Float p2 = Main.rotate(
        SENSOR_X + SPEED, -SENSOR_Y, (float)(Math.PI / 4));
    
    SENSOR_D_X0 = (int)p0.x;
    SENSOR_D_Y0 = (int)p0.y;
    SENSOR_D_X1 = (int)p1.x;
    SENSOR_D_Y1 = (int)p1.y;
    SENSOR_D_X2 = (int)p2.x;
    SENSOR_D_Y2 = (int)p2.y;
  }
  
  private Main main;
  private GameMode gameMode;
  private IInput input;
  public ArrayList<Enemy> mines;
  
  public float x = 512;
  public float y = 480;  
  public int angle = 270;
  public int nextAngle = angle;
  public float displayAngle = angle;
  public float angleVelocity = 0;
  public int angleSteps = 0;
  public int diagonalDelay = 0;
  public int targetAngle = 0;
  public int lastTargetAngle = angle;
  public int fireAngle = angle;
  public int rumble = 0;
  public int invincible = 0;
  public int invincibleColor = 0;
  public boolean weaponArmed = true;
  public int gunArmed = 0;
  public boolean fireReleased;
  public boolean shootReleased; 
  public boolean longRange;
  public int respawning;
  public int pows;
  public int releaseablePows;
  public boolean inSwamp;  
  
  public Player() {
    main = Main.main;
    gameMode = Main.gameMode;    
    input = main.input;
    mines = gameMode.mines;
  }
  
  public void setWeaponArmed(boolean weaponArmed) {
    this.weaponArmed = weaponArmed;
  }
  
  public void pickUpFlashingSoldier() {
    pows++;    
    main.upgradeWeapon(true);    
  }
  
  public void collectPOW() {
    pows++;
    releaseablePows++;
    main.playSound(main.pickupSound);
  }
  
  public void dropOffPOW() {
    pows--;
    if (pows < releaseablePows) {
      releaseablePows = pows;
    }
  }
  
  public void explode() {
    if (gameMode.stageCompleted || !gameMode.playing) {
      return;
    }
    registerDeath();
  }

  private void registerDeath() {
    if (respawning > 0) {
      return;
    }
    main.playSound(main.playerExplodeSound);   
    if (main.extraLives == 0) {      
      main.suspendMusicForLastLife();
    }
    new Explosion(x, y, true);
    
    if (releaseablePows > 1) {
      boolean weaponCarrier = main.hasMissiles && main.random.nextInt(5) == 3;
      if (weaponCarrier) {
        releaseablePows++;
      }
      int release = releaseablePows - 2;
      if (release > 3) {
        release = 3;
      }
      for(int i = release; i >= 0; i--) {
        new FriendlySoldier(x, y, 
            weaponCarrier && i == 0 
                ? FriendlySoldierType.WEAPON_CARRIER_WANDERER 
                : FriendlySoldierType.WANDERER);
      }
    }
    pows = 0;
    releaseablePows = 0;    
    main.missilePower = 0;
    main.hasMissiles = false;    
    respawning = RESPAWN_DELAY;    
  }
  
  public boolean attack(float x1, float y1, float x2, float y2) {
    
    if (respawning == 0 && invincible == 0             
        && x1 <= x + 32 && x2 >= x - 32 && y1 <= y + 32 && y2 >= y - 32) {
      explode();      
      return true;
    } else {
      return false;
    }
  }  
  
  public boolean attack(float x, float y) {
    if (respawning == 0 && invincible == 0 
        && x >= this.x - 32 && x <= this.x + 32 
        && y >= this.y - 32 && y <= this.y + 32) {
      explode();      
      return true;
    } else {
      return false;
    }
  }
  
  public void collectFlashingStar() {
    main.playSound(main.weaponUpgradeSound);
    main.hasMissiles = true;
    main.missilePower = 2;
  }
  
  public float getSpeed() {
    return inSwamp ? 0.5f * SPEED : SPEED;
  }
  
  public void makeInvincible() {
    invincible = INVINCIBLE_DELAY;
  }
  
  public void update() {
    
    int tileType = gameMode.getTileType(x, y);
    inSwamp = tileType == GameMode.TYPE_SWAMP;
    float speed = getSpeed();
    
    if (respawning > 0) {
      if (main.extraLives > 0) {
        main.resumeMusicAfterLastLife();
      }
      if (--respawning == 0) {
        if (main.extraLives > 0) {
          main.loseLife();
          invincible = INVINCIBLE_DELAY;
        } else {
          main.konamiCode.enabled = false;
          main.requestMode(Modes.CONTINUE, gameMode.gc);
          // Continue owns the presentation; this outgoing Player must stop now.
          return;
        }       
      } else {
        return;
      }
    }
    
    if (tileType == GameMode.TYPE_CONVEYOR) {
      final float Y = y + SENSOR_X + SPEED;
      if (gameMode.isDriveable(x, Y)
          && gameMode.isDriveable(x - SENSOR_Y, Y)
          && gameMode.isDriveable(x + SENSOR_Y, Y)) {
        y += gameMode.conveyorDelta;
      }
    }
    
    targetAngle = -1;
    if (input.isDown() && input.isRight()) {
      // 45        
      fireAngle = targetAngle = 45;
      lastTargetAngle = targetAngle;
      diagonalDelay = DIAGONAL_DELAY;
      
      if (gameMode.isDriveable(x + SENSOR_D_X0, y + SENSOR_D_Y0)
          && gameMode.isDriveable(x + SENSOR_D_X1, y + SENSOR_D_Y1)
          && gameMode.isDriveable(x + SENSOR_D_X2, y + SENSOR_D_Y2)) {
        x += speed;
        y += speed;
      }      
    } else if (input.isDown() && input.isLeft()) {
      // 135      
      fireAngle = targetAngle = 135;
      lastTargetAngle = targetAngle;
      diagonalDelay = DIAGONAL_DELAY;
      
      if (gameMode.isDriveable(x - SENSOR_D_X0, y + SENSOR_D_Y0)
          && gameMode.isDriveable(x - SENSOR_D_X1, y + SENSOR_D_Y1)
          && gameMode.isDriveable(x - SENSOR_D_X2, y + SENSOR_D_Y2)) {
        x -= speed;
        y += speed;
      }            
    } else if (input.isUp() && input.isLeft()) {
      // 225      
      fireAngle = targetAngle = 225;
      lastTargetAngle = targetAngle;
      diagonalDelay = DIAGONAL_DELAY;
      
      if (gameMode.isDriveable(x - SENSOR_D_X0, y - SENSOR_D_Y0)
          && gameMode.isDriveable(x - SENSOR_D_X1, y - SENSOR_D_Y1)
          && gameMode.isDriveable(x - SENSOR_D_X2, y - SENSOR_D_Y2)) {
        x -= speed;
        y -= speed;
      }
    } else if (input.isUp() && input.isRight()) {
      // 315
      fireAngle = targetAngle = 315;
      lastTargetAngle = targetAngle;
      diagonalDelay = DIAGONAL_DELAY;
      
      if (gameMode.isDriveable(x + SENSOR_D_X0, y - SENSOR_D_Y0)
          && gameMode.isDriveable(x + SENSOR_D_X1, y - SENSOR_D_Y1)
          && gameMode.isDriveable(x + SENSOR_D_X2, y - SENSOR_D_Y2)) {
        x += speed;
        y -= speed;
      }
    } else if (input.isRight()) {
      // 0
      fireAngle = 0;
      if ((lastTargetAngle == 45 || lastTargetAngle == 315)
          && diagonalDelay > 0) {
        diagonalDelay--;
      } else {        
        targetAngle = 0;
        lastTargetAngle = targetAngle;
        diagonalDelay = 0;
        
        final float X = x + SENSOR_X + SPEED;
        if (gameMode.isDriveable(X, y)
            && gameMode.isDriveable(X, y - SENSOR_Y)
            && gameMode.isDriveable(X, y + SENSOR_Y)) {
          x += speed;
        }
      }
    } else if (input.isDown()) {
      // 90
      fireAngle = 90;
      if ((lastTargetAngle == 45 || lastTargetAngle == 135)
          && diagonalDelay > 0) {
        diagonalDelay--;
      } else {
        targetAngle = 90;
        lastTargetAngle = targetAngle;
        diagonalDelay = 0;
        
        final float Y = y + SENSOR_X + SPEED;
        if (gameMode.isDriveable(x, Y)
            && gameMode.isDriveable(x - SENSOR_Y, Y)
            && gameMode.isDriveable(x + SENSOR_Y, Y)) {
          y += speed;
        }
      }
    } else if (input.isLeft()) {
      // 180
      fireAngle = 180;
      if ((lastTargetAngle == 135 || lastTargetAngle == 225)
          && diagonalDelay > 0) {
        diagonalDelay--;
      } else {
        targetAngle = 180;
        lastTargetAngle = targetAngle;
        diagonalDelay = 0;
        
        final float X = x - SENSOR_X - SPEED;
        if (gameMode.isDriveable(X, y)
            && gameMode.isDriveable(X, y - SENSOR_Y)
            && gameMode.isDriveable(X, y + SENSOR_Y)) {
          x -= speed;
        }
      }
    } else if (input.isUp()) {
      // 270
      fireAngle = 270;
      if ((lastTargetAngle == 225 || lastTargetAngle == 315)
          && diagonalDelay > 0) {
        diagonalDelay--;
      } else {
        targetAngle = 270;
        lastTargetAngle = targetAngle;
        diagonalDelay = 0;
        
        final float Y = y - SENSOR_X - SPEED;
        if (gameMode.isDriveable(x, Y)
            && gameMode.isDriveable(x - SENSOR_Y, Y)
            && gameMode.isDriveable(x + SENSOR_Y, Y)) {
          y -= speed;
        }        
      }
    } else {
      diagonalDelay = 0;
    }
    
    if (y > gameMode.maxCameraY + 928) {
      y = gameMode.maxCameraY + 928;
    }
    
    if (angleSteps > 0) {
      if (--angleSteps == 0) {
        angle = nextAngle;
        displayAngle = nextAngle;
      } else {
        displayAngle += angleVelocity; 
      }      
    }
    
    if (angleSteps == 0 
        && targetAngle != -1 && targetAngle != angle) {      
      angleSteps = ANGLE_STEPS;
      if (targetAngle == 0) {
        if (angle >= 180) {
          nextAngle = angle + 45;
          if (nextAngle == 360) {
            nextAngle = 0;
          }
          angleVelocity = ANGLE_VELOCITY;
        } else {          
          nextAngle = angle - 45;
          angleVelocity = -ANGLE_VELOCITY;
        }
      } else if (targetAngle == 180) {
        if (angle > 180) {          
          nextAngle = angle - 45;
          angleVelocity = -ANGLE_VELOCITY;
        } else if (angle == 0) {
          nextAngle = 315;
          angleVelocity = -ANGLE_VELOCITY;
        } else {
          nextAngle = angle + 45;
          angleVelocity = ANGLE_VELOCITY;
        }
      } else if (targetAngle > 180) {
        if (angle < targetAngle && angle >= targetAngle - 180) {
          nextAngle = angle + 45;
          angleVelocity = ANGLE_VELOCITY;
        } else {          
          nextAngle = angle - 45;
          angleVelocity = -ANGLE_VELOCITY;
        }
      } else {
        if (angle > targetAngle && angle <= targetAngle + 180) {
          nextAngle = angle - 45;
          angleVelocity = -ANGLE_VELOCITY;
        } else {
          nextAngle = angle + 45;
          angleVelocity = ANGLE_VELOCITY;
        }
      }
      if (nextAngle == -45) {        
        nextAngle = 315;
      } else if (nextAngle == 360) {
        nextAngle = 0;
      }
    } 
    
    if (targetAngle != -1 && !gameMode.bossCameraPan
        && !gameMode.endingCameraPan && gameMode.playing 
        && !gameMode.paused
        && ++rumble == RUMBLE_STEPS) {
      rumble = 0;
    }
    
    if (invincible > 0) {
      invincible--;
    }
        
    if (input.isFire()) { 
      if (fireReleased && weaponArmed) {
        fireReleased = false;
        weaponArmed = false;
        if (targetAngle == -1 && angleSteps == 0) {
          fireAngle = angle;
        }
        if (main.hasMissiles) {          
          new PlayerMissile(x, y, fireAngle, main.missilePower);
        } else {
          new Grenade(x, y, fireAngle);
        }        
      }
    } else {
      fireReleased = true;
    }
    
    if (gunArmed > 0) {
      gunArmed--;
    }
    if (input.isShoot()) {
      if (shootReleased || gunArmed == 0) { 
        new PlayerBullet(x, y);
        gunArmed = GUN_ARMED_DELAY;
      }
      shootReleased = false;
    } else {
      shootReleased = true;
      gunArmed = 0;
    }
    
    boolean invincible = this.invincible > 0;
    float xMargin = 32;
    float yMargin = 32;
    if (angle == 0 || angle == 180) {
      xMargin = 48;
    } else if (angle == 90 || angle == 270) {
      yMargin = 46;
    }
    for(int i = mines.size() - 1; i >= 0; i--) {
      Enemy mine = mines.get(i);
      boolean acceptedBeforeCallback = respawning == 0 && !invincible && gameMode.playing && !gameMode.stageCompleted;
      if (mine.bump(x - xMargin, y - yMargin, 
          x + xMargin, y + yMargin, invincible)) {
        if (!invincible) {
          if (acceptedBeforeCallback) registerDeath();
          break;
        }
      }
    }
  }
  
  public void render() {
    if (respawning != 0) {
      return;
    }

    float renderX = (float)Math.floor(x);
    float renderY = (float)Math.floor(y);

    if (invincible > 0) {
      if (!gameMode.paused && ++invincibleColor == 4) {
        invincibleColor = 0;
      }
    } else {
      invincibleColor = 0;
    }

    if (inSwamp && targetAngle != -1 && angleSteps == 0) {
      switch(nextAngle) {
        case 0:
        case 360:
          main.draw(main.playerWakes[0], renderX - 37, renderY - 43, WAKE_ALPHAS[rumble]);
          break;
        case 45:
          main.drawRotatedAlpha(main.playerWakes[4], renderX - 8, renderY - 2, 90, WAKE_ALPHAS[rumble]);
          break;
        case 90:
          main.draw(main.playerWakes[3], renderX - 52, renderY - 31, WAKE_ALPHAS[rumble]);
          break;
        case 135:
          main.drawRotatedAlpha(main.playerWakes[5], renderX + 8, renderY + 2, -90, WAKE_ALPHAS[rumble]);
          break;
        case 180:
          main.draw(main.playerWakes[1], renderX - 27, renderY - 43, WAKE_ALPHAS[rumble]);
          break;
        case 225:
          main.draw(main.playerWakes[5], renderX - 42, renderY - 36, WAKE_ALPHAS[rumble]);
          break;
        case 270:
          main.draw(main.playerWakes[2], renderX - 52, renderY - 31, WAKE_ALPHAS[rumble]);
          break;
        case 315:
          main.draw(main.playerWakes[4], renderX - 49, renderY - 36, WAKE_ALPHAS[rumble]);
          break;
      }
    }

    main.drawVehicle(main.players[invincibleColor], renderX, renderY + RUMBLE[rumble], displayAngle);
  }
}
