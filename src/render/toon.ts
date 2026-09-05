import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * セルシェード用のグラデーションマップ。
 * 明るさをこの段数に量子化するので、少ないほどアメコミ寄りの塗りになる。
 */
export function createToonGradient(steps = 3): THREE.DataTexture {
  const data = new Uint8Array(steps)
  for (let i = 0; i < steps; i++) data[i] = Math.round(((i + 1) / steps) * 255)
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat)
  // 補間すると階調が滑らかに繋がってしまうので、最近傍で拾う
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

const OUTLINE_VERTEX = /* glsl */ `
  uniform float thickness;
  void main() {
    vec3 displaced = position + normal * thickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const OUTLINE_FRAGMENT = /* glsl */ `
  uniform vec3 outlineColor;
  void main() {
    gl_FragColor = vec4(outlineColor, 1.0);
  }
`

/**
 * 背面法の輪郭線。法線方向に膨らませた裏面だけを描くことで、
 * 形の外側に一定幅の縁が残る。ポストプロセスより軽く、モバイル向き。
 *
 * flatShading 用のジオメトリは面ごとに頂点が分かれていて法線が食い違うため、
 * そのまま膨らませると縁が裂ける。輪郭用に頂点を統合したジオメトリを作る。
 */
export function weldForOutline(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const welded = mergeVertices(geometry)
  welded.computeVertexNormals()
  return welded
}

export function createOutline(
  welded: THREE.BufferGeometry,
  thickness = 0.05,
  color = '#140f1c',
): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      outlineColor: { value: new THREE.Color(color) },
    },
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    side: THREE.BackSide,
  })

  const mesh = new THREE.Mesh(welded, material)
  // 輪郭は常に本体の後ろ側なので、影響を与えないよう当たり判定・カリング計算から外す
  mesh.frustumCulled = false
  return mesh
}

/**
 * 本体メッシュに輪郭を子として付ける。以後は本体を動かすだけで輪郭も追従する。
 * 同じ形を大量に出す時は welded を使い回すこと（溶接は毎回やるには重い）。
 */
export function attachOutline(
  mesh: THREE.Mesh,
  welded = weldForOutline(mesh.geometry),
  thickness?: number,
): THREE.Mesh {
  mesh.add(createOutline(welded, thickness))
  return mesh
}

export function createToonMaterial(color: string, gradientMap: THREE.DataTexture): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap })
}
