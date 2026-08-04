import { BinaryReader, JavaRandom, ResourceLoader } from "slick2d-ts";

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
            return this.values.splice(index, 1)[0];
        }
        const index = this.values.indexOf(valueOrIndex);
        if (index < 0) {
            return false;
        }
        this.values.splice(index, 1);
        return true;
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

export class JavaString {
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
    return Array.from({ length: Math.trunc(length) }, () => cloneDefault(value));
}

export function java2DArray<T>(height: number, width: number, value: T): T[][] {
    return javaArray(height, null as T).map(() => javaArray(width, value));
}

export function java3DArray<T>(a: number, b: number, c: number, value: T): T[][][] {
    return javaArray(a, null as T[][]).map(() => java2DArray(b, c, value));
}

export function java4DArray<T>(a: number, b: number, c: number, d: number, value: T): T[][][][] {
    return javaArray(a, null as T[][][]).map(() => java3DArray(b, c, d, value));
}

export function resourceStream(ref: string): ArrayBuffer | null {
    return ResourceLoader.getResourceAsStream(ref);
}

function cloneDefault<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.slice() as T;
    }
    return value;
}
