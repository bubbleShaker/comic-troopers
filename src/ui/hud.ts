import { RUN } from '../core/config'
import { comboMultiplier, type World } from '../core/world'

export type Hud = {
  update: (world: World) => void
  setVisible: (visible: boolean) => void
}

/**
 * プレイ中の数値表示。3D の中に描くより DOM の方が軽く、
 * セーフエリアや文字の可読性をブラウザに任せられる。
 */
export function createHud(): Hud {
  const root = document.getElementById('hud')
  const scoreEl = document.getElementById('hud-score')
  const timeEl = document.getElementById('hud-time')
  const comboEl = document.getElementById('hud-combo')
  if (!root || !scoreEl || !timeEl || !comboEl) throw new Error('HUD の要素が見つからない')

  // 同じ文字列を毎フレーム代入すると無駄なレイアウトが走るので、変化時だけ書く
  let lastScore = -1
  let lastTime = -1
  let lastCombo = -1

  return {
    update: (world) => {
      if (world.score !== lastScore) {
        scoreEl.textContent = String(world.score)
        lastScore = world.score
      }

      // 切り上げにすると「1」の表示中に終わらない。残り 0.4 秒なら「1」と出したい。
      const seconds = Math.ceil(world.remaining)
      if (seconds !== lastTime) {
        timeEl.textContent = String(seconds)
        timeEl.dataset.rush = String(world.remaining <= RUN.rushAt)
        lastTime = seconds
      }

      if (world.combo !== lastCombo) {
        comboEl.textContent = `${world.combo} COMBO ×${comboMultiplier(world.combo).toFixed(1)}`
        comboEl.dataset.active = String(world.combo > 0)
        lastCombo = world.combo
      }
    },

    setVisible: (visible) => {
      root.hidden = !visible
    },
  }
}
