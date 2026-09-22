import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./persistence-test-loader.mjs";
const { SoundCooldownClock } = await loadTypeScript("pwa/src/jackal/SoundCooldownClock.ts");
test("cooldown time excludes PWA suspension and remains monotonic", () => {
    let nativeTime = 100;
    const clock = new SoundCooldownClock(() => nativeTime);
    nativeTime += 40;
    assert.equal(clock.now(), 40);
    clock.setPaused(true);
    nativeTime += 60000;
    assert.equal(clock.now(), 40);
    clock.setPaused(false);
    nativeTime += 10;
    assert.equal(clock.now(), 50);
    nativeTime -= 5;
    assert.equal(clock.now(), 50);
});
