import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Help extends GameElement {
    declare public left: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.left = false;
        this.visible = false;
        this.visibleCount = 0;
        this.blinks = 0;
    }

    public constructor(x: number, y: number, left: boolean) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);

        this.x = x;
        this.y = y;
        this.left = left;
    }

    public visible: boolean = false;
    public visibleCount: number = 60;
    public blinks: number = 0;

    public init(): void {}

    public update(): void {
        if (--this.visibleCount === 0) {
            this.visibleCount = 12;
            this.visible = !this.visible;
            if (this.visible === false) {
                if (++this.blinks === 4) {
                    this.removeFlag = true;
                    FriendlySoldier.fromBuilding(
                        javaFloat(this.x + (this.left ? -24 : 24)),
                        javaFloat(this.y + 28),
                        this.left ? FriendlySoldierType.HOUSE_LEFT_WALKING : FriendlySoldierType.HOUSE_RIGHT_WALKING,
                        2 + this.main.random.nextInt(3),
                        false
                    );
                }
            }
        }
    }

    public render(): void {
        if (this.visible) {
            this.main.drawImage(this.main.help, this.x - 48, this.y - 32);
        }
    }
}
