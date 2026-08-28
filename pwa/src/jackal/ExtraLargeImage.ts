import type { Image } from "slick2d-ts";

import type { Main } from "./Main.js";
export class ExtraLargeImage {
    public constructor(arg0?: Main, arg1?: Image[], arg2?: number[][]) {
        const argCount = arguments.length;
        this.__construct_ExtraLargeImage(argCount, arg0, arg1, arg2);
    }

    private __construct_ExtraLargeImage(argCount: number, arg0?: Main, arg1?: Image[], arg2?: number[][]): void {
        if (argCount === 3) {
            let mainLocal = arg0;
            let tilesLocal = arg1;
            let mapLocal = arg2;
            this.main = mainLocal!;
            this.tiles = tilesLocal!;
            this.map = mapLocal!;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private main: Main = null!;
    private tiles: Image[] = null!;
    private map: number[][] = null!;

    public draw(x: number, y: number): void {
        let main = this.main;
        let tiles = this.tiles;
        let map = this.map;
        for (let i = this.map.length - 1; i >= 0; i--) {
            main.draw__overload0(tiles[map[i][0]], map[i][1] + x, map[i][2] + y);
        }
    }
}
