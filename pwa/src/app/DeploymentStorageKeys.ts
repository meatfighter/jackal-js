const FALLBACK_LOCATION_HREF = "https://example.invalid/";

export function getDeploymentPathId(locationHref = getCurrentLocationHref()): string {
    return encodeURIComponent(new URL("./", locationHref).pathname);
}

export function getDeploymentStorageKey(baseKey: string, locationHref = getCurrentLocationHref()): string {
    return `${baseKey}:${getDeploymentPathId(locationHref)}`;
}

function getCurrentLocationHref(): string {
    return globalThis.location?.href ?? FALLBACK_LOCATION_HREF;
}
