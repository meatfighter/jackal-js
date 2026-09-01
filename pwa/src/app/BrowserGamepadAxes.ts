import type { Input } from "slick2d-ts";

export const CONTROLLER_INDEX_LIMIT = 16;
export const GAMEPAD_AXIS_LIMIT = 16;
export const AXIS_THRESHOLD = 0.5;
export const AXIS_RECENTER_THRESHOLD = 0.05;
export const EXTRA_HORIZONTAL_AXES: readonly number[] = [2, 6];
export const EXTRA_VERTICAL_AXES: readonly number[] = [3, 7];

export function createExtraAxisBaselines(): number[] {
    return new Array<number>(CONTROLLER_INDEX_LIMIT * GAMEPAD_AXIS_LIMIT).fill(Number.NaN);
}

export function resetExtraAxisBaselines(baselines: number[]): void {
    baselines.fill(Number.NaN);
}

export function isAnyCalibratedAxisLessThan(input: Input, baselines: number[], axes: readonly number[], threshold: number): boolean {
    for (let controller = 0; controller < CONTROLLER_INDEX_LIMIT; controller++) {
        for (let i = 0; i < axes.length; i++) {
            if (readCalibratedExtraAxisValue(input, baselines, controller, axes[i]) < threshold) {
                return true;
            }
        }
    }
    return false;
}

export function isAnyCalibratedAxisGreaterThan(input: Input, baselines: number[], axes: readonly number[], threshold: number): boolean {
    for (let controller = 0; controller < CONTROLLER_INDEX_LIMIT; controller++) {
        for (let i = 0; i < axes.length; i++) {
            if (readCalibratedExtraAxisValue(input, baselines, controller, axes[i]) > threshold) {
                return true;
            }
        }
    }
    return false;
}

export function readCalibratedExtraAxisValue(input: Input, baselines: number[], controller: number, axis: number): number {
    try {
        if (input.getAxisCount(controller) <= axis) {
            return 0;
        }
        const value = input.getAxisValue(controller, axis);
        const baselineIndex = controller * GAMEPAD_AXIS_LIMIT + axis;
        let baseline = baselines[baselineIndex];
        if (Number.isNaN(baseline)) {
            baseline = value;
            baselines[baselineIndex] = baseline;
        }
        if (Math.abs(value) <= AXIS_RECENTER_THRESHOLD) {
            baselines[baselineIndex] = 0;
            return 0;
        }
        return value - baseline;
    } catch {
        return 0;
    }
}
