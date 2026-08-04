// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/Column.java.
// Original Java imports: java.util.ArrayList.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
export class Column extends Enemy {  public constructor(...args: any[]) {
    super();
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
        let x = args[0];
        let y = args[1];
            this.x = x;
                this.y = y;
    
                this.player = this.gameMode.player;
    
                let X = (x) >> 5;
                let Y = (y) >> 5;
              
                this.groupIndex = this.gameMode.groupsMap[Y][X];
    
                this.canDropLeft = !(this.gameMode.isSolidTile(X - 3, Y + 3)
                    || this.gameMode.isSolidTile(X - 3, Y + 4)
                    || this.gameMode.isSolidTile(X - 3, Y + 14));
                this.canDropRight = !(this.gameMode.isSolidTile(X + 4, Y + 3)
                    || this.gameMode.isSolidTile(X + 4, Y + 4)
                    || this.gameMode.isSolidTile(X + 4, Y + 14));
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }
  
  public static readonly STATE_HIDDEN: number = 0;
  public static readonly STATE_TIPPING: number = 1;
  public static readonly STATE_ROLLING: number = 2;
  public static readonly STATE_STATIONARY: number = 3;
  
  public static readonly ROTATION_SPEED: number = 0.6;
  
  public static readonly TRAP_X1: number = -3 * 32;
  public static readonly TRAP_Y1: number = 8 * 32;
  public static readonly TRAP_X2: number = 5 * 32;
  public static readonly TRAP_Y2: number = 16 * 32;
  
  public static readonly GRAVITY: number = 0.1;
  public static readonly TIP_VX: number = 2.5;
  public static readonly TIP_ANGLE_INC: number = 2;
  public static readonly ROLL_VY: number = 6;
  public static readonly ROLL_DISTANCE: number = 10 * 32;
  public static readonly ROLL_STEPS: number = 91;
  public static readonly ROLL_ACCELERATION: number = 2 * (Column.ROLL_DISTANCE - Column.ROLL_VY * Column.ROLL_STEPS) 
          / (Column.ROLL_STEPS * Column.ROLL_STEPS);
  
  public rotationOffset: number = 27.933975;
  public left: boolean = false;
  public state: number = Column.STATE_HIDDEN;
  public player: any = null as any;
  public groupIndex: number = 0;
  public angle: number = -90;
  public vx: number = 0;
  public vy: number = 0;
  public angleInc: number = 0;
  public tipSteps: number = (90 / Column.TIP_ANGLE_INC);
  public canDropLeft: boolean = false;
  public canDropRight: boolean = false;
  public mines: any = null as any;

  

  public init(): void {
    super.init();
    
    this.mines = this.gameMode.mines;
    
    this.layer = 4;
    
    this.hitX1 = 0;
    this.hitY1 = 0;
    this.hitX2 = 64;
    this.hitY2 = 92;
    
    this.solid = true;
    this.solidX1 = 0;
    this.solidY1 = 0;
    this.solidX2 = 64;
    this.solidY2 = 92;
    
    this.mine = true;
    this.mineX1 = Column.TRAP_X1;
    this.mineY1 = Column.TRAP_Y1;
    this.mineX2 = Column.TRAP_X2;
    this.mineY2 = Column.TRAP_Y2;    
    
    this.points = 500;
    this.bulletHits = 7;
  }
  
  private rollOverEnemies(): void {
    for(let i = this.mines.size() - 1; i >= 0; i--) {
      let mine = this.mines.get(i);
      if (mine != this && mine.isMine(this.x + this.mineX1, this.y + this.mineY1, 
          this.x + this.mineX2, this.y + this.mineY2)) {
        mine.flatten();
      }
    }    
  }  

  public flatten(): void {
    if (this.state == Column.STATE_STATIONARY) {
      this.explode();
    }
  }  

  public update(): void {
    switch(this.state) {
      case Column.STATE_HIDDEN:        
        break;      
      case Column.STATE_TIPPING:
        this.vy += Column.GRAVITY;
        this.x += this.vx;
        this.y += this.vy;  
        this.angle += this.angleInc;  
        if (--this.tipSteps == 0) {
          this.startRolling();
        }
        break;
      case Column.STATE_ROLLING:
        this.vy += Column.ROLL_ACCELERATION;        
        if (this.vy <= 0) {
          this.stopRolling();
        }
        this.y += this.vy;
        this.rotationOffset += Column.ROTATION_SPEED * this.vy;
        if (this.rotationOffset >= 56) {
          this.rotationOffset -= 56;
        }        
        this.rollOverEnemies();
        break;
    }
  }
  
  private startRolling(): void {
    this.state = Column.STATE_ROLLING;
    this.vy = Column.ROLL_VY;
    
    this.hitX1 = -46;
    this.hitY1 = -28;
    this.hitX2 = 46;
    this.hitY2 = 28;
    
    this.mineX1 = -38;
    this.mineY1 = -20;
    this.mineX2 = 38;
    this.mineY2 = 20;
    
    this.solidX1 = -46;
    this.solidY1 = -28;
    this.solidX2 = 46;
    this.solidY2 = 28;
  }
  
