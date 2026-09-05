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
  /** 被弾直後の無敵時間。群れに触れて一度に何度も食らうのを防ぐ */
  hitInvulnerable: 0.7,
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
  speed: 6.0,
  /**
   * 2発必要にして撃破速度を落とす。1発だと自動射撃が湧きに勝ってしまい、
   * 何もせず放置しても敵が寄ってこない＝操作する意味が無いゲームになる。
   */
  hp: 2,
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

/**
 * ウェーブ。until は「この秒数まで」。最後の要素は残り全部を受け持つ。
 * 自動射撃の撃破速度（約 3.8体/秒）を基準に、序盤は余裕、終盤は捌ききれない量にしてある。
 */
export const WAVES = [
  { until: 12, interval: 0.9, count: 1 },
  { until: 28, interval: 0.7, count: 2 },
  { until: 45, interval: 0.55, count: 2 },
  { until: Number.POSITIVE_INFINITY, interval: 0.45, count: 3 },
] as const

/** 1回のラン（プレイ）のルール */
export const RUN = {
  /** 制限時間(秒) */
  duration: 60,
  /** 撃破1体の基礎点 */
  killScore: 100,
  /** コンボ1につき増える倍率 */
  comboStep: 0.1,
  /**
   * 倍率の上限。低いと早々に頭打ちになり、後半のコンボ維持に意味が無くなる。
   * comboStep 0.1 なので 70 連続撃破で到達する。
   */
  comboMax: 8,
  /** 被弾時の減点 */
  hitPenalty: 300,
  /** 残りこの秒数を切ったら湧きを増やす（終盤の追い込み） */
  rushAt: 10,
  /** 追い込み中の湧き間隔の倍率 */
  rushFactor: 0.7,
} as const
