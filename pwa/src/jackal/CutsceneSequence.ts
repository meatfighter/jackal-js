import type { GameContainer } from "slick2d-ts";
import { ArrayList } from "../java/JavaRuntime.js";
import { CUTSCENE_IDS, isCutsceneState, type CutsceneId } from "./CutsceneState.js";
import { requireMainRuntime } from "./MainRuntimeState.js";
import { Modes } from "./Modes.js";

const MODES_BY_ID: Readonly<Record<CutsceneId, Modes>> = {
    YEAH: Modes.YEAH,
    WE_MADE_IT: Modes.WE_MADE_IT,
    HERE: Modes.HERE
};

export class CutsceneSequence {
    public constructor() {}

    private static modes: ArrayList<Modes> = new ArrayList<Modes>();

    private static fillList(): void {
        CutsceneSequence.modes.add(Modes.YEAH);
        CutsceneSequence.modes.add(Modes.WE_MADE_IT);
        CutsceneSequence.modes.add(Modes.HERE);
    }

    public static captureState(): CutsceneId[] {
        const result: CutsceneId[] = [];
        for (const mode of CutsceneSequence.modes) {
            const id = CUTSCENE_IDS.find((candidate) => MODES_BY_ID[candidate] === mode);
            if (id === undefined) throw new Error("Unknown Jackal cutscene in remaining bag.");
            result.push(id);
        }
        if (!isCutsceneState(result)) throw new Error("Invalid Jackal cutscene bag order.");
        return result;
    }

    public static restoreState(state: readonly CutsceneId[]): void {
        if (!isCutsceneState(state)) throw new Error("Invalid saved Jackal cutscene bag.");
        const replacement = new ArrayList<Modes>();
        for (const id of state) replacement.add(MODES_BY_ID[id]);
        CutsceneSequence.modes = replacement;
    }

    public static requestCutscene(gc: GameContainer): void {
        if (CutsceneSequence.modes.isEmpty()) CutsceneSequence.fillList();
        const main = requireMainRuntime();
        main.requestMode(CutsceneSequence.modes.removeAt(main.random.nextInt(CutsceneSequence.modes.size())), gc);
    }
}
