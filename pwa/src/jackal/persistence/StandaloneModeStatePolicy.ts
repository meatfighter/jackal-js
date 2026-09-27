import { MainConstants } from "../../java/MainConstants.js";
import { HardEndingMode } from "../HardEndingMode.js";
import { IntroMode } from "../IntroMode.js";
import { IntroMapMode } from "../IntroMapMode.js";
import { JeepHereMode } from "../JeepHereMode.js";
import { JeepYeahMode } from "../JeepYeahMode.js";
import { JeepYeahPlane } from "../JeepYeahPlane.js";
import { MapMode } from "../MapMode.js";
import { PLAYER_RUMBLE_STEPS, PLAYER_SPEED } from "../PlayerMotionConstants.js";
import { finalScoreText } from "../ScorePresentation.js";
import { SunsetMode } from "../SunsetMode.js";
import type { StandaloneModeId } from "./GameStateFields.js";

type Fields = Readonly<Record<string, unknown>>;
type Fade = "in" | "out" | "none";

function object(value: unknown): Fields | null {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Fields) : null;
}
function number(fields: Fields, name: string): number {
    return typeof fields[name] === "number" ? (fields[name] as number) : NaN;
}
function integer(value: unknown, low: number, high: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= low && value <= high;
}
function between(value: unknown, low: number, high: number): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
}
function fade(main: Fields, expected: Fade): boolean {
    return expected === "none" ? main.fading === false : main.fading === true && main.fadeOut === (expected === "out");
}
function cursor(lines: readonly string[], row: unknown, length: unknown, allowEnd: boolean): boolean {
    if (!integer(row, 0, lines.length) || !integer(length, 0, 1024)) return false;
    return row === lines.length ? allowEnd && length === 0 : length <= lines[row].length;
}
function simpleMenu(main: Fields, fields: Fields): boolean {
    const state = number(fields, "state");
    return integer(state, 0, 2) && fade(main, state === 0 ? "in" : state === 2 ? "out" : "none");
}

function sunset(main: Fields, fields: Fields): boolean {
    const state = number(fields, "state");
    if (!integer(state, 0, SunsetMode.STATE_HARD_MODE_FADE_OUT)) return false;
    if (
        !fade(
            main,
            state === SunsetMode.STATE_FADE_IN
                ? "in"
                : state === SunsetMode.STATE_ADVANCE_TO_HARD_MODE || state === SunsetMode.STATE_HARD_MODE_FADE_OUT
                  ? "out"
                  : "none"
        )
    )
        return false;
    const advancing = state === SunsetMode.STATE_ADVANCE_TO_HARD_MODE;
    if (advancing ? main.stageIndex !== 0 || main.hardMode !== true : main.stageIndex !== 5) return false;
    if (state >= SunsetMode.STATE_PAUSED_2 && state <= SunsetMode.STATE_WAITING && main.hardMode !== false) return false;
    if (state === SunsetMode.STATE_HARD_MODE_FADE_OUT && main.hardMode !== true) return false;
    if (!integer(fields.sunPhase, 0, SunsetMode.SUN_PHASE_STEPS - 1) || ![0, -30, -60].includes(number(fields, "rotorAngle"))) return false;
    if (!between(fields.helicopterZ, SunsetMode.HELICOPTER_Z0, SunsetMode.Z0) || fields.helicopterZ === SunsetMode.Z0) return false;
    const helicopterEnd = advancing || main.hardMode === false ? SunsetMode.HELICOPTER_TIME : SunsetMode.HELICOPTER_HARD_TIME;
    if (!integer(fields.helicopterDelay, 0, helicopterEnd)) return false;
    if (state <= SunsetMode.STATE_PAUSED_1 && fields.helicopterDelay !== 0) return false;
    if (state === SunsetMode.STATE_HELICOPTER && fields.helicopterDelay === helicopterEnd) return false;
    if (state >= SunsetMode.STATE_PAUSED_2 && fields.helicopterDelay !== helicopterEnd) return false;
    const cards = SunsetMode.CREDIT_CARDS;
    const card = number(fields, "creditsIndex");
    if (!integer(card, 0, cards.length - 1)) return false;
    const lines = [...cards[card]];
    if (card === cards.length - 1) lines[0] = finalScoreText(number(main, "score"));
    if (!cursor(lines, fields.lineIndex, fields.lineLength, state !== SunsetMode.STATE_CREDITS || card < cards.length - 1)) return false;
    if (state < SunsetMode.STATE_CREDITS || state === SunsetMode.STATE_HARD_MODE_FADE_OUT) {
        if (card !== 0 || fields.lineIndex !== 0 || fields.lineLength !== 0) return false;
    }
    if (state === SunsetMode.STATE_WAITING || advancing) {
        if (card !== cards.length - 1 || fields.lineIndex !== lines.length || fields.lineLength !== 0) return false;
    }
    const delay = number(fields, "delay");
    if (state === SunsetMode.STATE_FADE_IN || state === SunsetMode.STATE_PAUSED_1) return delay === SunsetMode.PAUSE_TIME_1;
    if (state === SunsetMode.STATE_PAUSED_2) return integer(delay, 1, SunsetMode.PAUSE_TIME_2);
    if (state === SunsetMode.STATE_CREDITS) return integer(delay, 1, Math.max(SunsetMode.TYPE_TIME, SunsetMode.EOL_PAUSE_TIME, SunsetMode.EOM_PAUSE_TIME));
    return delay === 0;
}

