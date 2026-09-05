import * as THREE from 'three'

export type Stage = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  render: () => void
  dispose: () => void
}

/**
 * レンダラ・シーン・カメラを組み立て、リサイズ追従までまとめて面倒を見る。
 * ゲームロジックからは「毎フレーム render() を呼ぶ箱」としてだけ見えればよい。
 */
export function createStage(container: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  // スマホの devicePixelRatio は 3〜4 まで上がる。等倍で描くと GPU が溶けるので 2 で頭打ちにする。
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#12101a')

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
  camera.position.set(0, 8, 10)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(5, 10, 6)
  scene.add(key)

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)
  // iOS は画面回転直後に clientHeight が古い値を返すことがあるため、向き変更でも明示的に測り直す。
  window.addEventListener('orientationchange', resize)

  return {
    scene,
    camera,
    renderer,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
