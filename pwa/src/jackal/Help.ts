import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameElement } from "./GameElement.js";
export class Help extends GameElement {
    declare public left: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.left = false;
        this.visible = false;
        this.visibleCount = 0;
        this.blinks = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_Help(argCount, arg0, arg1, arg2);
    }

    private __construct_Help(argCount: number, arg0?: number, arg1?: number, arg2?: boolean): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = arg0;
            let yLocal = arg1;
            let leftLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.left = leftLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public visible: boolean = false;
    public visibleCount: number = 60;
    public blinks: number = 0;

    public init(): void {}

    public update(): void {
        if (--this.visibleCount == 0) {
            this.visibleCount = 12;
            this.visible = !this.visible;
            if (this.visible == false) {
                if (++this.blinks == 4) {
                    this.removeFlag = true;
                    new FriendlySoldier(
                        this.x + (this.left ? -24 : 24),
                        this.y + 28,
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
            this.main.draw(this.main.help, this.x - 48, this.y - 32);
        }
    }
}
