import { RUN } from '../core/config'
import type { World } from '../core/world'

export type Screens = {
  showTitle: (highScore: number) => void
  showResult: (world: World, highScore: number, isNewRecord: boolean) => void
  hide: () => void
  dispose: () => void
}

export type ScreensOptions = {
  /** オーバーレイがタップされた時。表示直後の誤タップは弾いてある */
  onTap: () => void
}

/** 表示直後の誤タップを無視する時間(ms)。撃破の連打がそのままリトライに化けるのを防ぐ */
const TAP_GUARD_MS = 500

export function createScreens(options: ScreensOptions): Screens {
  const root = document.getElementById('overlay')
  const card = document.getElementById('overlay-card')
  if (!root || !card) throw new Error('オーバーレイの要素が見つからない')

  let acceptFrom = 0

  const onPointerDown = () => {
    if (performance.now() < acceptFrom) return
    options.onTap()
  }
  root.addEventListener('pointerdown', onPointerDown)

  const show = (html: string) => {
    card.innerHTML = html
    root.hidden = false
    acceptFrom = performance.now() + TAP_GUARD_MS
  }

  return {
    showTitle: (highScore) => {
      show(`
        <h1>COMIC<br />TROOPERS</h1>
        <p class="lead">
          ${RUN.duration}秒でどれだけ倒せるか。<br />
          左半分をドラッグで移動、右半分をスワイプでダッシュ。<br />
          射撃は自動。
        </p>
        ${highScore > 0 ? `<p class="lead">ハイスコア ${highScore}</p>` : ''}
        <p class="tap">タップでスタート</p>
      `)
    },

    showResult: (world, highScore, isNewRecord) => {
      show(`
        <h2>TIME UP</h2>
        <p class="big">${world.score}</p>
        ${isNewRecord ? '<p class="lead">ハイスコア更新！</p>' : ''}
        <dl>
          <dt>撃破</dt><dd>${world.kills}</dd>
          <dt>最大コンボ</dt><dd>${world.maxCombo}</dd>
          <dt>ハイスコア</dt><dd>${highScore}</dd>
        </dl>
        <p class="tap">タップでもう一度</p>
      `)
    },

    hide: () => {
      root.hidden = true
    },

    dispose: () => {
      root.removeEventListener('pointerdown', onPointerDown)
    },
  }
}