  private stopRolling(): void {
    this.state = Column.STATE_STATIONARY;
    this.changeLayer(3);
  }
  
  private startTipping(attacked: any): void {
    
    if (!attacked) {
      if (this.canDropLeft && this.canDropRight) {
        if (this.player.x < this.x + 32) { 
          if (!(this.player.targetAngle <=90||this.player.targetAngle>= 270)) {
            return;
          }
        } else if (this.player.targetAngle <=90||this.player.targetAngle>= 270) {
          return;
        }
      } else if (this.canDropLeft) {
        if (this.player.x < this.x + 32 || this.player.targetAngle <= 90 
            || this.player.targetAngle >= 270) {
          return;
        }
      } else {
        if (this.player.x > this.x + 32 || !(this.player.targetAngle <= 90 
            || this.player.targetAngle >= 270)) {
          return;
        }
      }
    }
    
    this.state = Column.STATE_TIPPING;
    this.main.playHitExplodeSound(); 
    new Explosion(this.x + 32, this.y + 48);
    this.gameMode.triggerGroup(this.groupIndex);
    
    this.x += 32;
    this.y += 46;
    
    if (this.canDropLeft && this.canDropRight) {
      if (this.main.random.nextInt(7) == 3) {
        this.left = this.main.random.nextBoolean();
      } else if (this.main.random.nextInt(3) == 1) {
        this.left = this.player.x < this.x;
      } else {
        this.left = this.player.x > this.x;
      }
    } else {
      this.left = this.canDropLeft;
    }    
    
    if (this.left) {
      this.vx = -Column.TIP_VX;
      this.vy = 0;
      this.angleInc = -Column.TIP_ANGLE_INC;
    } else {
      this.vx = Column.TIP_VX;
      this.vy = 0;
      this.angleInc = Column.TIP_ANGLE_INC;
    }
    
    this.hitX1 = -28;
    this.hitY1 = -28;
    this.hitX2 = 28;
    this.hitY2 = 28;
    
    this.mineX1 = -20;
    this.mineY1 = -20;
    this.mineX2 = 20;
    this.mineY2 = 20;
    
    this.solidX1 = -28;
    this.solidY1 = -28;
    this.solidX2 = 28;
    this.solidY2 = 28;    
  }

  // returns true if attack successful
  public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
    if (this.state == Column.STATE_HIDDEN) {
      if (attackSource < AttackSource.PLAYER_EXPLOSION 
          && this.hit(x1, y1, x2, y2)) {
        this.startTipping(true);
        return true;  
      }      
    } else {
      if ((attackSource == AttackSource.PLAYER_WEAPON 
            || (this.state == Column.STATE_STATIONARY 
                && attackSource == AttackSource.TRAVELING_EXPLOSION))
          && this.hit(x1, y1, x2, y2)) {
        this.remove();
        new Explosion(this.x, this.y);
        this.main.addPoints(this.points);
        return true;
      }
    } 
    return false;
  }  

  // returns true if player bullet was absorbed by enemy
  public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
    if (this.state == Column.STATE_HIDDEN) {
      return false;
    }
    return super.bulletAttack(x1, y1, x2, y2);
  }

  // returns true if player bumped into the enemy
  public bump(x1: any, y1: any, x2: any, y2: any, invincible: any): boolean {  
    
    if (this.state == Column.STATE_HIDDEN) {
      if (this.gameMode.cameraY < this.y && this.isMine(x1, y1, x2, y2)) {        
        this.startTipping(false);
      }
    } else {
      if (this.isMine(x1, y1, x2, y2)) {
        this.remove();
        new Explosion(this.x, this.y);
        this.main.addPoints(this.points);
        return invincible ? false : true;
      } 
    }
    return false;
  }  

  public render(): void {
    switch(this.state) {
      case Column.STATE_HIDDEN:
        break;
      case Column.STATE_TIPPING:
        this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle);
        break;
      case Column.STATE_ROLLING:      
        this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle);        
        if (this.left) {
          this.gameMode.g.setWorldClip(this.x - 22, this.y - 23, 56, 48);
          this.main.draw(this.main.columns[1], this.x - 46, this.y - 84 + this.rotationOffset);
          this.main.draw(this.main.columns[1], this.x - 46, this.y - 28 + this.rotationOffset);    
          this.gameMode.g.clearWorldClip();
        } else {   
          this.gameMode.g.setWorldClip(this.x - 31, this.y - 25, 56, 48);
          this.main.draw(this.main.columns[0], this.x - 46, this.y - 84 + this.rotationOffset);
          this.main.draw(this.main.columns[0], this.x - 46, this.y - 28 + this.rotationOffset);   
          this.gameMode.g.clearWorldClip();
        }        
        break;
      case Column.STATE_STATIONARY:
        this.main.drawRotated(this.main.columns[0], this.x, this.y, this.angle); 
        break;
    }
  }  
}
