import { BinaryReader, ResourceLoader } from "slick2d-ts";

/** Opens one of Jackal's packed binary resources with Java-compatible reads. */
export function openDataResource(ref: string): BinaryReader {
    const stream = ResourceLoader.getResourceAsStream(ref);
    if (stream === null) {
        throw new Error(`Missing binary resource: ${ref}`);
    }
    return new BinaryReader(stream);
}
