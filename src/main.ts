import { createWorld, stepWorld } from './core/world'
import { createControls } from './input/controls'
import { createStage } from './render/scene'
import { createWorldView } from './render/world-view'
import { hideNotice, showNotice } from './ui/notice'
import { createStickIndicator } from './ui/stick'

const container = document.getElementById('app')
if (!container) throw new Error('#app が見つからない')

const stage = createStage(container, {
  onContextLost: () => showNotice('描画が中断されました。\n画面をリロードしてください。'),
  onContextRestored: () => hideNotice(),
})
const view = createWorldView(stage)
const stick = createStickIndicator(document.body)
const controls = createControls(stage.renderer.domElement, { onStick: (v) => stick.update(v) })

const world = createWorld()

/** 撃破の瞬間に時間を潰して手応えを出す（ヒットストップ）。残り時間(秒） */
let hitStop = 0
/** ヒットストップ中の時間の進み方。完全停止ではなく極端なスローにする。
 *  0 にすると stepWorld が走らず、events が前のフレームのまま残って演出が二重に出る。 */
const HIT_STOP_SCALE = 0.12

let frame = 0
let prev = performance.now()
const loop = (now: number) => {
  // dt は秒。フレーム落ちや復帰時の巨大な dt で挙動が破綻しないよう上限を設ける。
  const dt = Math.min((now - prev) / 1000, 1 / 20)
  prev = now

  let stepDt = dt
  if (hitStop > 0) {
    hitStop = Math.max(0, hitStop - dt)
    stepDt = dt * HIT_STOP_SCALE
  }

  stepWorld(world, { move: controls.move, dash: controls.consumeDash() }, stepDt)
  // 演出は実時間で進める。止まった世界の上で文字だけが動くのが気持ちいい。
  view.sync(world, dt)
  if (world.events.some((event) => event.type === 'kill')) hitStop = 0.07
  stage.render()
  frame = requestAnimationFrame(loop)
}
frame = requestAnimationFrame(loop)

// Vite の HMR で main.ts が差し替わる時、古いループとレンダラが残らないようにする。
import.meta.hot?.dispose(() => {
  cancelAnimationFrame(frame)
  controls.dispose()
  stick.dispose()
  view.dispose()
  stage.dispose()
})
