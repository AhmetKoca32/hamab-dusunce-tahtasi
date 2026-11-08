/**
 * `fn`'i en çok `attempts` kez dener; her başarısızlıktan sonra `delays[i]` ms bekler (liste biterse sonuncusu).
 * `shouldRetry(error)` false dönerse hemen bırakır ve hatayı fırlatır. `fn`, kaçıncı deneme olduğunu (0'dan) alır.
 */
export async function retry(fn, {
    attempts = 3,
    delays = [400, 1200],
    shouldRetry = () => true,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;
            if (attempt === attempts - 1 || !shouldRetry(error)) break;
            await sleep(delays[Math.min(attempt, delays.length - 1)]);
        }
    }
    throw lastError;
}
