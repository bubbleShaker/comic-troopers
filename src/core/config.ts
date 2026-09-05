/** ゲームバランスの数値を1か所に集める。単位はメートル / 秒。 */

/** フィールドは円形。外周から敵が湧くので、中心からの距離だけで境界判定できる形にした。 */
export const FIELD_RADIUS = 26

export const PLAYER = {
  radius: 0.6,
  /** 最高速度 */
  speed: 10,
  /** 停止・方向転換の機敏さ。大きいほどキビキビ動く */
  acceleration: 60,
  /** 1秒あたりの回頭量（ラジアン） */
  turnRate: Math.PI * 4,
} as const

export const DASH = {
  speed: 34,
  duration: 0.16,
  cooldown: 0.85,
  /** 無敵はダッシュ本体より少し長く残し、抜け際の被弾を許す */
  invulnerable: 0.28,
} as const
