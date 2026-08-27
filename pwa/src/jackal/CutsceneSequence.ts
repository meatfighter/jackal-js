import type { GameContainer } from "slick2d-ts";
import { ArrayList } from "../java/JavaRuntime.js";
import { Main } from "./Main.js";
import { Modes } from "./Modes.js";
export class CutsceneSequence {
    public constructor() {
        const argCount = arguments.length;
        this.__construct_CutsceneSequence(argCount);
    }

    private __construct_CutsceneSequence(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private static modes: ArrayList<Modes> = new ArrayList<Modes>();

    private static fillList(): void {
        CutsceneSequence.modes.add(Modes.YEAH);
        CutsceneSequence.modes.add(Modes.WE_MADE_IT);
        CutsceneSequence.modes.add(Modes.HERE);
    }

    public static requestCutscene(gc: GameContainer): void {
        if (CutsceneSequence.modes.isEmpty()) {
            CutsceneSequence.fillList();
        }
        Main.mainInstance.requestMode(CutsceneSequence.modes.remove(Main.mainInstance.random.nextInt(CutsceneSequence.modes.size())), gc);
    }
}
