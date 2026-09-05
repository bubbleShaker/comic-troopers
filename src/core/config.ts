/** ゲームバランスの数値を1か所に集める。単位はメートル / 秒。 */

/**
 * フィールドは円形。外周から敵が湧くので、中心からの距離だけで境界判定できる形にした。
 * 半径は「縦持ちで見える横幅（約 22m）」に対して広すぎない値にしてある。
 */
export const FIELD_RADIUS = 20

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

export const ENEMY = {
  radius: 0.8,
  /** 自機より遅くする。囲まれる緊張感と、逃げ切れる余地の両立 */
  speed: 5.2,
  hp: 1,
  /** 同時に存在できる上限。これを超える湧きは捨てる（描画とロジックの負荷対策） */
  max: 44,
} as const

export const WEAPON = {
  /**
   * ロックオンできる距離。縦持ちの水平視界（自機から左右に約 11m）に収める。
   * これより長いと「画面外の敵を撃っている」状態になり、何が起きているか分からなくなる。
   */
  range: 11,
  /** 発射間隔(秒) */
  interval: 0.13,
  bulletSpeed: 46,
  bulletRadius: 0.35,
  /** 弾の寿命(秒)。射程を少し超えたら消えるように */
  bulletLife: 0.6,
} as const

/** ウェーブ。until は「この秒数まで」。最後の要素は残り全部を受け持つ */
export const WAVES = [
  { until: 12, interval: 1.0, count: 1 },
  { until: 28, interval: 0.75, count: 2 },
  { until: 45, interval: 0.6, count: 2 },
  { until: Number.POSITIVE_INFINITY, interval: 0.42, count: 3 },
] as const
