export const CUTSCENE_IDS = ["YEAH", "WE_MADE_IT", "HERE"] as const;
export type CutsceneId = (typeof CUTSCENE_IDS)[number];

export function isCutsceneState(value: unknown): value is CutsceneId[] {
    if (!Array.isArray(value) || value.length > CUTSCENE_IDS.length) return false;
    let previous = -1;
    for (const entry of value) {
        const index = typeof entry === "string" ? (CUTSCENE_IDS as readonly string[]).indexOf(entry) : -1;
        if (index <= previous) return false;
        previous = index;
    }
    return true;
}
