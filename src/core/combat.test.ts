import { describe, expect, it } from 'vitest'
import { selectLockTarget, updateBullets, updateEnemies, updateWeapon } from './combat'
import { ENEMY, WEAPON } from './config'
import type { World } from './entities'
import { distance, vec2, type Vec2 } from './types'
import { createWorld } from './world'

/** 敵の配置だけを指定してワールドを組む。spawner は動かさない。 */
function withEnemies(positions: Vec2[]): World {
  const world = createWorld()
  world.enemies = positions.map((pos, i) => ({ id: i + 1, pos, hp: ENEMY.hp, hitFlash: 0 }))
  return world
}

const DT = 1 / 60

describe('selectLockTarget', () => {
  it('射程内で最も近い敵を選ぶ', () => {
    const world = withEnemies([vec2(0, 10), vec2(0, 3), vec2(6, 0)])
    expect(selectLockTarget(world)?.pos).toEqual(vec2(0, 3))
  })

  it('射程外しかいなければ選ばない', () => {
    const world = withEnemies([vec2(0, WEAPON.range + 1)])
    expect(selectLockTarget(world)).toBeNull()
  })

  it('敵がいなければ選ばない', () => {
    expect(selectLockTarget(createWorld())).toBeNull()
  })
})

describe('updateWeapon', () => {
  it('ロックオン対象がいなければ撃たない', () => {
    const world = createWorld()
    for (let i = 0; i < 60; i++) updateWeapon(world, DT)
    expect(world.bullets).toHaveLength(0)
  })

  it('対象がいれば発射間隔ごとに撃つ', () => {
    const world = withEnemies([vec2(0, 5)])
    // 1発目は即座に出るので、1秒ぶんで interval 分 + 1 発
    for (let i = 0; i < 60; i++) updateWeapon(world, DT)
    expect(world.bullets.length).toBeCloseTo(Math.floor(1 / WEAPON.interval) + 1, 0)
  })

  it('対象を失っても次弾が溜まらない（復帰直後の一斉射撃を防ぐ）', () => {
    const world = createWorld()
    for (let i = 0; i < 300; i++) updateWeapon(world, DT)
    world.enemies = [{ id: 1, pos: vec2(0, 5), hp: ENEMY.hp, hitFlash: 0 }]
    updateWeapon(world, DT)
    expect(world.bullets).toHaveLength(1)
  })
})

describe('弾のヒット', () => {
  it('弾が当たると敵が消えて kill イベントと撃破数が出る', () => {
    const world = withEnemies([vec2(0, 5)])
    for (let i = 0; i < 30; i++) {
      updateWeapon(world, DT)
      updateBullets(world, DT)
      if (world.enemies.length === 0) break
    }
    expect(world.enemies).toHaveLength(0)
    expect(world.kills).toBe(1)
    expect(world.events.some((e) => e.type === 'kill')).toBe(true)
  })

  it('当たった弾は消える（貫通しない）', () => {
    const world = withEnemies([vec2(0, 5), vec2(0, 6)])
    for (let i = 0; i < 30; i++) {
      updateWeapon(world, DT)
      updateBullets(world, DT)
    }
    // 2体とも倒れるが、1発が2体を同時に貫くことはない
    expect(world.kills).toBe(2)
  })

  it('寿命が尽きた弾は消える', () => {
    const world = withEnemies([vec2(0, 5)])
    updateWeapon(world, DT)
    world.enemies = []
    for (let i = 0; i < Math.ceil(WEAPON.bulletLife / DT) + 2; i++) updateBullets(world, DT)
    expect(world.bullets).toHaveLength(0)
  })
})

describe('敵と自機の接触', () => {
  it('接触すると playerHit が出て敵は消える', () => {
    const world = withEnemies([vec2(0, 1)])
    updateEnemies(world, DT)
    expect(world.events.some((e) => e.type === 'playerHit')).toBe(true)
    expect(world.enemies).toHaveLength(0)
  })

  it('無敵中はすり抜けて被弾しない', () => {
    const world = withEnemies([vec2(0, 1)])
    world.player.invulnerable = 1
    updateEnemies(world, DT)
    expect(world.events).toHaveLength(0)
    expect(world.enemies).toHaveLength(1)
  })
})

describe('敵の挙動', () => {
  it('自機へ近づく', () => {
    const world = withEnemies([vec2(0, 20)])
    const before = distance(world.enemies[0]!.pos, world.player.pos)
    for (let i = 0; i < 30; i++) updateEnemies(world, DT)
    expect(distance(world.enemies[0]!.pos, world.player.pos)).toBeLessThan(before)
  })

  it('重なった敵は押し合って離れる', () => {
    const world = withEnemies([vec2(0.05, 20), vec2(-0.05, 20)])
    for (let i = 0; i < 30; i++) updateEnemies(world, DT)
    const [a, b] = world.enemies
    expect(distance(a!.pos, b!.pos)).toBeGreaterThan(0.5)
  })
})

describe('低フレームレートでの当たり判定', () => {
  it('dt が大きくても弾が敵をすり抜けない', () => {
    // main.ts の dt 上限。1フレームで 2.3m 進み、敵の当たり半径(1.15m)より大きい
    const SLOW_DT = 1 / 20
    const world = withEnemies([vec2(0.5, 8)])
    for (let i = 0; i < 20; i++) {
      updateWeapon(world, SLOW_DT)
      updateBullets(world, SLOW_DT)
      if (world.enemies.length === 0) break
    }
    expect(world.kills).toBe(1)
  })
})

describe('同一フレームでの多重判定', () => {
  it('1体の敵が二重に撃破されない', () => {
    const world = withEnemies([vec2(0, 3)])
    // 同じ敵へ向かう弾を複数用意し、同じフレームで到達させる
    for (let i = 0; i < 4; i++) {
      world.bullets.push({
        id: 100 + i,
        pos: vec2(0, 2.9 - i * 0.01),
        vel: vec2(0, WEAPON.bulletSpeed),
        life: 1,
      })
    }
    updateBullets(world, 1 / 60)
    expect(world.kills).toBe(1)
    expect(world.events.filter((e) => e.type === 'kill')).toHaveLength(1)
  })

  it('群れに触れても1フレームで何度も被弾しない', () => {
    const world = withEnemies([vec2(0, 1), vec2(1, 0), vec2(-1, 0)])
    updateEnemies(world, 1 / 60)
    expect(world.events.filter((e) => e.type === 'playerHit')).toHaveLength(1)
    // 触れていた残りの敵は消えずに残る
    expect(world.enemies.length).toBeGreaterThan(0)
  })
})
