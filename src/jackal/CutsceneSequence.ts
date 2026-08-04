// @ts-nocheck
// Converted mechanically from C:/NetBeansProjects/SlickJackal/src/jackal/CutsceneSequence.java.
// Original Java imports: java.util.*, org.newdawn.slick.*.
import { AppGameContainer, ApplicationGameContainer, BasicGame, Color, Cursor, Display, GameContainer, GL11, Graphics, Image, Input, Music, Mouse, ResourceLoader, ScalableGame, SlickException, Sound, SoundStore, Sys, XMLPackedSheet } from "slick2d-ts";
import { ArrayList, Arrays, BufferedInputStream, Class, Collections, DataInputStream, HashMap, Integer, JavaString, Point2D, Random, System, java2DArray, java3DArray, java4DArray, javaArray } from "../java/JavaRuntime.js";
import { Main } from "./Main.js";
import { Modes } from "./Modes.js";
export class CutsceneSequence {  public constructor(...args: any[]) {
    this.__construct(...args);
  }
  private __construct(...args: any[]): void {
    if (args.length === 0) {
        return;
    }
    throw new Error(`No Java constructor overload matched arguments: ${args.length}`);
  }

  private static modes: any = new ArrayList<Modes>();
  
  
  
  private static fillList(): void {
    CutsceneSequence.modes.add(Modes.YEAH);
    CutsceneSequence.modes.add(Modes.WE_MADE_IT);
    CutsceneSequence.modes.add(Modes.HERE);
  }
  
  public static requestCutscene(gc: any): void {
    if (CutsceneSequence.modes.isEmpty()) {
      CutsceneSequence.fillList();
    }
    Main.mainInstance.requestMode(
        CutsceneSequence.modes.remove(Main.mainInstance.random.nextInt(CutsceneSequence.modes.size())), gc);
  }
}
