import { ENEMY, FIELD_RADIUS, PLAYER, WEAPON } from './config'
import type { Enemy, World } from './entities'
import { distance, normalize, vec2 } from './types'
import { isInvulnerable } from './player'

/** 敵同士が完全に重なると1体に見えるので、弱く押しのける */
const SEPARATION = 14

/** 射程内で最も近い敵。いなければ null。 */
export function selectLockTarget(world: World): Enemy | null {
  let best: Enemy | null = null
  let bestDist: number = WEAPON.range
  for (const enemy of world.enemies) {
    const d = distance(enemy.pos, world.player.pos)
    if (d < bestDist) {
      best = enemy
      bestDist = d
    }
  }
  return best
}

export function updateEnemies(world: World, dt: number): void {
  const player = world.player
  const survivors: Enemy[] = []

  for (const enemy of world.enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)

    // 自機へ直進する。虫の群れなので賢い回避はしない。
    const toPlayer = normalize(vec2(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z))
    let vx = toPlayer.x * ENEMY.speed
    let vz = toPlayer.z * ENEMY.speed

    for (const other of world.enemies) {
      if (other === enemy) continue
      const dx = enemy.pos.x - other.pos.x
      const dz = enemy.pos.z - other.pos.z
      const d = Math.hypot(dx, dz)
      const overlap = ENEMY.radius * 2 - d
      if (d > 0 && overlap > 0) {
        vx += (dx / d) * overlap * SEPARATION
        vz += (dz / d) * overlap * SEPARATION
      }
    }

    enemy.pos = vec2(enemy.pos.x + vx * dt, enemy.pos.z + vz * dt)

    // 押し合いでフィールド外へ出ないようにする
    const dist = Math.hypot(enemy.pos.x, enemy.pos.z)
    const limit = FIELD_RADIUS - ENEMY.radius
    if (dist > limit) {
      enemy.pos = vec2((enemy.pos.x / dist) * limit, (enemy.pos.z / dist) * limit)
    }

    // 自機との接触。無敵中はすり抜けさせる（ダッシュで抜ける動きを成立させるため）
    if (distance(enemy.pos, player.pos) < ENEMY.radius + PLAYER.radius) {
      if (!isInvulnerable(player)) {
        world.events.push({ type: 'playerHit', pos: enemy.pos })
        continue // 接触した敵は消える
      }
    }

    survivors.push(enemy)
  }

  world.enemies = survivors
}

export function updateWeapon(world: World, dt: number): void {
  world.fireTimer -= dt

  const target = selectLockTarget(world)
  world.lockTargetId = target?.id ?? null
  if (!target) {
    // 撃たない間に発射タイマーが溜まりすぎないよう、次弾は即撃てる状態で止める
    world.fireTimer = Math.max(world.fireTimer, 0)
    return
  }

  while (world.fireTimer <= 0) {
    const dir = normalize(vec2(target.pos.x - world.player.pos.x, target.pos.z - world.player.pos.z))
    world.bullets.push({
      id: world.nextId++,
      pos: vec2(world.player.pos.x, world.player.pos.z),
      vel: vec2(dir.x * WEAPON.bulletSpeed, dir.z * WEAPON.bulletSpeed),
      life: WEAPON.bulletLife,
    })
    world.fireTimer += WEAPON.interval
  }
}

export function updateBullets(world: World, dt: number): void {
  const survivors = []

  for (const bullet of world.bullets) {
    bullet.life -= dt
    if (bullet.life <= 0) continue
    bullet.pos = vec2(bullet.pos.x + bullet.vel.x * dt, bullet.pos.z + bullet.vel.z * dt)

    let hit = false
    for (const enemy of world.enemies) {
      if (distance(bullet.pos, enemy.pos) > ENEMY.radius + WEAPON.bulletRadius) continue
      enemy.hp -= 1
      enemy.hitFlash = 0.12
      hit = true
      if (enemy.hp <= 0) {
        world.events.push({ type: 'kill', pos: enemy.pos })
        world.kills += 1
      } else {
        world.events.push({ type: 'hit', pos: enemy.pos })
      }
      break
    }
    if (hit) continue

    survivors.push(bullet)
  }

  world.bullets = survivors
  world.enemies = world.enemies.filter((enemy) => enemy.hp > 0)
}
