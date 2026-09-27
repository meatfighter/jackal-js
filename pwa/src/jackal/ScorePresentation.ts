/** Derived presentation only. Numeric validity is enforced at the state boundary. */
export function formatScore(score: number): string {
    const digits = score.toString();
    return digits.length < 6 ? "000000".substring(0, 6 - digits.length) + digits : digits;
}

export function finalScoreText(score: number): string {
    return "final score: " + formatScore(score);
}
