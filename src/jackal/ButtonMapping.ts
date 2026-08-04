// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/ButtonMapping.java.
// Original Java imports: org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Log, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Character, Class, Collections, DataInputStream, HashMap, Integer, JAVA_LONG_LOW_3_BITS, JAVA_LONG_PACKED_3BIT_SHIFTS, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray, javaByte, javaChar, javaDouble, javaFloat, javaInt, javaIntDiv, javaLong, javaRoundFloat, javaShort, rotatePoint } from "../java/JavaRuntime.js";
export class ButtonMapping {
  
  public keyUp: number = Input.KEY_UP;
  public keyDown: number = Input.KEY_DOWN;
  public keyLeft: number = Input.KEY_LEFT;
  public keyRight: number = Input.KEY_RIGHT;
  public keyGrenade: number = Input.KEY_X;
  public keyGun: number = Input.KEY_Z;
  
  public controller: boolean = false;
  public controllerIndex: number = 0;  
  public controllerGrenade: number = 0;
  public controllerGun: number = 1;
  
  public gunKeyMapped: boolean = false;
}