function hardEnding(main: Fields, fields: Fields): boolean {
    const state = number(fields, "state");
    if (main.stageIndex !== 5 || main.hardMode !== true || !integer(state, 0, HardEndingMode.STATE_FINAL_SCORE_FADE_OUT)) return false;
    const expected =
        state === HardEndingMode.STATE_FADE_OUT || state === HardEndingMode.STATE_FINAL_SCORE_FADE_OUT
            ? "out"
            : state === HardEndingMode.STATE_FADE_IN || state === HardEndingMode.STATE_FINAL_SCORE_FADE_IN
              ? "in"
              : "none";
    if (!fade(main, expected)) return false;
    const card = number(fields, "cardIndex");
    if (state < HardEndingMode.STATE_CREDITS) {
        if (!integer(card, 0, HardEndingMode.CARDS.length - 1)) return false;
        const lines = HardEndingMode.CARDS[card];
        if (!cursor(lines, fields.lineIndex, fields.lineLength, true)) return false;
        if (
            (state === HardEndingMode.STATE_PAUSED || state === HardEndingMode.STATE_FADE_OUT) &&
            (fields.lineIndex !== lines.length || fields.lineLength !== 0)
        )
            return false;
        if (state === HardEndingMode.STATE_FADE_IN && (fields.lineIndex !== 0 || fields.lineLength !== 0)) return false;
    } else if (card !== HardEndingMode.CARDS.length || fields.lineIndex !== 0 || fields.lineLength !== 0) return false;
    if (!integer(fields.rumble, 0, PLAYER_RUMBLE_STEPS - 1) || !between(fields.jeepX, -50, MainConstants.DISPLAY_WIDTH + 50 + PLAYER_SPEED)) return false;
    if (!between(fields.creditsY, -HardEndingMode.CREDITS_HEIGHT - 64, MainConstants.DISPLAY_HEIGHT)) return false;
    if (state === HardEndingMode.STATE_TYPING) return integer(fields.delay, 1, HardEndingMode.TYPE_DELAY);
    if (state === HardEndingMode.STATE_PAUSED) return integer(fields.delay, 1, HardEndingMode.PAUSE_DELAY);
    return fields.delay === 0;
}

function intro(main: Fields, fields: Fields): boolean {
    const state = number(fields, "state");
    if (!integer(state, 0, IntroMode.STATE_FADE_OUT) || !integer(fields.soldierSet, 0, IntroMode.NAMES.length - 1)) return false;
    const expected =
        state === IntroMode.STATE_FADE_IN
            ? "in"
            : state === IntroMode.STATE_START_GAME || state === IntroMode.STATE_OPTIONS || state === IntroMode.STATE_FADE_OUT
              ? "out"
              : "none";
    if (!fade(main, expected) || !cursor(IntroMode.NAMES[fields.soldierSet], fields.namesIndex, fields.nameLength, true)) return false;
    const delay = number(fields, "delay");
    switch (state) {
        // Attract-loop fade-in can inherit zero and decrement below zero before startTitle resets it.
        case IntroMode.STATE_FADE_IN:
            return integer(delay, -IntroMode.TITLE_DELAY, IntroMode.TITLE_DELAY);
        case IntroMode.STATE_EXPLOSION:
            return integer(delay, 1, IntroMode.EXPLOSION_DELAY);
        case IntroMode.STATE_START_GAME:
        case IntroMode.STATE_FADE_OUT:
            return delay === 0;
        case IntroMode.STATE_OPTIONS:
            return integer(delay, 0, IntroMode.TITLE_DELAY);
        case IntroMode.STATE_TITLE:
            return integer(delay, 1, IntroMode.TITLE_DELAY);
        case IntroMode.STATE_STORY_SCROLL:
            return integer(delay, 1, IntroMode.SCROLL_DELAY);
        case IntroMode.STATE_STORY:
            return integer(delay, 1, IntroMode.STORY_DELAY);
        case IntroMode.STATE_SOLDIERS_ENTER:
            return integer(delay, 1, IntroMode.ENTER_DELAY);
        case IntroMode.STATE_TYPING:
            return integer(delay, 1, Math.max(IntroMode.TYPE_DELAY, IntroMode.EON_DELAY));
        case IntroMode.STATE_NAMES_PAUSE:
            return integer(delay, 1, IntroMode.NAMES_DELAY);
        default:
            return false;
    }
}

