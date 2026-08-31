import type { Image } from "slick2d-ts";

import type { Main } from "./Main.js";
export class LargeImage {
    public constructor(main: Main, tiles: Image[], map: number[][], width: number, height: number) {
        this.main = main;
        this.tiles = tiles;
        this.map = map;
        this.width = width;
        this.height = height;
    }

    private main: Main = null!;
    private tiles: Image[] = null!;
    private map: number[][] = null!;
    private width: number = 0;
    private height: number = 0;

    public draw(x: number, y: number): void {
        let main = this.main;
        let tiles = this.tiles;
        let map = this.map;
        for (let i = this.height - 1; i >= 0; i--) {
            let Y = y + (i << 5);
            for (let j = this.width - 1; j >= 0; j--) {
                main.drawImage(tiles[map[i][j]], x + (j << 5), Y);
            }
        }
    }
}
