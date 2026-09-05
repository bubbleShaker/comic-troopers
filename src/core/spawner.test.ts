import { describe, expect, it } from 'vitest'
import { ENEMY, FIELD_RADIUS, WAVES } from './config'
import { currentWave, updateSpawner } from './spawner'
import { length } from './types'
import { createWorld } from './world'

describe('currentWave', () => {
  it('経過時間でウェーブが進む', () => {
    expect(currentWave(0)).toBe(WAVES[0])
    expect(currentWave(WAVES[0].until)).toBe(WAVES[1])
    expect(currentWave(999)).toBe(WAVES[WAVES.length - 1])
  })

  it('後半ほど湧く間隔が短い', () => {
    expect(currentWave(50).interval).toBeLessThan(currentWave(0).interval)
  })
})

describe('updateSpawner', () => {
  it('時間が経つと敵が湧く', () => {
    const world = createWorld()
    for (let i = 0; i < 120; i++) updateSpawner(world, 1 / 60)
    expect(world.enemies.length).toBeGreaterThan(0)
  })

  it('同時出現数の上限を超えない', () => {
    const world = createWorld()
    for (let i = 0; i < 60 * 90; i++) updateSpawner(world, 1 / 60)
    expect(world.enemies.length).toBeLessThanOrEqual(ENEMY.max)
  })

  it('湧く位置はフィールド内に収まる', () => {
    const world = createWorld()
    for (let i = 0; i < 600; i++) updateSpawner(world, 1 / 60)
    for (const enemy of world.enemies) {
      expect(length(enemy.pos)).toBeLessThanOrEqual(FIELD_RADIUS)
    }
  })

  it('大きい dt でも湧きを取りこぼさない', () => {
    const slow = createWorld()
    updateSpawner(slow, 3)
    expect(slow.enemies.length).toBeGreaterThan(1)
  })

  it('シードが同じなら同じ配置になる', () => {
    const a = createWorld(42)
    const b = createWorld(42)
    for (let i = 0; i < 300; i++) {
      updateSpawner(a, 1 / 60)
      updateSpawner(b, 1 / 60)
    }
    expect(a.enemies.map((e) => e.pos)).toEqual(b.enemies.map((e) => e.pos))
  })
})
