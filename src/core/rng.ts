/**
 * シード付き乱数（mulberry32）。
 * 敵の湧き位置に乱数が要る一方で stepWorld の決定性は保ちたいので、
 * Math.random() ではなく World が持つこの RNG を使う。テストでは固定シードを渡す。
 *
 * 関数ではなくオブジェクトにしてあるのは、内部状態を World のスナップショット
 * （JSON 化した比較）に含めたいため。クロージャに隠すと状態が比較から抜け落ちる。
 */
export type Rng = {
  /** 0 以上 1 未満 */
  next: () => number
  state: number
}

export function createRng(seed: number): Rng {
  const rng: Rng = {
    state: seed >>> 0,
    next: () => {
      rng.state = (rng.state + 0x6d2b79f5) >>> 0
      let t = rng.state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
  return rng
}

/** min 以上 max 未満 */
export const range = (rng: Rng, min: number, max: number): number => min + rng.next() * (max - min)
