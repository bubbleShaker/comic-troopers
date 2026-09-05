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

let frame = 0
let prev = performance.now()
const loop = (now: number) => {
  // dt は秒。フレーム落ちや復帰時の巨大な dt で挙動が破綻しないよう上限を設ける。
  const dt = Math.min((now - prev) / 1000, 1 / 20)
  prev = now
  stepWorld(world, { move: controls.move, dash: controls.consumeDash() }, dt)
  view.sync(world, dt)
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
