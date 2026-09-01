import { getDeploymentStorageKey } from "./DeploymentStorageKeys.js";

export interface DeploymentStorageReadResult {
    readonly available: boolean;
    readonly value: string | null;
}

/** Small, deployment-scoped boundary around browser storage failures. */
export class DeploymentStorageEntry {
    public constructor(
        private readonly baseKey: string,
        private readonly description: string
    ) {}

    private get key(): string {
        return getDeploymentStorageKey(this.baseKey);
    }

    public read(): DeploymentStorageReadResult {
        try {
            return { available: true, value: localStorage.getItem(this.key) };
        } catch (error) {
            console.warn(`Unable to read ${this.description}.`, error);
            return { available: false, value: null };
        }
    }

    public write(value: string): boolean {
        try {
            localStorage.setItem(this.key, value);
            return true;
        } catch (error) {
            console.warn(`Unable to save ${this.description}.`, error);
            return false;
        }
    }

    public remove(): boolean {
        try {
            localStorage.removeItem(this.key);
            return true;
        } catch (error) {
            console.warn(`Unable to clear ${this.description}.`, error);
            return false;
        }
    }
}