function jeepHelpers(extra: unknown): boolean {
    const value = object(object(extra)?.jeepYeah);
    if (value === null) return false;
    for (const [key, left] of [
        ["leftPlane", true],
        ["rightPlane", false]
    ] as const) {
        const plane = object(value[key]);
        if (plane === null || plane.left !== left || !Number.isFinite(plane.z) || plane.z === JeepYeahPlane.Z0) return false;
    }
    for (const key of ["fireLeft", "fireRight"] as const) {
        const fire = object(value[key]);
        if (fire === null || !integer(fire.state, 0, 3) || !between(fire.scale, 0, 2)) return false;
        if (fire.state === 0 ? fire.delay !== 0 : !integer(fire.delay, 1, 3)) return false;
    }
    const explosion = object(value.explosion);
    // Normal setMode primes update before a saveable JeepYeah runtime is exposed.
    if (explosion === null || explosion.delay !== 0 || !integer(explosion.spriteIndex, 0, 2) || !between(explosion.size, 1, 256)) return false;
    if (!Array.isArray(value.bullets)) return false;
    return value.bullets.every((entry: unknown) => {
        const bullet = object(entry);
        return bullet !== null && between(bullet.scale, 0, 1);
    });
}

export function isStandaloneModeSemanticState(main: Fields, id: StandaloneModeId, fields: Fields, extra: unknown): boolean {
    const state = number(fields, "state");
    switch (id) {
        case "SUNSET":
            return sunset(main, fields);
        case "HARD_ENDING":
            return hardEnding(main, fields);
        case "INTRO":
            return intro(main, fields);
        case "CONTINUE":
        case "DIFFICULTY":
        case "OPTIONS":
            return simpleMenu(main, fields);
        case "INPUT":
            return state !== 5 && fade(main, state === 0 ? "in" : state === 4 ? "out" : "none");
        case "INTRO_MAP":
            return (
                integer(state, 0, IntroMapMode.STATE_FADE_OUT) &&
                fade(main, state === IntroMapMode.STATE_FADE_IN ? "in" : state === IntroMapMode.STATE_FADE_OUT ? "out" : "none") &&
                (state === IntroMapMode.STATE_FADE_OUT ? fields.delay === 0 : integer(fields.delay, 1, IntroMapMode.PAUSE_DELAY))
            );
        case "MAP": {
            const stage = number(main, "stageIndex");
            if (!integer(stage, 0, MapMode.JEEP_YS.length - 1) || !integer(state, 0, MapMode.STATE_FADE_OUT)) return false;
            if (!fade(main, state === MapMode.STATE_FADE_IN ? "in" : state === MapMode.STATE_FADE_OUT ? "out" : "none")) return false;
            if (
                fields.targetJeepY !== MapMode.JEEP_YS[stage] ||
                !between(fields.jeepY, MapMode.JEEP_YS[stage], 868) ||
                !integer(fields.soldierDelay, 1, MapMode.SOLDIER_DELAY)
            )
                return false;
            if (state === MapMode.STATE_MOVING || state === MapMode.STATE_FADE_OUT) return fields.delay === 0;
            return integer(fields.delay, 1, state === MapMode.STATE_PAUSED_2 ? MapMode.PAUSE_DELAY_2 : MapMode.PAUSE_DELAY);
        }
        case "HERE":
            return (
                integer(main.stageIndex, 0, MapMode.JEEP_YS.length - 1) &&
                integer(state, 0, JeepHereMode.STATE_FADE_OUT) &&
                fade(main, state === JeepHereMode.STATE_FADE_IN ? "in" : state === JeepHereMode.STATE_FADE_OUT ? "out" : "none") &&
                between(fields.jeepHereX, 224, MainConstants.DISPLAY_WIDTH) &&
                (state === JeepHereMode.STATE_FADE_OUT ? fields.delay === 0 : integer(fields.delay, 1, JeepHereMode.HERE_DELAY))
            );
        case "YEAH":
        case "WE_MADE_IT":
            return (
                integer(main.stageIndex, 0, MapMode.JEEP_YS.length - 1) &&
                integer(state, 0, JeepYeahMode.STATE_FADE_OUT) &&
                fields.yeah === (id === "YEAH") &&
                fade(main, state === JeepYeahMode.STATE_FADE_IN ? "in" : state === JeepYeahMode.STATE_FADE_OUT ? "out" : "none") &&
                between(fields.smokeX, 0, 64) &&
                fields.smokeX !== 64 &&
                between(fields.smokeY, 0, 32) &&
                fields.smokeY !== 32 &&
                integer(fields.bulletDelay, 1, JeepYeahMode.BULLET_DELAY) &&
                integer(fields.yeahVisible, 0, JeepYeahMode.YEAH_DELAY) &&
                jeepHelpers(extra)
            );
    }
}
