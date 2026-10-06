import assert from "node:assert/strict";
import { resolve } from "node:path";
import { supervisedTrial } from "./persistence-fuzz/supervisor.mjs";
import { sourceIdentity } from "./persistence-fuzz/identity.mjs";
import { makeTrial, casePlan } from "./persistence-fuzz/profiles.mjs";
import { Reporter } from "./persistence-fuzz/reporter.mjs";
const repo = resolve("."),
    source = sourceIdentity(repo);
const directory = resolve(repo, "..", "qualification-evidence", `jackal-presentation-${Date.now()}`);
const reporter = new Reporter(directory, repo);
try {
    const index = casePlan("jackal-js").findIndex((row) => row.stage === 2 && row.lane === "natural");
    // Resolve an actual stage-three natural recipe; never change production startup.
    let spec;
    for (let i = 0; i < 24; i++) {
        const candidate = makeTrial("jackal-js", { seed: 0x20261004, profile: "qualification", ticks: 80, continuationTicks: 24 }, i);
        if (candidate.stage === 2 && candidate.lane === "natural") {
            spec = candidate;
            break;
        }
    }
    assert.ok(spec, `stage-three plan entry (${index})`);
    const result = await supervisedTrial(
        { repo, spec, sourceIdentity: source, presentationControl: true },
        {
            onEvidence: (packet) => {
                if (packet.context) reporter.atomic("context.json", packet.context);
            }
        }
    );
    reporter.atomic("result.json", { source, result });
    assert.deepEqual(result.issues, []);
    assert.equal(result.cleanup.complete, true);
    assert.equal(result.presentation.length, 4);
    for (const row of result.presentation) {
        assert.ok(row.count > 1000);
        assert.equal(row.fractional, 0);
    }
} finally {
    reporter.close();
}
console.log(`Real-browser first-pass coordinates: ${directory}`);
