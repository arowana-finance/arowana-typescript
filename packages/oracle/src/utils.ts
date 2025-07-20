export function parseJSONL<T>(jsonl: string): T[] {
    // Split string into lines (handles both \n and \r\n)
    const lines = jsonl.split(/\r?\n/);
    // Parse each line and filter out empty ones
    return lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
}

export function toJSONL<T>(array: T[]): string {
    return array.map((item) => JSON.stringify(item)).join('\n');
}
