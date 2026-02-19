const rawThreshold = Number.parseInt(String(import.meta.env.VITE_LOW_CREDITS_THRESHOLD ?? "100"), 10);

export const LOW_CREDITS_THRESHOLD = Number.isFinite(rawThreshold) && rawThreshold >= 0 ? rawThreshold : 100;
