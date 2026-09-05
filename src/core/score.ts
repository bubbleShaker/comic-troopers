import { RUN } from './config'
import type { World } from './entities'

/** コンボが乗るほどスコアが伸びる。上限を設けないと終盤だけで決まってしまう。 */
export const comboMultiplier = (combo: number): number =>
  Math.min(1 + combo * RUN.comboStep, RUN.comboMax)

/**
 * このフレームの出来事をスコアへ反映する。
 * 判定そのものは combat が済ませてあり、ここは点数の付け方だけを持つ。
 */
export function updateScore(world: World): void {
  for (const event of world.events) {
    if (event.type === 'kill') {
      world.combo += 1
      world.maxCombo = Math.max(world.maxCombo, world.combo)
      world.score += Math.round(RUN.killScore * comboMultiplier(world.combo))
    } else if (event.type === 'playerHit') {
      // 被弾はライフを削るのではなくコンボを折る。即死が無いので必ず1分遊べる。
      world.combo = 0
      world.score = Math.max(0, world.score - RUN.hitPenalty)
    }
  }
}
