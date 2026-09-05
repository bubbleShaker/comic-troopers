import * as THREE from 'three'
import { createStage } from './render/scene'
import { hideNotice, showNotice } from './ui/notice'

const container = document.getElementById('app')
if (!container) throw new Error('#app が見つからない')

const stage = createStage(container, {
  onContextLost: () => showNotice('描画が中断されました。\n画面をリロードしてください。'),
  onContextRestored: () => hideNotice(),
})

// M0 の疎通確認用。M1 で自機と地面に差し替える。
const box = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: '#ff4d6d', roughness: 0.4 }),
)
stage.scene.add(box)

let frame = 0
let prev = performance.now()
const loop = (now: number) => {
  // dt は秒。フレーム落ちや復帰時の巨大な dt で挙動が破綻しないよう上限を設ける。
  const dt = Math.min((now - prev) / 1000, 1 / 20)
  prev = now
  box.rotation.x += dt * 0.8
  box.rotation.y += dt * 1.2
  stage.render()
  frame = requestAnimationFrame(loop)
}
frame = requestAnimationFrame(loop)

// Vite の HMR で main.ts が差し替わる時、古いループとレンダラが残らないようにする。
import.meta.hot?.dispose(() => {
  cancelAnimationFrame(frame)
  stage.dispose()
})
