// @ts-nocheck
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class JeepYeahFireRight {

  public static readonly STATE_GROWING: number = 0;
  public static readonly STATE_MOVING: number = 1;
  public static readonly STATE_SHRINKING: number = 2;
  public static readonly STATE_PAUSED: number = 3;

  public static readonly SPEED: number = 20;

  public static readonly ANGLE: number = -30;
  public static readonly RADIANS: number = ((JeepYeahFireRight.ANGLE) * Math.PI / 180);
  public static readonly rx: number = javaFloat(Math.cos(JeepYeahFireRight.RADIANS));
  public static readonly ry: number = javaFloat(Math.sin(JeepYeahFireRight.RADIANS));
  public static readonly vx: number = JeepYeahFireRight.SPEED * JeepYeahFireRight.rx;
  public static readonly vy: number = JeepYeahFireRight.SPEED * JeepYeahFireRight.ry;

  public static readonly MOVE_TIME: number = 1;
  public static readonly SHRINK_STEPS: number = javaInt((75 / JeepYeahFireRight.SPEED));
  public static readonly PAUSE_TIME: number = 3;

  public static readonly I_SHRINK_STEPS: number = 1 / JeepYeahFireRight.SHRINK_STEPS;

  public scale: number = 0;
  public state: number = 0;
  public x: number = 0;
  public y: number = 0;
  public delay: number = 0;

  public update(): void {
    switch(this.state) {
      case JeepYeahFireRight.STATE_GROWING:
        this.x += JeepYeahFireRight.SPEED;
        this.scale = this.x / 75;
        if (this.scale >= 1) {
          this.state = JeepYeahFireRight.STATE_MOVING;
          this.delay = JeepYeahFireRight.MOVE_TIME;
          this.x = 768;
          this.y = 437;
        }
        break;
      case JeepYeahFireRight.STATE_MOVING:
        this.x += JeepYeahFireRight.vx;
        this.y += JeepYeahFireRight.vy;
        if (--this.delay == 0) {
          this.state = JeepYeahFireRight.STATE_SHRINKING;
          this.delay = JeepYeahFireRight.SHRINK_STEPS;
        }
        break;
      case JeepYeahFireRight.STATE_SHRINKING:
        this.x += JeepYeahFireRight.vx;
        this.y += JeepYeahFireRight.vy;
        this.scale = JeepYeahFireRight.I_SHRINK_STEPS * this.delay;
        if (--this.delay == 0) {
          this.state = JeepYeahFireRight.STATE_PAUSED;
          this.delay = JeepYeahFireRight.PAUSE_TIME;
        }
        break;
      case JeepYeahFireRight.STATE_PAUSED:
        if (--this.delay == 0) {
          this.state = JeepYeahFireRight.STATE_GROWING;
          this.x = 0;
          this.scale = 0;
        }
        break;
    }
  }

  public render(main: any): void {
    switch(this.state) {
      case JeepYeahFireRight.STATE_GROWING:
        main.drawRotatedScaled(main.gunFires[0], 768, 437, 0, -18, JeepYeahFireRight.ANGLE,
            this.scale, 1);
        break;
      case JeepYeahFireRight.STATE_MOVING:
        main.drawRotated(main.gunFires[0], this.x, this.y, 0, -18, JeepYeahFireRight.ANGLE);
        break;
      case JeepYeahFireRight.STATE_SHRINKING:
        main.drawRotatedScaled(main.gunFires[0], this.x, this.y, 0, -18, JeepYeahFireRight.ANGLE,
            this.scale, 1);
        break;
    }
  }
}
