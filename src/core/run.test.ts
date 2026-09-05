import { describe, expect, it } from 'vitest'
import { ENEMY, RUN } from './config'
import type { World } from './entities'
import { comboMultiplier, updateScore } from './score'
import { spawnInterval } from './spawner'
import { vec2 } from './types'
import { createWorld, finishRun, NO_INPUT, startRun, stepWorld } from './world'

const DT = 1 / 60

function advance(world: World, seconds: number): void {
  for (let t = 0; t < seconds; t += DT) stepWorld(world, NO_INPUT, DT)
}

describe('ランの進行', () => {
  it('開始前は時間が進まない', () => {
    const world = createWorld()
    advance(world, 2)
    expect(world.phase).toBe('ready')
    expect(world.time).toBe(0)
    expect(world.remaining).toBe(RUN.duration)
    expect(world.enemies).toHaveLength(0)
  })

  it('開始すると残り時間が減る', () => {
    const world = createWorld()
    startRun(world)
    advance(world, 3)
    expect(world.remaining).toBeCloseTo(RUN.duration - 3, 1)
  })

  it('制限時間で終了し、残り時間は 0 になる', () => {
    const world = createWorld()
    startRun(world)
    advance(world, RUN.duration + 1)
    expect(world.phase).toBe('finished')
    expect(world.remaining).toBe(0)
  })

  it('終了後は世界が動かない', () => {
    const world = createWorld()
    startRun(world)
    advance(world, 5)
    finishRun(world)
    const enemiesBefore = world.enemies.length
    const timeBefore = world.time
    advance(world, 3)
    expect(world.time).toBe(timeBefore)
    expect(world.enemies).toHaveLength(enemiesBefore)
  })
})

describe('スコア', () => {
  const killEvent = { type: 'kill', pos: vec2() } as const
  const hitEvent = { type: 'playerHit', pos: vec2() } as const

  it('撃破でコンボとスコアが増える', () => {
    const world = createWorld()
    world.events.push(killEvent)
    updateScore(world)
    expect(world.combo).toBe(1)
    expect(world.score).toBe(Math.round(RUN.killScore * comboMultiplier(1)))
  })

  it('コンボが伸びるほど1体あたりの点が高くなる', () => {
    const world = createWorld()
    world.events.push(killEvent)
    updateScore(world)
    const first = world.score

    world.combo = 20
    world.events.length = 0
    world.events.push(killEvent)
    const before = world.score
    updateScore(world)
    expect(world.score - before).toBeGreaterThan(first)
  })

  it('コンボ倍率には上限がある', () => {
    expect(comboMultiplier(10_000)).toBe(RUN.comboMax)
  })

  it('被弾でコンボが切れて減点される', () => {
    const world = createWorld()
    world.score = 1000
    world.combo = 7
    world.events.push(hitEvent)
    updateScore(world)
    expect(world.combo).toBe(0)
    expect(world.score).toBe(1000 - RUN.hitPenalty)
  })

  it('スコアはマイナスにならない', () => {
    const world = createWorld()
    world.score = 100
    world.events.push(hitEvent)
    updateScore(world)
    expect(world.score).toBe(0)
  })

  it('最大コンボは被弾しても残る', () => {
    const world = createWorld()
    world.events.push(killEvent, killEvent, hitEvent)
    updateScore(world)
    expect(world.maxCombo).toBe(2)
    expect(world.combo).toBe(0)
  })
})

describe('終盤の追い込み', () => {
  it('残り時間が少ないと湧く間隔が短くなる', () => {
    const world = createWorld()
    startRun(world)
    const normal = spawnInterval(world)
    world.remaining = RUN.rushAt - 1
    expect(spawnInterval(world)).toBeLessThan(normal)
  })
})

describe('プレイして成立するか', () => {
  it('放置しても1分間クラッシュせず、敵が湧いてスコアが入る', () => {
    const world = createWorld(7)
    startRun(world)
    advance(world, RUN.duration)
    expect(world.phase).toBe('finished')
    expect(world.kills).toBeGreaterThan(0)
    expect(world.score).toBeGreaterThan(0)
    expect(world.enemies.length).toBeLessThanOrEqual(ENEMY.max)
  })
})

describe('操作しないと不利になるか', () => {
  it('放置プレイでは終盤に囲まれて被弾する', () => {
    // 自動射撃だけで捌ききれてしまうと、動く意味の無いゲームになる。
    // ここが green である限り「プレイヤーの操作に意味がある」ことが保証される。
    const world = createWorld(3)
    startRun(world)
    let hits = 0
    for (let t = 0; t < RUN.duration; t += DT) {
      stepWorld(world, NO_INPUT, DT)
      hits += world.events.filter((e) => e.type === 'playerHit').length
    }
    expect(hits).toBeGreaterThan(0)
  })
})
