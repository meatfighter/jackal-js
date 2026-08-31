import type { Image } from "slick2d-ts";

import type { Main } from "./Main.js";
export class ExtraLargeImage {
    public constructor(main: Main, tiles: Image[], map: number[][]) {
        this.main = main;
        this.tiles = tiles;
        this.map = map;
    }

    private main: Main = null!;
    private tiles: Image[] = null!;
    private map: number[][] = null!;

    public draw(x: number, y: number): void {
        let main = this.main;
        let tiles = this.tiles;
        let map = this.map;
        for (let i = this.map.length - 1; i >= 0; i--) {
            main.drawImage(tiles[map[i][0]], map[i][1] + x, map[i][2] + y);
        }
    }
}
