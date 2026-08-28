import { javaFloat, javaArray } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { Laser } from "./Laser.js";
export class LasersManager extends GameElement {
    declare public flash: boolean;
    declare public colorIndex: number;
    declare public laser: Laser | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.state = 0;
        this.delay = 0;
        this.beamIndex = 0;
        this.visibles = null!;
        this.flash = false;
        this.colorIndex = 0;
        this.laser = null;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_LasersManager(argCount, arg0, arg1);
    }

    private __construct_LasersManager(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_OUTER_FLASHING: number = 0;
    public static readonly STATE_INNER_FLASHING: number = 1;
    public static readonly STATE_WARMING_UP: number = 2;
    public static readonly STATE_LASERING: number = 3;

    public static readonly BEAM_SPACING: number = javaFloat(8 * 32);
    public static readonly VERTICAL_SPACE: number = javaFloat(16 * 32);

    public static readonly OUTER_FLASH_TIME: number = 16;
    public static readonly INNER_FLASH_TIME: number = 16;
    public static readonly WARM_UP_TIME: number = 16;
    public static readonly LASER_TIME: number = 46;

    public state: number = LasersManager.STATE_OUTER_FLASHING;
    public delay: number = LasersManager.OUTER_FLASH_TIME;
    public beamIndex: number = 0;
    public visibles: boolean[] = javaArray(3, false);

    public init(): void {
        this.layer = 4;
    }

    private advanceBeamIndex(): void {
        for (let i = 0; i < 3; i++) {
            this.visibles[i] = this.beamVisible(javaFloat(javaFloat(this.x + 64) + javaFloat(i * LasersManager.BEAM_SPACING)));
        }
        let nextIndex = this.beamIndex + 1;
        if (nextIndex == 3) {
            nextIndex = 0;
        }
        if (this.visibles[nextIndex]) {
            this.beamIndex = nextIndex;
            return;
        }
        nextIndex++;
        if (nextIndex == 3) {
            nextIndex = 0;
        }
        if (this.visibles[nextIndex]) {
            this.beamIndex = nextIndex;
        }
    }

    private beamVisible(beamX: number): boolean {
        return !(javaFloat(beamX + 8) < this.gameMode.cameraX || javaFloat(beamX - 8) > javaFloat(this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH));
    }

    public update(): void {
        if (this.delay > 0) {
            this.delay--;
        } else {
            switch (this.state) {
                case LasersManager.STATE_OUTER_FLASHING:
                    this.state = LasersManager.STATE_INNER_FLASHING;
                    this.delay = LasersManager.INNER_FLASH_TIME;
                    break;
                case LasersManager.STATE_INNER_FLASHING:
                    this.state = LasersManager.STATE_WARMING_UP;
                    this.delay = LasersManager.WARM_UP_TIME;
                    break;
                case LasersManager.STATE_WARMING_UP:
                    this.state = LasersManager.STATE_LASERING;
                    this.delay = LasersManager.LASER_TIME;
                    this.laser = new Laser(javaFloat(javaFloat(64 + this.x) + javaFloat(LasersManager.BEAM_SPACING * this.beamIndex)), javaFloat(this.y - 828));
                    break;
                case LasersManager.STATE_LASERING:
                    this.state = LasersManager.STATE_OUTER_FLASHING;
                    this.delay = LasersManager.OUTER_FLASH_TIME;
                    this.laser!.remove();
                    this.advanceBeamIndex();
                    break;
            }
        }
    }

    public override checkBounds(maxY: number): void {
        if (javaFloat(this.y - 512) > maxY) {
            this.remove();
        }
    }

    public render(): void {
        this.flash = !this.flash;
        if (++this.colorIndex == 4) {
            this.colorIndex = 0;
        }

        let X = this.x + LasersManager.BEAM_SPACING * this.beamIndex;

        switch (this.state) {
            case LasersManager.STATE_OUTER_FLASHING:
                if (this.flash) {
                    let Y = this.y + 40;
                    for (let i = 0; i < 2; i++, Y -= LasersManager.VERTICAL_SPACE) {
                        this.main.draw(this.main.lasers[4], X + 16, Y);
                        this.main.draw(this.main.lasers[4], X + 96, Y);
                    }
                    Y += 64;
                    this.main.draw(this.main.lasers[4], X + 16, Y);
                    this.main.draw(this.main.lasers[4], X + 96, Y);
                }
                break;
            case LasersManager.STATE_INNER_FLASHING:
                if (this.flash) {
                    let Y = this.y + 44;
                    for (let i = 0; i < 2; i++, Y -= LasersManager.VERTICAL_SPACE) {
                        this.main.draw(this.main.lasers[5], X + 48, Y);
                        this.main.draw(this.main.lasers[5], X + 68, Y);
                    }
                    Y += 64;
                    this.main.draw(this.main.lasers[5], X + 48, Y);
                    this.main.draw(this.main.lasers[5], X + 68, Y);
                }
                break;
            case LasersManager.STATE_WARMING_UP:
                break;
            case LasersManager.STATE_LASERING:
                for (let i = 1; i < 13; i++) {
                    this.main.draw(this.main.lasers[this.colorIndex], X + 48, this.y - (i << 5) + 4);
                }
                for (let i = 1; i < 11; i++) {
                    this.main.draw(this.main.lasers[this.colorIndex], X + 48, this.y - (i << 5) - 508);
                }
                break;
        }
    }
}
