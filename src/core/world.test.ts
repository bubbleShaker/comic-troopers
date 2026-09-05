import { describe, expect, it } from 'vitest'
import { DASH, FIELD_RADIUS, PLAYER } from './config'
import { length, vec2 } from './types'
import { createWorld, isDashing, isInvulnerable, NO_INPUT, stepWorld, type World } from './world'

/** dt を細かく刻んで seconds 秒ぶん進める。1フレームで大きく進めると挙動が実機とずれるため。 */
function run(world: World, seconds: number, input = NO_INPUT, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) stepWorld(world, input, dt)
}

describe('stepWorld: 移動', () => {
  it('入力が無ければ止まったままでいる', () => {
    const w = createWorld()
    run(w, 1)
    expect(length(w.player.vel)).toBe(0)
    expect(w.player.pos).toEqual(vec2(0, 0))
  })

  it('最高速度を超えない', () => {
    const w = createWorld()
    run(w, 2, { move: vec2(0, 1), dash: null })
    expect(length(w.player.vel)).toBeCloseTo(PLAYER.speed, 5)
  })

  it('斜め入力でも最高速度を超えない（対角が速くならない）', () => {
    const w = createWorld()
    run(w, 2, { move: vec2(1, 1), dash: null })
    expect(length(w.player.vel)).toBeLessThanOrEqual(PLAYER.speed + 1e-6)
  })

  it('入力を離すと減速して止まる', () => {
    const w = createWorld()
    run(w, 1, { move: vec2(0, 1), dash: null })
    run(w, 1)
    expect(length(w.player.vel)).toBe(0)
  })

  it('フィールドの外へ出ない', () => {
    const w = createWorld()
    run(w, 10, { move: vec2(1, 0), dash: null })
    expect(length(w.player.pos)).toBeLessThanOrEqual(FIELD_RADIUS - PLAYER.radius + 1e-6)
  })

  it('境界に押し付けても外向きの速度が溜まらない', () => {
    const w = createWorld()
    run(w, 10, { move: vec2(1, 0), dash: null })
    expect(w.player.vel.x).toBeCloseTo(0, 5)
  })
})

describe('stepWorld: ダッシュ', () => {
  it('ダッシュ中は無敵になる', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    expect(isDashing(w.player)).toBe(true)
    expect(isInvulnerable(w.player)).toBe(true)
  })

  it('無敵はダッシュ本体より長く残る', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    run(w, DASH.duration)
    expect(isDashing(w.player)).toBe(false)
    expect(isInvulnerable(w.player)).toBe(true)
  })

  it('クールダウン中は再発動しない', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    run(w, DASH.duration + 0.05)
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    expect(isDashing(w.player)).toBe(false)
  })

  it('クールダウン明けには再発動できる', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    run(w, DASH.cooldown + 0.05)
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    expect(isDashing(w.player)).toBe(true)
  })

  it('ダッシュは通常移動より速く、入力方向に関係なく指定方向へ進む', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(0, -1), dash: vec2(0, 1) }, 1 / 60)
    expect(w.player.vel.z).toBeCloseTo(DASH.speed, 5)
  })

  it('長さ 0 のダッシュ要求は無視する', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 0) }, 1 / 60)
    expect(isDashing(w.player)).toBe(false)
    expect(w.player.cooldown).toBe(0)
  })
})

describe('stepWorld: 決定性', () => {
  it('同じ入力からは同じ状態になる', () => {
    const a = createWorld()
    const b = createWorld()
    const input = { move: vec2(0.4, 0.9), dash: null }
    run(a, 1.5, input)
    run(b, 1.5, input)
    expect(a).toEqual(b)
  })
})

describe('stepWorld: フレームレート非依存', () => {
  it('dt が変わってもダッシュ距離が変わらない', () => {
    const distanceAt = (dt: number): number => {
      const w = createWorld()
      stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, dt)
      // ダッシュが終わった時点で測る（それ以降は惰性なのでダッシュ距離ではない）
      while (w.player.dashTime > 0) stepWorld(w, NO_INPUT, dt)
      return w.player.pos.z
    }
    // 60fps と、main.ts の dt 上限である 20fps を比較する
    expect(distanceAt(1 / 60)).toBeCloseTo(distanceAt(1 / 20), 5)
    expect(distanceAt(1 / 60)).toBeCloseTo(DASH.speed * DASH.duration, 5)
  })

  it('ダッシュ直後に通常の最高速度を超えたままにならない', () => {
    const w = createWorld()
    stepWorld(w, { move: vec2(), dash: vec2(0, 1) }, 1 / 60)
    run(w, DASH.duration + 0.05)
    expect(length(w.player.vel)).toBeLessThanOrEqual(PLAYER.speed + 1e-6)
  })

  it('dt が 0 以下なら何も進まない', () => {
    const w = createWorld()
    const before = structuredClone(w)
    stepWorld(w, { move: vec2(0, 1), dash: vec2(0, 1) }, 0)
    expect(w).toEqual(before)
  })
})
