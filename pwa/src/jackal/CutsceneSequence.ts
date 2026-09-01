import type { GameContainer } from "slick2d-ts";
import { ArrayList } from "../java/JavaRuntime.js";
import { requireMainRuntime } from "./MainRuntimeState.js";
import { Modes } from "./Modes.js";
export class CutsceneSequence {
    public constructor() {}

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
        const main = requireMainRuntime();
        main.requestMode(CutsceneSequence.modes.removeAt(main.random.nextInt(CutsceneSequence.modes.size())), gc);
    }
}
