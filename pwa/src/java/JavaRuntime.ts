import { JavaRandom } from "slick2d-ts";
const JAVA_INT_MIN = -2147483648;
const JAVA_INT_MAX = 2147483647;
const JAVA_FLOAT_HALF = Math.fround(0.5);

export const JAVA_LONG_LOW_3_BITS = 7n;
export const JAVA_LONG_PACKED_3BIT_SHIFTS: readonly bigint[] = [
    0n,
    3n,
    6n,
    9n,
    12n,
    15n,
    18n,
    21n,
    24n,
    27n,
    30n,
    33n,
    36n,
    39n,
    42n,
    45n,
    48n,
    51n,
    54n,
    57n,
    60n
];

export class ArrayList<T> {
    private readonly values: T[];

    public constructor(_capacity: number = 0) {
        this.values = [];
    }

    public add(value: T): boolean {
        this.values.push(value);
        return true;
    }

    public get(index: number): T {
        return this.values[index];
    }

    public set(index: number, value: T): T {
        const previous = this.values[index];
        this.values[index] = value;
        return previous;
    }

    public removeAt(index: number): T {
        if (!Number.isInteger(index) || index < 0 || index >= this.values.length) {
            throw new RangeError(`ArrayList index out of bounds: ${index}`);
        }
        const previous = this.values[index];
        const lastIndex = this.values.length - 1;
        for (let i = index; i < lastIndex; i++) {
            this.values[i] = this.values[i + 1];
        }
        this.values.length = lastIndex;
        return previous;
    }

    public removeValue(value: T): boolean {
        const index = this.values.indexOf(value);
        if (index < 0) {
            return false;
        }
        this.removeAt(index);
        return true;
    }

    public size(): number {
        return this.values.length;
    }

    public clear(): void {
        this.values.length = 0;
    }

    public isEmpty(): boolean {
        return this.values.length === 0;
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values[Symbol.iterator]();
    }
}

export interface JavaRandomState {
    seed0: number;
    seed1: number;
    seed2: number;
}

const JAVA_RANDOM_SEED_LIMB_MAX = 0xffff;

export class Random extends JavaRandom {
    public getState(): JavaRandomState {
        return {
            seed0: readJavaRandomSeedLimb(this, "seed0"),
            seed1: readJavaRandomSeedLimb(this, "seed1"),
            seed2: readJavaRandomSeedLimb(this, "seed2")
        };
    }

    public static fromState(state: JavaRandomState): Random {
        const random = Object.create(Random.prototype) as Random;
        Reflect.set(random, "seed0", validateJavaRandomSeedLimb(state.seed0, "seed0"));
        Reflect.set(random, "seed1", validateJavaRandomSeedLimb(state.seed1, "seed1"));
        Reflect.set(random, "seed2", validateJavaRandomSeedLimb(state.seed2, "seed2"));
        return random;
    }
}

function readJavaRandomSeedLimb(random: Random, name: keyof JavaRandomState): number {
    return validateJavaRandomSeedLimb(Reflect.get(random, name), name);
}

function validateJavaRandomSeedLimb(value: unknown, name: keyof JavaRandomState): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > JAVA_RANDOM_SEED_LIMB_MAX) {
        throw new RangeError(`Invalid JavaRandom ${name}: ${String(value)}`);
    }
    return value;
}

export class System {
    public static arraycopy<T>(source: readonly T[], sourcePosition: number, target: T[], targetPosition: number, length: number): void {
        if (
            !Number.isInteger(sourcePosition) ||
            !Number.isInteger(targetPosition) ||
            !Number.isInteger(length) ||
            sourcePosition < 0 ||
            targetPosition < 0 ||
            length < 0 ||
            sourcePosition + length > source.length ||
            targetPosition + length > target.length
        ) {
            throw new RangeError("Invalid System.arraycopy range.");
        }

        if (source === target && targetPosition > sourcePosition && targetPosition < sourcePosition + length) {
            for (let i = length - 1; i >= 0; i--) {
                target[targetPosition + i] = source[sourcePosition + i];
            }
            return;
        }

        for (let i = 0; i < length; i++) {
            target[targetPosition + i] = source[sourcePosition + i];
        }
    }
}

export class Point2D {
    public static Float = class {
        public x: number;
        public y: number;

        public constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }
    };
}

export function javaArray<T>(length: number, value: T): T[] {
    const size = Math.trunc(length);
    const array = new Array<T>(size);
    if (Array.isArray(value)) {
        for (let i = 0; i < size; i++) {
            array[i] = value.slice() as T;
        }
    } else {
        array.fill(value);
    }
    return array;
}

export function java2DArray<T>(height: number, width: number, value: T): T[][] {
    const size = Math.trunc(height);
    const array = new Array<T[]>(size);
    for (let i = 0; i < size; i++) {
        array[i] = javaArray(width, value);
    }
    return array;
}

export function java3DArray<T>(a: number, b: number, c: number, value: T): T[][][] {
    const size = Math.trunc(a);
    const array = new Array<T[][]>(size);
    for (let i = 0; i < size; i++) {
        array[i] = java2DArray(b, c, value);
    }
    return array;
}

export function javaInt(value: unknown): number {
    if (typeof value === "bigint") {
        return Number(BigInt.asIntN(32, value));
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return 0;
    }
    if (number <= JAVA_INT_MIN) {
        return JAVA_INT_MIN;
    }
    if (number >= JAVA_INT_MAX) {
        return JAVA_INT_MAX;
    }
    return number < 0 ? Math.ceil(number) : Math.floor(number);
}

export function javaIntDiv(dividend: unknown, divisor: unknown): number {
    const left = javaInt(dividend);
    const right = javaInt(divisor);
    if (right === 0) {
        throw new Error("/ by zero");
    }
    if (left === JAVA_INT_MIN && right === -1) {
        return JAVA_INT_MIN;
    }
    return Math.trunc(left / right);
}

export function javaRoundFloat(value: unknown): number {
    return javaInt(Math.floor(Math.fround(Math.fround(Number(value)) + JAVA_FLOAT_HALF)));
}

export function javaByte(value: unknown): number {
    if (typeof value === "bigint") {
        return Number(BigInt.asIntN(8, value));
    }
    return (javaInt(value) << 24) >> 24;
}

export function javaFloat(value: unknown): number {
    return Math.fround(Number(value));
}

export function javaDouble(value: unknown): number {
    return Number(value);
}
