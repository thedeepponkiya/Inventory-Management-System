export function simulateRequest<T>(data: T, delayMs = 300): Promise<T> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(data), delayMs);
    });
}