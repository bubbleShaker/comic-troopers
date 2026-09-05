import * as THREE from 'three'
import { FIELD_RADIUS } from '../core/config'
import { ENEMY, WEAPON } from '../core/config'
import { isDashing, type World } from '../core/world'
import { createPool } from './pool'
import type { Stage } from './scene'

export type WorldView = {
  /** core の状態を描画へ反映する */
  sync: (world: World, dt: number) => void
  /** GPU リソースを解放する */
  dispose: () => void
}

/** 追従の速さ。値が大きいほど食いつく */
const CAMERA_FOLLOW = 6
/** 自機からのカメラ相対位置（横長画面での基準値） */
const CAMERA_OFFSET = new THREE.Vector3(0, 18, 12)
/** 注視点を自機より奥へずらし、自機をやや画面下寄りに置く */
const LOOK_AHEAD = 3
/** 1マスの大きさ(m) */
const GRID_CELL = 2
const ENEMY_COLOR = '#ff5c39'

/**
 * 円形の地面にそのまま貼れるグリッド模様を作る。
 * GridHelper だと正方形なのでフィールドの円からはみ出してしまう。
 */
function createGridTexture(): THREE.CanvasTexture | null {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  // メモリ逼迫時などは 2D コンテキストが取れないことがある。落とさず単色地面へ退く。
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#1e1c2e'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#37325180'
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  // 指定しないと sRGB の色が Linear として扱われ、意図より白っぽく描かれる
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  const repeat = (FIELD_RADIUS * 2) / GRID_CELL
  texture.repeat.set(repeat, repeat)
  texture.anisotropy = 4
  return texture
}

export function createWorldView(stage: Stage): WorldView {
  const { scene, camera } = stage

  const gridTexture = createGridTexture()
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(FIELD_RADIUS, 64),
    new THREE.MeshStandardMaterial(
      gridTexture ? { map: gridTexture, roughness: 1 } : { color: '#1e1c2e', roughness: 1 },
    ),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const border = new THREE.Mesh(
    new THREE.RingGeometry(FIELD_RADIUS - 0.35, FIELD_RADIUS, 64),
    new THREE.MeshBasicMaterial({ color: '#ff4d6d', side: THREE.DoubleSide }),
  )
  border.rotation.x = -Math.PI / 2
  border.position.y = 0.02
  scene.add(border)

  // 自機。モデルの前方を +Z に揃えてあるので、rotation.y に facing をそのまま入れられる。
  const player = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#f4f4ff', roughness: 0.45 })
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.0, 4, 12), bodyMaterial)
  body.position.y = 1.1
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 0.9, 4),
    new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.3 }),
  )
  nose.rotation.x = Math.PI / 2
  nose.position.set(0, 1.3, 0.7)
  player.add(body, nose)
  scene.add(player)

  // 接地感を出すための擬似影。実際のシャドウマップはモバイルには重い。
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 20),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.03
  scene.add(shadow)

  // 敵と弾はジオメトリを共有し、マテリアルだけ個別に持つ（被弾点滅を1体ずつ変えるため）
  const enemyGeometry = new THREE.OctahedronGeometry(ENEMY.radius, 0)
  const enemyPool = createPool(
    scene,
    () =>
      new THREE.Mesh(
        enemyGeometry,
        new THREE.MeshStandardMaterial({ color: ENEMY_COLOR, flatShading: true, roughness: 0.6 }),
      ),
    (mesh) => (mesh.material as THREE.Material).dispose(),
  )

  const bulletGeometry = new THREE.SphereGeometry(WEAPON.bulletRadius, 8, 6)
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: '#ffe066' })
  const bulletPool = createPool(
    scene,
    () => new THREE.Mesh(bulletGeometry, bulletMaterial),
    () => {},
  )

  // ロックオンマーカー。対象の足元で回すだけの簡素なリング。
  const lockMarker = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.25, 4),
    new THREE.MeshBasicMaterial({ color: '#ffd23f', side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  )
  lockMarker.rotation.x = -Math.PI / 2
  lockMarker.visible = false
  scene.add(lockMarker)

  const desired = new THREE.Vector3()
  const lookAt = new THREE.Vector3()
  // 初回だけ補間せず目標位置へ置く。zoom 補正後の位置と初期値がずれ、
  // 読み込み直後にカメラが引いていく動きが見えてしまうため。
  let snapCamera = true

  const objects = [ground, border, player, shadow, lockMarker]

  return {
    sync: (world, dt) => {
      const p = world.player
      player.position.set(p.pos.x, 0, p.pos.z)
      player.rotation.y = p.facing
      shadow.position.set(p.pos.x, 0.03, p.pos.z)

      // ダッシュ中を色で示す（本格的な演出は M3）
      bodyMaterial.color.set(isDashing(p) ? '#7cf5ff' : '#f4f4ff')

      enemyPool.begin()
      for (const enemy of world.enemies) {
        const mesh = enemyPool.take()
        mesh.position.set(enemy.pos.x, ENEMY.radius, enemy.pos.z)
        // 転がるような回転で「生きている」感を出す
        mesh.rotation.y += dt * 3
        mesh.rotation.x += dt * 1.5
        const material = mesh.material as THREE.MeshStandardMaterial
        material.color.set(enemy.hitFlash > 0 ? '#ffffff' : ENEMY_COLOR)
      }
      enemyPool.end()

      bulletPool.begin()
      for (const bullet of world.bullets) {
        bulletPool.take().position.set(bullet.pos.x, 1.1, bullet.pos.z)
      }
      bulletPool.end()

      const target = world.enemies.find((enemy) => enemy.id === world.lockTargetId)
      lockMarker.visible = target !== undefined
      if (target) {
        lockMarker.position.set(target.pos.x, 0.05, target.pos.z)
        lockMarker.rotation.z += dt * 2
      }

      // 縦持ちは水平方向の視界が極端に狭くなる。1/aspect ぶん引くと、
      // 画面比によらず「横に見える距離」がほぼ一定（約 22m）になる。
      const zoom = THREE.MathUtils.clamp(1 / Math.min(camera.aspect, 1), 1, 2.6)
      desired.set(
        p.pos.x + CAMERA_OFFSET.x * zoom,
        CAMERA_OFFSET.y * zoom,
        p.pos.z + CAMERA_OFFSET.z * zoom,
      )
      if (snapCamera) {
        camera.position.copy(desired)
        snapCamera = false
      } else {
        // 1 - exp(-k*dt) はフレームレートが変わっても追従の速さが一定になる補間係数。
        camera.position.lerp(desired, 1 - Math.exp(-CAMERA_FOLLOW * dt))
      }
      lookAt.set(p.pos.x, 0.8, p.pos.z - LOOK_AHEAD)
      camera.lookAt(lookAt)
    },
    dispose: () => {
      // renderer.dispose() はシーングラフのリソースを解放しないので、自前で回収する。
      for (const object of objects) {
        scene.remove(object)
        object.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return
          node.geometry.dispose()
          const materials = Array.isArray(node.material) ? node.material : [node.material]
          for (const material of materials) material.dispose()
        })
      }
      gridTexture?.dispose()
      enemyPool.dispose()
      bulletPool.dispose()
      enemyGeometry.dispose()
      bulletGeometry.dispose()
      bulletMaterial.dispose()
    },
  }
}
