import { DASH, FIELD_RADIUS, PLAYER } from './config'
import { clampLength, length, moveTowards, normalize, rotateTowards, vec2, type Vec2 } from './types'

export type PlayerInput = {
  /** 移動入力。長さ 0〜1。1 を超える分は切り詰められる */
  move: Vec2
  /** このフレームに発生したダッシュ要求。無ければ null */
  dash: Vec2 | null
}

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

export type World = {
  /** ラン開始からの経過秒数 */
  time: number
  player: Player
}

export const NO_INPUT: PlayerInput = { move: vec2(), dash: null }

export function createWorld(): World {
  return {
    time: 0,
    player: {
      pos: vec2(0, 0),
      vel: vec2(0, 0),
      facing: 0,
      dashTime: 0,
      dashDir: vec2(0, 1),
      cooldown: 0,
      invulnerable: 0,
    },
  }
}

export const isDashing = (p: Player): boolean => p.dashTime > 0
export const isInvulnerable = (p: Player): boolean => p.invulnerable > 0

/**
 * ワールドを dt 秒だけ進める。同じ状態と入力からは常に同じ結果になる（乱数・時刻を参照しない）。
 * three.js に依存しないので Node 上で単体テストできる。
 */
export function stepWorld(world: World, input: PlayerInput, dt: number): void {
  if (dt <= 0) return
  world.time += dt
  const p = world.player
  const wasDashing = p.dashTime > 0

  p.cooldown = Math.max(0, p.cooldown - dt)
  p.invulnerable = Math.max(0, p.invulnerable - dt)

  // ダッシュ開始。クールダウン中とダッシュ中は受け付けない。
  if (input.dash && p.dashTime <= 0 && p.cooldown <= 0) {
    const dir = normalize(input.dash)
    if (length(dir) > 0) {
      p.dashDir = dir
      p.dashTime = DASH.duration
      p.cooldown = DASH.cooldown
      p.invulnerable = DASH.invulnerable
    }
  }

  if (p.dashTime > 0) {
    // 最後のフレームは「残っていた時間」ぶんだけ進める。dt をまたいで超過分を動くと
    // フレームレートの低い端末ほどダッシュ距離が伸びてしまうため。
    const used = Math.min(dt, p.dashTime)
    p.dashTime -= used
    const rate = used / dt
    p.vel = vec2(p.dashDir.x * DASH.speed * rate, p.dashDir.z * DASH.speed * rate)
  } else {
    // ダッシュ速度(34m/s)が通常移動へ持ち越されると抜け際に長く滑るので、通常の上限まで落とす。
    p.vel = clampLength(p.vel, PLAYER.speed)
    const move = clampLength(input.move, 1)
    const desired = vec2(move.x * PLAYER.speed, move.z * PLAYER.speed)
    p.vel = moveTowards(p.vel, desired, PLAYER.acceleration * dt)
  }

  p.pos = vec2(p.pos.x + p.vel.x * dt, p.pos.z + p.vel.z * dt)

  // 円形フィールドの外へは出さない。押し付けても速度が溜まらないよう外向き成分を消す。
  const limit = FIELD_RADIUS - PLAYER.radius
  const dist = length(p.pos)
  if (dist > limit) {
    const n = vec2(p.pos.x / dist, p.pos.z / dist)
    p.pos = vec2(n.x * limit, n.z * limit)
    const outward = p.vel.x * n.x + p.vel.z * n.z
    if (outward > 0) p.vel = vec2(p.vel.x - n.x * outward, p.vel.z - n.z * outward)
  }

  // 向きはダッシュ方向 > 移動入力 の優先度で決める。入力が無い間は現状維持。
  // 判定にはフレーム開始時点の状態を使う。dashTime は上で減算済みで、
  // 最終フレームはまだダッシュ速度で進んでいるのに isDashing が false になっているため。
  const facingTarget = wasDashing ? p.dashDir : clampLength(input.move, 1)
  if (length(facingTarget) > 0.01) {
    p.facing = rotateTowards(p.facing, Math.atan2(facingTarget.x, facingTarget.z), PLAYER.turnRate * dt)
  }
}
