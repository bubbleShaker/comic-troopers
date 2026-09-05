import type { Rng } from './rng'
import type { Vec2 } from './types'

export type Player = {
  pos: Vec2
  vel: Vec2
  /** 機体の向き。+Z を 0 とし、+X 側へ回すと正（= atan2(x, z)） */
  facing: number
  /** 残りダッシュ時間。0 より大きい間がダッシュ中 */
  dashTime: number
  dashDir: Vec2
  /** 残りクールダウン */
  cooldown: number
  /** 残り無敵時間 */
  invulnerable: number
}

export type Enemy = {
  id: number
  pos: Vec2
  hp: number
  /** 被弾直後の点滅用に残す時間(秒)。描画側だけが読む */
  hitFlash: number
}

export type Bullet = {
  id: number
  pos: Vec2
  vel: Vec2
  /** 残り寿命(秒) */
  life: number
}

/**
 * このフレームに起きた出来事。演出（オノマトペ・シェイク）はこれを読むだけでよく、
 * 描画側にゲームロジックが漏れない。
 */
export type WorldEvent =
  | { type: 'hit'; pos: Vec2 }
  | { type: 'kill'; pos: Vec2 }
  | { type: 'playerHit'; pos: Vec2 }

export type World = {
  /** ラン開始からの経過秒数 */
  time: number
  player: Player
  enemies: Enemy[]
  bullets: Bullet[]
  /** 毎フレーム作り直される。参照を保持しないこと */
  events: WorldEvent[]
  rng: Rng
  /** 次の湧きまでの残り時間 */
  spawnTimer: number
  /** 次の発射までの残り時間 */
  fireTimer: number
  /** 現在ロックオンしている敵の id */
  lockTargetId: number | null
  /** 累計撃破数 */
  kills: number
  nextId: number
}

export type PlayerInput = {
  /** 移動入力。長さ 0〜1。1 を超える分は切り詰められる */
  move: Vec2
  /** このフレームに発生したダッシュ要求。無ければ null */
  dash: Vec2 | null
}
