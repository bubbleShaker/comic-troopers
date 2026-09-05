import { describe, expect, it } from 'vitest'
import { clampLength, distanceToSegment, moveTowards, rotateTowards, vec2 } from './types'

describe('distanceToSegment', () => {
  it('線分の途中に最接近する点までの距離を返す', () => {
    expect(distanceToSegment(vec2(0, 0), vec2(0, 10), vec2(2, 5))).toBeCloseTo(2)
  })

  it('線分の外側にある点は端点までの距離になる', () => {
    expect(distanceToSegment(vec2(0, 0), vec2(0, 10), vec2(0, 13))).toBeCloseTo(3)
  })

  it('長さ 0 の線分は点との距離になる', () => {
    expect(distanceToSegment(vec2(1, 1), vec2(1, 1), vec2(1, 4))).toBeCloseTo(3)
  })
})

describe('rotateTowards', () => {
  it('±π をまたぐ時は近い方向へ回る', () => {
    // 3.0 から -3.0 へは、+π 側を通る方が近い
    expect(rotateTowards(3.0, -3.0, 0.1)).toBeCloseTo(3.1)
  })

  it('差が maxDelta 以下ならぴったり合わせる', () => {
    expect(rotateTowards(1.0, 1.05, 0.1)).toBe(1.05)
  })
})

describe('clampLength / moveTowards', () => {
  it('clampLength は上限を超える分だけ切り詰める', () => {
    expect(clampLength(vec2(3, 4), 5)).toEqual(vec2(3, 4))
    const clamped = clampLength(vec2(6, 8), 5)
    expect(Math.hypot(clamped.x, clamped.z)).toBeCloseTo(5)
  })

  it('moveTowards は maxDelta を超えて動かない', () => {
    const moved = moveTowards(vec2(0, 0), vec2(10, 0), 3)
    expect(moved).toEqual(vec2(3, 0))
  })
})
