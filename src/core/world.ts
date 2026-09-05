import { updateBullets, updateEnemies, updateWeapon } from './combat'
import type { PlayerInput, World } from './entities'
import { createPlayer, updatePlayer } from './player'
import { createRng } from './rng'
import { updateSpawner } from './spawner'
import { vec2 } from './types'

export type { Bullet, Enemy, Player, PlayerInput, World, WorldEvent } from './entities'
export { isDashing, isInvulnerable } from './player'
export { selectLockTarget } from './combat'

export const NO_INPUT: PlayerInput = { move: vec2(), dash: null }

/** seed を渡すと敵の湧きが再現できる。テストと、後の「同じ配置でリトライ」に使える。 */
export function createWorld(seed = 1): World {
  return {
    time: 0,
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

/**
 * ワールドを dt 秒だけ進める。同じ状態と入力からは常に同じ結果になる
 * （乱数は World が持つ RNG、時刻は world.time のみを参照する）。
 * three.js に依存しないので Node 上で単体テストできる。
 */
export function stepWorld(world: World, input: PlayerInput, dt: number): void {
  if (dt <= 0) return
  // イベントは1フレームだけ有効。参照を保持されると壊れるので毎回空にする。
  world.events.length = 0
  world.time += dt

  updatePlayer(world, input, dt)
  updateSpawner(world, dt)
  updateEnemies(world, dt)
  updateWeapon(world, dt)
  updateBullets(world, dt)
}
