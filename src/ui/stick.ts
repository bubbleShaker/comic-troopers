import type { StickView } from '../input/controls'

export type StickIndicator = {
  update: (view: StickView | null) => void
  dispose: () => void
}

/**
 * バーチャルスティックの見た目。触れた場所に土台が出るフローティング式。
 * 3D 側に描くより DOM の方が軽く、セーフエリアの扱いもブラウザ任せにできる。
 */
export function createStickIndicator(parent: HTMLElement): StickIndicator {
  const base = document.createElement('div')
  base.style.cssText = `
    position: fixed; left: 0; top: 0; width: 112px; height: 112px;
    margin: -56px 0 0 -56px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.06);
    pointer-events: none; display: none; z-index: 10;`
  const knob = document.createElement('div')
  knob.style.cssText = `
    position: fixed; left: 0; top: 0; width: 52px; height: 52px;
    margin: -26px 0 0 -26px; border-radius: 50%;
    background: rgba(255,255,255,0.8); pointer-events: none; display: none; z-index: 11;`
  parent.append(base, knob)

  return {
    update: (view) => {
      if (!view) {
        base.style.display = 'none'
        knob.style.display = 'none'
        return
      }
      base.style.display = 'block'
      knob.style.display = 'block'
      base.style.transform = `translate(${view.originX}px, ${view.originY}px)`
      // つまみは土台の半径内に収める
      const dx = view.x - view.originX
      const dy = view.y - view.originY
      const d = Math.hypot(dx, dy)
      const max = 56
      const scale = d > max ? max / d : 1
      knob.style.transform = `translate(${view.originX + dx * scale}px, ${view.originY + dy * scale}px)`
    },
    dispose: () => {
      base.remove()
      knob.remove()
    },
  }
}
