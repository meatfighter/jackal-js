import { BinaryReader, JavaRandom, ResourceLoader } from "slick2d-ts";

const JAVA_INT_MIN = -2147483648;
const JAVA_INT_MAX = 2147483647;
const JAVA_LONG_MIN = -(1n << 63n);
const JAVA_LONG_MAX = (1n << 63n) - 1n;
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

    public remove(valueOrIndex: T | number): T | boolean {
        if (typeof valueOrIndex === "number") {
            const index = Math.trunc(valueOrIndex);
            if (index < 0 || index >= this.values.length) {
                return false;
            }
            return this.removeAt(index);
        }
        const index = this.values.indexOf(valueOrIndex);
        if (index < 0) {
            return false;
        }
        this.removeAt(index);
        return true;
    }

    private removeAt(index: number): T {
        const previous = this.values[index];
        const lastIndex = this.values.length - 1;
        for (let i = index; i < lastIndex; i++) {
            this.values[i] = this.values[i + 1];
        }
        this.values.length = lastIndex;
        return previous;
    }

    public size(): number {
        return this.values.length;
    }

    public clear(): void {
        this.values.length = 0;
    }

    public contains(value: T): boolean {
        return this.values.includes(value);
    }

    public isEmpty(): boolean {
        return this.values.length === 0;
    }

    public toArray(): T[] {
        return this.values.slice();
    }

    public [Symbol.iterator](): IterableIterator<T> {
        return this.values[Symbol.iterator]();
    }
}

export class HashMap<K, V> extends Map<K, V> {
    public put(key: K, value: V): V | undefined {
        const previous = this.get(key);
        this.set(key, value);
        return previous;
    }
}

export class Collections {
    public static synchronizedMap<K, V>(map: HashMap<K, V>): HashMap<K, V> {
        return map;
    }
}

export class Random extends JavaRandom {
}

export class System {
    public static arraycopy(source: any[], sourcePosition: number, target: any[], targetPosition: number, length: number): void {
        for (let i = 0; i < length; i++) {
            target[targetPosition + i] = source[sourcePosition + i];
        }
    }

    public static currentTimeMillis(): number {
        return Date.now();
    }

    public static exit(_code: number): void {
        throw new Error("System.exit is not available in the browser port");
    }
}

export class Integer {
    public static toString(value: number): string {
        return Math.trunc(value).toString();
    }
}

export class Character {
    public static toLowerCase(value: string): string {
        return String(value).charAt(0).toLowerCase();
    }
}

export class JavaString {
    public static valueOf(value: any): string {
        return String(value);
    }

    public static format(format: string, ...args: any[]): string {
        let index = 0;
        return format.replace(/%([0]?)(\d+)?([sd])/g, (_match, zero: string, width: string, type: string) => {
            const value = args[index++];
            let text = type === "d" ? Math.trunc(Number(value)).toString() : String(value);
            if (width) {
                text = text.padStart(Number(width), zero ? "0" : " ");
            }
            return text;
        });
    }
}

export class Arrays {
    public static sort<T>(array: T[], comparator?: (a: T, b: T) => number): void {
        array.sort(comparator);
    }
}

export class BufferedInputStream {
    public readonly stream: ArrayBuffer | Uint8Array | null;

    public constructor(stream: ArrayBuffer | Uint8Array | null) {
        this.stream = stream;
    }
}

export class DataInputStream extends BinaryReader {
    public constructor(stream: ArrayBuffer | Uint8Array | BufferedInputStream | null) {
        const bytes = stream instanceof BufferedInputStream ? stream.stream : stream;
        if (bytes === null) {
            throw new Error("Missing binary resource stream");
        }
        super(bytes);
    }
}

export class Class {
    public static forName(_name: string): void {
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

export function java4DArray<T>(a: number, b: number, c: number, d: number, value: T): T[][][][] {
    const size = Math.trunc(a);
    const array = new Array<T[][][]>(size);
    for (let i = 0; i < size; i++) {
        array[i] = java3DArray(b, c, d, value);
    }
    return array;
}

export function javaInt(value: any): number {
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

export function javaIntDiv(dividend: any, divisor: any): number {
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

export function javaRoundFloat(value: any): number {
    return javaInt(Math.floor(Math.fround(Math.fround(Number(value)) + JAVA_FLOAT_HALF)));
}

export function javaByte(value: any): number {
    if (typeof value === "bigint") {
        return Number(BigInt.asIntN(8, value));
    }
    return (javaInt(value) << 24) >> 24;
}

export function javaShort(value: any): number {
    if (typeof value === "bigint") {
        return Number(BigInt.asIntN(16, value));
    }
    return (javaInt(value) << 16) >> 16;
}

export function javaChar(value: any): number {
    if (typeof value === "bigint") {
        return Number(BigInt.asUintN(16, value));
    }
    return javaInt(value) & 0xffff;
}

export function javaFloat(value: any): number {
    return Math.fround(Number(value));
}

export function javaDouble(value: any): number {
    return Number(value);
}

export function javaLong(value: any): bigint {
    if (typeof value === "bigint") {
        return BigInt.asIntN(64, value);
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return 0n;
    }
    if (number <= Number(JAVA_LONG_MIN)) {
        return JAVA_LONG_MIN;
    }
    if (number >= Number(JAVA_LONG_MAX)) {
        return JAVA_LONG_MAX;
    }
    return BigInt(number < 0 ? Math.ceil(number) : Math.floor(number));
}

export function resourceStream(ref: string): ArrayBuffer | null {
    return ResourceLoader.getResourceAsStream(ref);
}

export function rotatePoint(x: number, y: number, angle: number): InstanceType<typeof Point2D.Float> {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Point2D.Float(x * cos - y * sin, x * sin + y * cos);
}

function cloneDefault<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.slice() as T;
    }
    return value;
}
