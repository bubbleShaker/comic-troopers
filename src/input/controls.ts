import { clampLength, normalize, vec2, type Vec2 } from '../core/types'

/** スティックを振り切ったと見なす画面上の距離(px) */
const STICK_RADIUS = 56
/** この距離だけ指が動いたらダッシュとして確定する(px) */
const SWIPE_THRESHOLD = 22

export type StickView = { originX: number; originY: number; x: number; y: number }

export type ControlsOptions = {
  /** スティックの表示更新。触れていない間は null が渡る */
  onStick?: (view: StickView | null) => void
}

export type Controls = {
  /** 現在の移動入力。長さ 0〜1 */
  readonly move: Vec2
  /** 溜まっているダッシュ要求を取り出す。取り出すと消える */
  consumeDash: () => Vec2 | null
  dispose: () => void
}

/**
 * 画面左半分＝移動スティック、右半分＝ダッシュ用スワイプ。
 * スワイプは指を離すまで待たず、閾値を超えた瞬間に発火させる（回避操作は反応速度が命）。
 * 左右で pointerId を分けて持つので、両手同時操作でも取り違えない。
 */
export function createControls(target: HTMLElement, options: ControlsOptions = {}): Controls {
  let move = vec2()
  let pendingDash: Vec2 | null = null

  let stickId: number | null = null
  let stickOrigin = { x: 0, y: 0 }
  const swipes = new Map<number, { x: number; y: number }>()
  const keys = new Set<string>()

  const notifyStick = (x: number, y: number) =>
    options.onStick?.({ originX: stickOrigin.x, originY: stickOrigin.y, x, y })

  const screenToMove = (dx: number, dy: number): Vec2 =>
    // カメラは +Z 側から原点を見下ろしている。画面上方向(dy<0)が奥(-Z)に対応する。
    clampLength(vec2(dx / STICK_RADIUS, dy / STICK_RADIUS), 1)

  const onPointerDown = (e: PointerEvent) => {
    const isLeftHalf = e.clientX < window.innerWidth / 2
    if (isLeftHalf && stickId === null) {
      stickId = e.pointerId
      stickOrigin = { x: e.clientX, y: e.clientY }
      move = vec2()
      notifyStick(e.clientX, e.clientY)
    } else {
      swipes.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    // 指が canvas の外へ出ても追跡を続ける
    target.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === stickId) {
      const dx = e.clientX - stickOrigin.x
      const dy = e.clientY - stickOrigin.y
      move = screenToMove(dx, dy)
      notifyStick(e.clientX, e.clientY)
      return
    }
    const start = swipes.get(e.pointerId)
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return
    pendingDash = normalize(vec2(dx, dy))
    // 1回のスワイプで1回だけ発火させる
    swipes.delete(e.pointerId)
  }

  const endPointer = (e: PointerEvent) => {
    if (e.pointerId === stickId) {
      stickId = null
      move = vec2()
      options.onStick?.(null)
    }
    swipes.delete(e.pointerId)
  }

  // デバッグ用。PC でも同じ操作感を再現できるようにしておく。
  const KEY_DIRS: Record<string, Vec2> = {
    w: vec2(0, -1),
    arrowup: vec2(0, -1),
    s: vec2(0, 1),
    arrowdown: vec2(0, 1),
    a: vec2(-1, 0),
    arrowleft: vec2(-1, 0),
    d: vec2(1, 0),
    arrowright: vec2(1, 0),
  }
  const keyboardMove = (): Vec2 => {
    let v = vec2()
    for (const key of keys) {
      const dir = KEY_DIRS[key]
      if (dir) v = vec2(v.x + dir.x, v.z + dir.z)
    }
    return clampLength(v, 1)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (key === ' ' || key === 'shift') {
      const dir = keyboardMove()
      if (dir.x !== 0 || dir.z !== 0) pendingDash = normalize(dir)
      return
    }
    if (!(key in KEY_DIRS)) return
    keys.add(key)
    move = keyboardMove()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    if (!keys.delete(key)) return
    move = keyboardMove()
  }

  target.addEventListener('pointerdown', onPointerDown)
  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', endPointer)
  target.addEventListener('pointercancel', endPointer)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    get move() {
      return move
    },
    consumeDash: () => {
      const dash = pendingDash
      pendingDash = null
      return dash
    },
    dispose: () => {
      target.removeEventListener('pointerdown', onPointerDown)
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', endPointer)
      target.removeEventListener('pointercancel', endPointer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}
