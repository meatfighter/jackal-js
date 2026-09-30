/** Test transforms only; no release build imports this module. */
export function pausedStateMutationPlugin(name = process.env.JACKAL_PAUSED_MUTANT) {
    return {
        name: "paused-state-behavioral-mutant",
        enforce: "pre",
        transform(source, id) {
            const p = id.replaceAll("\\", "/");
            const replace = (a, b) => {
                if (!source.includes(a)) throw Error("Missing paused mutation anchor");
                return source.replace(a, b);
            };
            if (name === "boundary" && p.endsWith("/GameStateSnapshotValidator.ts")) return replace("!isPausedGameStateValid(snapshot)", "false");
            if (!p.endsWith("/PausedGameStatePolicy.ts")) return;
            if (name === "pending-song") return replace("snapshot.requestedSongId !== song.id ||", "");
            if (name === "extra-effect") return replace("const audio = snapshot.audioState;", "return true; const audio = snapshot.audioState;");
            if (name === "looped-cue") return replace("voice.looped === false &&", "");
        }
    };
}
