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
const JAVA_RANDOM_MULTIPLIER_LOW = 0xe66d;
const JAVA_RANDOM_MULTIPLIER_MIDDLE = 0xdeec;
const JAVA_RANDOM_MULTIPLIER_HIGH = 0x0005;
const JAVA_RANDOM_ADDEND = 0x000b;
const JAVA_RANDOM_FLOAT_DIVISOR = 0x1000000;
const JAVA_RANDOM_INT_DIVISOR = 0x80000000;
let javaRandomSeedUniquifier = 0x106689d45497fdb5n;

/**
 * Allocation-free implementation of the 48-bit LCG used by java.util.Random.
 *
 * The seed is stored as three unsigned 16-bit limbs. This avoids BigInt work in
 * gameplay while preserving Java's exact bit sequence and making save-state
 * capture an explicit public contract rather than a reflection dependency on
 * slick2d-ts internals.
 */
export class Random {
    private seed0: number;
    private seed1: number;
    private seed2: number;

    public constructor(seed: number | bigint = createDefaultJavaRandomSeed()) {
        const externalSeed = typeof seed === "bigint" ? seed : BigInt(Math.trunc(seed));
        const internalSeed = BigInt.asUintN(48, externalSeed ^ 0x5deece66dn);
        this.seed0 = Number(internalSeed & 0xffffn);
        this.seed1 = Number((internalSeed >> 16n) & 0xffffn);
        this.seed2 = Number((internalSeed >> 32n) & 0xffffn);
    }

    public nextInt(bound?: number): number {
        if (typeof bound === "undefined") {
            return this.nextBits(32) | 0;
        }
        if (!Number.isInteger(bound) || bound <= 0 || bound > JAVA_INT_MAX) {
            throw new RangeError(`Random bound must be an integer from 1 through ${JAVA_INT_MAX}: ${bound}`);
        }

        const bits = this.nextBits(31);
        if ((bound & -bound) === bound) {
            return Math.floor(bits / (JAVA_RANDOM_INT_DIVISOR / bound));
        }

        let value = bits % bound;
        let candidate = bits;
        while (((candidate - value + (bound - 1)) | 0) < 0) {
            candidate = this.nextBits(31);
            value = candidate % bound;
        }
        return value;
    }

    public nextBoolean(): boolean {
        return this.nextBits(1) !== 0;
    }

    public nextFloat(): number {
        return Math.fround(this.nextBits(24) / JAVA_RANDOM_FLOAT_DIVISOR);
    }

    public getState(): JavaRandomState {
        return {
            seed0: this.seed0,
            seed1: this.seed1,
            seed2: this.seed2
        };
    }

    public static fromState(state: JavaRandomState): Random {
        const random = new Random(0);
        random.seed0 = validateJavaRandomSeedLimb(state.seed0, "seed0");
        random.seed1 = validateJavaRandomSeedLimb(state.seed1, "seed1");
        random.seed2 = validateJavaRandomSeedLimb(state.seed2, "seed2");
        return random;
    }

    private nextBits(bits: number): number {
        const lowProduct = this.seed0 * JAVA_RANDOM_MULTIPLIER_LOW + JAVA_RANDOM_ADDEND;
        const seed0 = lowProduct & JAVA_RANDOM_SEED_LIMB_MAX;
        let carry = Math.floor(lowProduct / 0x10000);

        const middleProduct = this.seed1 * JAVA_RANDOM_MULTIPLIER_LOW + this.seed0 * JAVA_RANDOM_MULTIPLIER_MIDDLE + carry;
        const seed1 = middleProduct & JAVA_RANDOM_SEED_LIMB_MAX;
        carry = Math.floor(middleProduct / 0x10000);

        const highProduct =
            this.seed2 * JAVA_RANDOM_MULTIPLIER_LOW + this.seed1 * JAVA_RANDOM_MULTIPLIER_MIDDLE + this.seed0 * JAVA_RANDOM_MULTIPLIER_HIGH + carry;
        const seed2 = highProduct & JAVA_RANDOM_SEED_LIMB_MAX;

        this.seed0 = seed0;
        this.seed1 = seed1;
        this.seed2 = seed2;

        if (bits <= 16) {
            return seed2 >>> (16 - bits);
        }
        const high32 = seed2 * 0x10000 + seed1;
        return Math.floor(high32 / 2 ** (32 - bits));
    }
}

function createDefaultJavaRandomSeed(): bigint {
    javaRandomSeedUniquifier = BigInt.asUintN(64, javaRandomSeedUniquifier * 1181783497276652981n);
    const time = BigInt(Date.now());
    const highResolutionTime = BigInt(Math.trunc(globalThis.performance?.now?.() ?? 0) * 1000);
    return BigInt.asIntN(64, javaRandomSeedUniquifier ^ (time << 20n) ^ highResolutionTime);
}

function validateJavaRandomSeedLimb(value: unknown, name: keyof JavaRandomState): number {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > JAVA_RANDOM_SEED_LIMB_MAX) {
        throw new RangeError(`Invalid Random ${name}: ${String(value)}`);
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
