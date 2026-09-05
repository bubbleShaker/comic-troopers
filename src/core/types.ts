/** XZ 平面上の位置・方向。Y（高さ）は描画側の都合なので core では扱わない。 */
export type Vec2 = { x: number; z: number }

export const vec2 = (x = 0, z = 0): Vec2 => ({ x, z })

export const length = (v: Vec2): number => Math.hypot(v.x, v.z)

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z)

/** 長さ 0 のベクトルは正規化できないので、その場合だけ {0,0} を返す。 */
export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  return len === 0 ? vec2() : vec2(v.x / len, v.z / len)
}

/** 長さが max を超える場合だけ max へ切り詰める。スティック入力の正規化に使う。 */
export function clampLength(v: Vec2, max: number): Vec2 {
  const len = length(v)
  return len <= max ? vec2(v.x, v.z) : vec2((v.x / len) * max, (v.z / len) * max)
}

/** 角度 a から b へ、最短回り（±π を跨ぐ側）で最大 maxDelta だけ近づける。 */
export function rotateTowards(a: number, b: number, maxDelta: number): number {
  let diff = b - a
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  if (Math.abs(diff) <= maxDelta) return b
  return a + Math.sign(diff) * maxDelta
}

/** cur から target へ、1回の呼び出しで最大 maxDelta だけ近づける。加速・減速の共通処理。 */
export function moveTowards(cur: Vec2, target: Vec2, maxDelta: number): Vec2 {
  const dx = target.x - cur.x
  const dz = target.z - cur.z
  const d = Math.hypot(dx, dz)
  if (d <= maxDelta || d === 0) return vec2(target.x, target.z)
  return vec2(cur.x + (dx / d) * maxDelta, cur.z + (dz / d) * maxDelta)
}
