import * as THREE from 'three'
import { ENEMY, FIELD_RADIUS, WEAPON } from '../core/config'
import { isDashing, isInvulnerable, type World } from '../core/world'
import { createOnomatopoeiaLayer } from './onomatopoeia'
import { createPool } from './pool'
import type { Stage } from './scene'
import { attachOutline, createToonGradient, createToonMaterial, weldForOutline } from './toon'

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

/** 撃破時に出す効果音文字。毎回同じだと単調なので複数から選ぶ */
const KILL_WORDS = ['ドカン', 'バキッ', 'ズガン', 'ドドド', 'ドゴォ', 'バァン']
/** 画面の揺れが収まる速さ */
const SHAKE_DECAY = 4

const COLORS = {
  ground: '#332c57',
  gridLine: '#4b4180',
  border: '#ffd23f',
  player: '#f7f4ff',
  playerDash: '#5ef2ff',
  nose: '#ffd23f',
  enemy: '#ff4757',
  enemyFlash: '#ffffff',
  bullet: '#ffe066',
} as const

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
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = COLORS.gridLine
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
  const gradient = createToonGradient(3)

  // 地面は陰影を付けない。コミック調では平坦なベタ塗りの方が手前の要素が立つ。
  const gridTexture = createGridTexture()
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(FIELD_RADIUS, 64),
    new THREE.MeshBasicMaterial(gridTexture ? { map: gridTexture } : { color: COLORS.ground }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const border = new THREE.Mesh(
    new THREE.RingGeometry(FIELD_RADIUS - 0.4, FIELD_RADIUS, 64),
    new THREE.MeshBasicMaterial({ color: COLORS.border, side: THREE.DoubleSide }),
  )
  border.rotation.x = -Math.PI / 2
  border.position.y = 0.02
  scene.add(border)

  // 自機。モデルの前方を +Z に揃えてあるので、rotation.y に facing をそのまま入れられる。
  const player = new THREE.Group()
  const bodyMaterial = createToonMaterial(COLORS.player, gradient)
  const body = attachOutline(
    new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.0, 4, 12), bodyMaterial),
    undefined,
    0.07,
  )
  body.position.y = 1.1
  const nose = attachOutline(
    new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 4), createToonMaterial(COLORS.nose, gradient)),
    undefined,
    0.05,
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

  // 敵はジオメトリと輪郭を共有し、マテリアルだけ個別に持つ（被弾点滅を1体ずつ変えるため）
  const enemyGeometry = new THREE.OctahedronGeometry(ENEMY.radius, 0)
  const enemyOutlineGeometry = weldForOutline(enemyGeometry)
  const enemyPool = createPool(
    scene,
    () =>
      attachOutline(
        new THREE.Mesh(enemyGeometry, createToonMaterial(COLORS.enemy, gradient)),
        enemyOutlineGeometry,
        0.06,
      ),
    (mesh) => {
      // 本体のトゥーンマテリアルと、子として付いた輪郭のシェーダマテリアルはどちらも個別。
      // ジオメトリだけが共有なのでここでは触らない。
      mesh.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return
        const materials = Array.isArray(node.material) ? node.material : [node.material]
        for (const material of materials) material.dispose()
      })
    },
  )

  const bulletGeometry = new THREE.SphereGeometry(WEAPON.bulletRadius, 8, 6)
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: COLORS.bullet })
  const bulletPool = createPool(
    scene,
    () => new THREE.Mesh(bulletGeometry, bulletMaterial),
    () => {},
  )

  // ロックオンマーカー。対象の足元で回すだけの簡素なリング。
  const lockMarker = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.25, 4),
    new THREE.MeshBasicMaterial({
      color: COLORS.border,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  )
  lockMarker.rotation.x = -Math.PI / 2
  lockMarker.visible = false
  scene.add(lockMarker)

  const onomatopoeia = createOnomatopoeiaLayer(scene)
  let shake = 0

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

      bodyMaterial.color.set(isDashing(p) ? COLORS.playerDash : COLORS.player)
      // 被弾直後の無敵は点滅で伝える。ダッシュ中の無敵は色で分かるので点滅させない。
      const hitInvulnerable = isInvulnerable(p) && !isDashing(p)
      player.visible = !hitInvulnerable || Math.floor(world.time * 20) % 2 === 0

      enemyPool.begin()
      for (const enemy of world.enemies) {
        const mesh = enemyPool.take()
        mesh.position.set(enemy.pos.x, ENEMY.radius, enemy.pos.z)
        // 転がるような回転で「生きている」感を出す。
        // 加算ではなく id と時刻から決める。プールの枠は敵が死ぬたびに詰め替わるので、
        // 加算だと後ろの敵が前の住人の回転角へ飛んでしまう。
        mesh.rotation.set(world.time * 1.5 + enemy.id, world.time * 3 + enemy.id, 0)
        const material = mesh.material as THREE.MeshToonMaterial
        material.color.set(enemy.hitFlash > 0 ? COLORS.enemyFlash : COLORS.enemy)
      }
      enemyPool.end()

      bulletPool.begin()
      for (const bullet of world.bullets) {
        bulletPool.take().position.set(bullet.pos.x, 1.1, bullet.pos.z)
      }
      bulletPool.end()

      // 出来事に対する演出。core 側は「何が起きたか」だけを events に積み、
      // どう見せるかはここだけで決める。
      for (const event of world.events) {
        if (event.type === 'kill') {
          const word = KILL_WORDS[Math.floor(Math.random() * KILL_WORDS.length)]!
          onomatopoeia.emit(word, event.pos.x, event.pos.z, { color: '#ffd23f', scale: 1.05 })
          shake = Math.max(shake, 0.35)
        } else if (event.type === 'hit') {
          onomatopoeia.emit('ビシ', event.pos.x, event.pos.z, { color: '#ffffff', scale: 0.7 })
        } else if (event.type === 'playerHit') {
          onomatopoeia.emit('ガッ！', event.pos.x, event.pos.z, { color: '#ff4757', scale: 1.3 })
          shake = Math.max(shake, 1.1)
        }
      }
      onomatopoeia.update(dt)

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
      // 揺れはカメラ位置ではなく注視点に入れる。位置を動かすと追従の補間と喧嘩する。
      shake = Math.max(0, shake - dt * SHAKE_DECAY)
      const shakeX = (Math.random() - 0.5) * shake
      const shakeY = (Math.random() - 0.5) * shake
      lookAt.set(p.pos.x + shakeX, 0.8 + shakeY, p.pos.z - LOOK_AHEAD)
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
      onomatopoeia.dispose()
      gridTexture?.dispose()
      enemyPool.dispose()
      bulletPool.dispose()
      enemyGeometry.dispose()
      enemyOutlineGeometry.dispose()
      bulletGeometry.dispose()
      bulletMaterial.dispose()
      gradient.dispose()
    },
  }
}
