import * as THREE from 'three'

/**
 * ヒットや撃破のたびに飛び出す日本語の効果音文字。本作の見た目の核。
 *
 * Canvas に描いた文字をテクスチャにして Sprite で出す。Sprite は常にカメラを向くので、
 * カメラが動いても文字が斜めに寝ない。
 */
export type OnomatopoeiaLayer = {
  emit: (text: string, x: number, z: number, style?: PopStyle) => void
  update: (dt: number) => void
  dispose: () => void
}

export type PopStyle = {
  color?: string
  /** 表示の大きさ倍率 */
  scale?: number
}

/** 同時に出せる数。これを超えたら最も古いものを奪う */
const CAPACITY = 24
/** 1つあたりの表示時間(秒) */
const LIFETIME = 0.55
/** 文字テクスチャの高さ(px)。大きすぎるとメモリを食い、小さいとぼやける */
const TEXTURE_HEIGHT = 128
/** 表示の基準サイズ(m)。画面に見える横幅が約 22m なので、その 1/4 程度で目立つ */
const BASE_SIZE = 5.2

type Pop = {
  sprite: THREE.Sprite
  material: THREE.SpriteMaterial
  /** 発生順の通し番号。枠が足りない時に最も古いものを選ぶために使う */
  stamp: number
  life: number
  baseX: number
  baseY: number
  baseZ: number
  scale: number
  drift: number
}

/**
 * 文字を描いたテクスチャ。太い黒縁 → 白縁 → 塗り の三段重ねでコミックらしい縁取りにする。
 * 2D コンテキストが取れない環境では null を返す。ここで例外を投げると、
 * 呼び出し元が毎フレームのゲームループなので、演出の失敗が本編ごと止めてしまう。
 */
function createTextTexture(text: string, color: string): THREE.CanvasTexture | null {
  const fontSize = 84
  // 900 を持たない日本語フォントが多いので bold にしておく
  const font = `bold ${fontSize}px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif`

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) return null
  measure.font = font
  const width = Math.ceil(measure.measureText(text).width) + 48

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = TEXTURE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  const cx = width / 2
  const cy = TEXTURE_HEIGHT / 2

  // 縁を太くしすぎると塗りが潰れて字が黒い塊に見える。外側から順に細くしていく。
  ctx.lineWidth = 14
  ctx.strokeStyle = '#140f1c'
  ctx.strokeText(text, cx, cy)
  ctx.lineWidth = 6
  ctx.strokeStyle = '#ffffff'
  ctx.strokeText(text, cx, cy)
  ctx.fillStyle = color
  ctx.fillText(text, cx, cy)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createOnomatopoeiaLayer(scene: THREE.Scene): OnomatopoeiaLayer {
  // 同じ文字を何度も描き直さないようキャッシュする
  const textures = new Map<string, THREE.CanvasTexture>()
  const pops: Pop[] = []
  let nextStamp = 1

  const textureFor = (text: string, color: string): THREE.CanvasTexture | null => {
    const key = `${text}/${color}`
    const cached = textures.get(key)
    if (cached) return cached
    const texture = createTextTexture(text, color)
    if (texture) textures.set(key, texture)
    return texture
  }

  for (let i = 0; i < CAPACITY; i++) {
    const material = new THREE.SpriteMaterial({ transparent: true, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.visible = false
    // 文字が地形に埋もれないよう、常に手前に描く
    sprite.renderOrder = 10
    scene.add(sprite)
    pops.push({ sprite, material, stamp: 0, life: 0, baseX: 0, baseY: 0, baseZ: 0, scale: 1, drift: 0 })
  }

  return {
    emit: (text, x, z, style = {}) => {
      const texture = textureFor(text, style.color ?? '#ffd23f')
      // 文字が作れない環境では演出だけ諦める。本編は止めない。
      if (!texture) return

      // 空きが無ければ最も古い枠を奪う。演出なので消えても致命的ではない。
      const pop =
        pops.find((p) => p.life <= 0) ??
        pops.reduce((oldest, p) => (p.stamp < oldest.stamp ? p : oldest))
      pop.stamp = nextStamp++

      pop.material.map = texture
      pop.material.opacity = 1
      pop.material.needsUpdate = true
      pop.life = LIFETIME
      pop.baseX = x
      pop.baseY = 1.6
      pop.baseZ = z
      pop.scale = style.scale ?? 1
      // 少しばらけさせて、同じ場所で重なっても文字が読めるようにする
      pop.drift = (Math.random() - 0.5) * 1.2
      pop.sprite.visible = true
    },

    update: (dt) => {
      for (const pop of pops) {
        if (pop.life <= 0) continue
        pop.life -= dt
        if (pop.life <= 0) {
          pop.sprite.visible = false
          continue
        }

        const progress = 1 - pop.life / LIFETIME
        // 出た瞬間に大きく開いて、あとはゆっくり縮む（コミックの効果音の出方）
        const pop_in = Math.min(1, progress / 0.18)
        const overshoot = 1 + 0.35 * Math.sin(pop_in * Math.PI)
        const size = pop.scale * pop_in * overshoot

        const texture = pop.material.map
        const aspect = texture ? texture.image.width / texture.image.height : 2
        pop.sprite.scale.set(BASE_SIZE * size * aspect * 0.5, BASE_SIZE * size * 0.5, 1)
        pop.sprite.position.set(
          pop.baseX + pop.drift * progress,
          pop.baseY + progress * 1.8,
          pop.baseZ,
        )
        // 後半だけフェードさせる。最初から薄くすると読めない。
        pop.material.opacity = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4
      }
    },

    dispose: () => {
      for (const pop of pops) {
        scene.remove(pop.sprite)
        pop.material.dispose()
      }
      for (const texture of textures.values()) texture.dispose()
      textures.clear()
      pops.length = 0
    },
  }
}
