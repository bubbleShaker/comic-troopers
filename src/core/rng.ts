/**
 * シード付き乱数（mulberry32）。
 * 敵の湧き位置に乱数が要る一方で stepWorld の決定性は保ちたいので、
 * Math.random() ではなく World が持つこの RNG を使う。テストでは固定シードを渡す。
 */
export type Rng = () => number

export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** min 以上 max 未満 */
export const range = (rng: Rng, min: number, max: number): number => min + rng() * (max - min)
