import type { Image } from "slick2d-ts";

import type { Main } from "./Main.js";
export class LargeImage {
    public constructor(arg0?: Main, arg1?: Image[], arg2?: number[][], arg3?: number, arg4?: number) {
        const argCount = arguments.length;
        this.__construct_LargeImage(argCount, arg0, arg1, arg2, arg3, arg4);
    }

    private __construct_LargeImage(argCount: number, arg0?: Main, arg1?: Image[], arg2?: number[][], arg3?: number, arg4?: number): void {
        if (argCount === 5 && typeof arg3 === "number" && typeof arg4 === "number") {
            let mainLocal = arg0;
            let tilesLocal = arg1;
            let mapLocal = arg2;
            let widthLocal = arg3;
            let heightLocal = arg4;
            this.main = mainLocal;
            this.tiles = tilesLocal;
            this.map = mapLocal;
            this.width = widthLocal;
            this.height = heightLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private main: Main = null;
    private tiles: Image[] = null;
    private map: number[][] = null;
    private width: number = 0;
    private height: number = 0;

    public draw(x: number, y: number): void {
        let main = this.main;
        let tiles = this.tiles;
        let map = this.map;
        for (let i = this.height - 1; i >= 0; i--) {
            let Y = y + (i << 5);
            for (let j = this.width - 1; j >= 0; j--) {
                main.draw__overload0(tiles[map[i][j]], x + (j << 5), Y);
            }
        }
    }
}
