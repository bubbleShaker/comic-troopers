import * as THREE from 'three'

/**
 * 毎フレーム増減するオブジェクト（敵・弾）用の使い回し置き場。
 * 生成と破棄を繰り返すと GC がフレーム落ちを起こすので、必要数まで作って隠す/出すだけにする。
 */
export type Pool<T extends THREE.Object3D> = {
  /** そのフレームの取得を始める */
  begin: () => void
  /** 1つ借りる。足りなければ作る */
  take: () => T
  /** 使わなかったぶんを隠す */
  end: () => void
  dispose: () => void
}

export function createPool<T extends THREE.Object3D>(
  scene: THREE.Scene,
  create: () => T,
  disposeItem: (item: T) => void,
): Pool<T> {
  const items: T[] = []
  let used = 0

  return {
    begin: () => {
      used = 0
    },
    take: () => {
      let item = items[used]
      if (!item) {
        item = create()
        items.push(item)
        scene.add(item)
      }
      item.visible = true
      used += 1
      return item
    },
    end: () => {
      for (let i = used; i < items.length; i++) items[i]!.visible = false
    },
    dispose: () => {
      for (const item of items) {
        scene.remove(item)
        disposeItem(item)
      }
      items.length = 0
    },
  }
}
