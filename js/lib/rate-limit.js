/**
 * Kayan pencere hız sınırlayıcı: `perMs` içinde en çok `max` hak verir.
 *
 * Bu bir güvenlik önlemi DEĞİL, bir kaza önlemidir: tarayıcıda çalıştığı için kötü niyetli bir komut dosyası
 * onu atlar (asıl koruma sunucu kuralları ve App Check'tir). Hatalı bir döngünün, çift tıklamanın ya da basılı
 * kalan bir tuşun günlük yazma kotasını tüketmesini engeller.
 */
export function createRateLimiter({ max, perMs, now = () => Date.now() }) {
    const stamps = [];
    const prune = t => { while (stamps.length && t - stamps[0] >= perMs) stamps.shift(); };

    return {
        /** İzin varsa bir hak harcar ve true döner; yoksa false. */
        tryTake() {
            const t = now();
            prune(t);
            if (stamps.length >= max) return false;
            stamps.push(t);
            return true;
        },
        /** Bir sonraki hakkın açılmasına kalan süre (ms); hak varsa 0. */
        waitMs() {
            const t = now();
            prune(t);
            return stamps.length < max ? 0 : perMs - (t - stamps[0]);
        }
    };
}
