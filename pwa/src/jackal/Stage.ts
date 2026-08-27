import type { Image } from "slick2d-ts";
import { javaArray } from "../java/JavaRuntime.js";
export class Stage {
    public tileMap: number[][] = null; // mutable during gameplay
    public typesMap: number[][] = null; // mutable during gameplay

    public tiles: Image[] = null;
    public groups: number[][][] = null;
    public triggerMap: number[][][][] = javaArray(2, null);
    public groupsMap: number[][] = null;
    public mapWidth: number = 0;
    public mapHeight: number = 0;
    public directions: bigint[] = null;
    public directionsDecoded: Uint8Array = null;
    public directionsWidth: number = 0;
    public directionsHeight: number = 0;
}
