import { updateBullets, updateEnemies, updateWeapon } from './combat'
import { RUN } from './config'
import type { PlayerInput, World } from './entities'
import { createPlayer, updatePlayer } from './player'
import { createRng } from './rng'
import { updateScore } from './score'
import { updateSpawner } from './spawner'
import { vec2 } from './types'

export type { Bullet, Enemy, Phase, Player, PlayerInput, World, WorldEvent } from './entities'
export { comboMultiplier } from './score'
export { isDashing, isInvulnerable } from './player'
export { selectLockTarget } from './combat'

export const NO_INPUT: PlayerInput = { move: vec2(), dash: null }

/** seed を渡すと敵の湧きが再現できる。テストと、後の「同じ配置でリトライ」に使える。 */
export function createWorld(seed = 1): World {
  return {
    phase: 'ready',
    time: 0,
    remaining: RUN.duration,
    score: 0,
    combo: 0,
    maxCombo: 0,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    events: [],
    rng: createRng(seed),
    spawnTimer: 0.5,
    fireTimer: 0,
    lockTargetId: null,
    kills: 0,
    nextId: 1,
  }
}

/** ランを開始する。タイトルからの「タップで開始」で呼ぶ。 */
export function startRun(world: World): void {
  world.phase = 'playing'
  world.remaining = RUN.duration
}

/** 時間切れ。以降は stepWorld を呼んでも世界が動かない。 */
export function finishRun(world: World): void {
  world.phase = 'finished'
  world.remaining = 0
}

/**
 * ワールドを dt 秒だけ進める。同じ状態と入力からは常に同じ結果になる
 * （乱数は World が持つ RNG、時刻は world.time のみを参照する）。
 * three.js に依存しないので Node 上で単体テストできる。
 */
export function stepWorld(world: World, input: PlayerInput, dt: number): void {
  // イベントは1フレームだけ有効。参照を保持されると壊れるので毎回空にする。
  // dt が 0 のフレームでも消す。残すと演出が同じ出来事に二度反応してしまう。
  world.events.length = 0
  if (dt <= 0) return
  // 計測中以外は世界を止める。タイトルとリザルトの背景で敵が動き続けないように。
  if (world.phase !== 'playing') return

  world.time += dt
  world.remaining = Math.max(0, world.remaining - dt)

  updatePlayer(world, input, dt)
  updateSpawner(world, dt)
  updateEnemies(world, dt)
  updateWeapon(world, dt)
  updateBullets(world, dt)
  updateScore(world)

  if (world.remaining <= 0) finishRun(world)
}
