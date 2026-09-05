import { ENEMY, FIELD_RADIUS, WAVES } from './config'
import type { World } from './entities'
import { range } from './rng'
import { distance, vec2 } from './types'

/** 自機からこの距離より近くには湧かせない（湧いた瞬間に接触するのを防ぐ） */
const MIN_SPAWN_DISTANCE = 10
/** 湧き位置の抽選を諦めるまでの回数。無限リトライにすると決定性が保てない */
const MAX_SPAWN_ATTEMPTS = 5

export type Wave = (typeof WAVES)[number]

export function currentWave(time: number): Wave {
  for (const wave of WAVES) {
    if (time < wave.until) return wave
  }
  // WAVES の最後は until が Infinity なのでここには来ないが、型の穴を塞いでおく
  return WAVES[WAVES.length - 1] as Wave
}

/** フィールド外周に1体湧かせる。上限に達している時は何もしない。 */
function spawnOne(world: World): void {
  if (world.enemies.length >= ENEMY.max) return

  const radius = FIELD_RADIUS - ENEMY.radius - 0.2
  // どの候補も近すぎた場合は「その中で最も遠い候補」を使う。
  // 最後に引いた候補をそのまま使うと、自機に密着した位置に湧きうる。
  let pos = vec2()
  let bestDistance = -1
  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
    const angle = range(world.rng, 0, Math.PI * 2)
    const candidate = vec2(Math.sin(angle) * radius, Math.cos(angle) * radius)
    const d = distance(candidate, world.player.pos)
    if (d > bestDistance) {
      bestDistance = d
      pos = candidate
    }
    if (d >= MIN_SPAWN_DISTANCE) break
  }

  world.enemies.push({ id: world.nextId++, pos, hp: ENEMY.hp, hitFlash: 0 })
}

export function updateSpawner(world: World, dt: number): void {
  const wave = currentWave(world.time)
  world.spawnTimer -= dt
  // dt が大きいフレームでも溜まった湧きを取りこぼさないよう、間隔ぶん繰り返す
  while (world.spawnTimer <= 0) {
    for (let i = 0; i < wave.count; i++) spawnOne(world)
    world.spawnTimer += wave.interval
  }
}
