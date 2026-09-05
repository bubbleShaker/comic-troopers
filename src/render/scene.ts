import * as THREE from 'three'

export type Stage = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  /** 描画する。WebGL コンテキストを失っている間は何もしない。 */
  render: () => void
  dispose: () => void
}

export type StageOptions = {
  /** WebGL コンテキストを失った / 復帰した時に呼ばれる */
  onContextLost?: () => void
  onContextRestored?: () => void
}

/**
 * レンダラ・シーン・カメラを組み立て、リサイズ追従とコンテキスト消失までまとめて面倒を見る。
 * ゲームロジックからは「毎フレーム render() を呼ぶ箱」としてだけ見えればよい。
 */
export function createStage(container: HTMLElement, options: StageOptions = {}): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#171335')

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300)
  camera.position.set(0, 8, 10)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.75))
  const key = new THREE.DirectionalLight(0xffffff, 1.8)
  key.position.set(5, 10, 6)
  scene.add(key)

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    // devicePixelRatio はブラウザのズームや別 DPI ディスプレイへの移動で変わるため毎回入れ直す。
    // スマホでは 3〜4 まで上がるので 2 で頭打ちにして GPU 負荷を抑える。
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()

  // iOS Safari の orientationchange はレイアウト更新「前」に飛ぶので、
  // 同期で測ると回転前のサイズを拾ってしまう。次フレームまで待ってから測る。
  const resizeDeferred = () => requestAnimationFrame(() => requestAnimationFrame(resize))

  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', resizeDeferred)
  // アドレスバーの伸縮など、window の resize が飛ばない見た目の変化を拾う。
  window.visualViewport?.addEventListener('resize', resize)

  // モバイルではタブのバックグラウンド化やメモリ逼迫でコンテキストが落ちる。
  // preventDefault しないと復帰イベント自体が来ず、以後ずっと黒画面になる。
  let contextLost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    contextLost = true
    options.onContextLost?.()
  }
  const onRestored = () => {
    contextLost = false
    resize()
    options.onContextRestored?.()
  }
  const canvas = renderer.domElement
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return {
    scene,
    camera,
    renderer,
    render: () => {
      if (contextLost) return
      renderer.render(scene, camera)
    },
    dispose: () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resizeDeferred)
      window.visualViewport?.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      renderer.dispose()
      canvas.remove()
    },
  }
}
