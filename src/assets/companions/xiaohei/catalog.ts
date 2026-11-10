import type { XiaoheiAnimation } from '~/types/companion'
import l06 from './L06/animation.json'
import l06Poster from './L06/poster.webp'
import l06Strip from './L06/rest-strip.webp'
import l10 from './L10/animation.json'
import l10Poster from './L10/poster.webp'
import l10Strip from './L10/rest-strip.webp'
import l11 from './L11/animation.json'
import l11Poster from './L11/poster.webp'
import l11Strip from './L11/rest-strip.webp'
import l12 from './L12/animation.json'
import l12Poster from './L12/poster.webp'
import l12Strip from './L12/rest-strip.webp'
import l13 from './L13/animation.json'
import l13Poster from './L13/poster.webp'
import l13Strip from './L13/rest-strip.webp'
import l14 from './L14/animation.json'
import l14Poster from './L14/poster.webp'
import l14Strip from './L14/rest-strip.webp'
import l16 from './L16/animation.json'
import l16Poster from './L16/poster.webp'
import l16Strip from './L16/rest-strip.webp'
import l18 from './L18/animation.json'
import l18Poster from './L18/poster.webp'
import l18Strip from './L18/rest-strip.webp'
import l19 from './L19/animation.json'
import l19Poster from './L19/poster.webp'
import l19Strip from './L19/rest-strip.webp'
import l20 from './L20/animation.json'
import l20Poster from './L20/poster.webp'
import l20Strip from './L20/rest-strip.webp'
import l23 from './L23/animation.json'
import l23Poster from './L23/poster.webp'
import l23Strip from './L23/rest-strip.webp'
import l25 from './L25/animation.json'
import l25Poster from './L25/poster.webp'
import l25Strip from './L25/rest-strip.webp'
import l29 from './L29/animation.json'
import l29Poster from './L29/poster.webp'
import l29Strip from './L29/rest-strip.webp'
import l30 from './L30/animation.json'
import l30Poster from './L30/poster.webp'
import l30Strip from './L30/rest-strip.webp'

const entries = [
  { id: 'L06', name: '纸箱里的小黑', ...l06, poster: l06Poster.src, strip: l06Strip.src, greetings: ['纸箱里还有位置。', '一起窝着吧。'] },
  { id: 'L10', name: '侦探小黑', ...l10, poster: l10Poster.src, strip: l10Strip.src, greetings: ['让我仔细看看。', '今天有什么新发现？'] },
  { id: 'L11', name: '雨天撑伞', ...l11, poster: l11Poster.src, strip: l11Strip.src, greetings: ['下雨也陪着你。', '伞下分你一半。'] },
  { id: 'L12', name: '抱着小伙伴眨眼', ...l12, poster: l12Poster.src, strip: l12Strip.src, greetings: ['它睡着了，我们小声一点。'] },
  { id: 'L13', name: '荷叶下的小黑', ...l13, poster: l13Poster.src, strip: l13Strip.src, greetings: ['荷叶底下好凉快。'] },
  { id: 'L14', name: '趴着摇尾巴', ...l14, poster: l14Poster.src, strip: l14Strip.src, greetings: ['让我再趴一会儿。'] },
  { id: 'L16', name: '盖着星星被子休息', ...l16, poster: l16Poster.src, strip: l16Strip.src, greetings: ['休息一会儿就好。'] },
  { id: 'L18', name: '靠着灰猫发呆', ...l18, poster: l18Poster.src, strip: l18Strip.src, greetings: ['它还在睡呢。'] },
  { id: 'L19', name: '小勺前抬眼', ...l19, poster: l19Poster.src, strip: l19Strip.src, greetings: ['那是什么？让我看看。'] },
  { id: 'L20', name: '星星面巾小扫帚', ...l20, poster: l20Poster.src, strip: l20Strip.src, greetings: ['扫完这一小块就好。'] },
  { id: 'L23', name: '比丢 · 趴着打盹', characterName: '比丢', ...l23, poster: l23Poster.src, strip: l23Strip.src, greetings: ['比丢……'] },
  { id: 'L25', name: '比丢 · 捂脸偷看', characterName: '比丢', ...l25, poster: l25Poster.src, strip: l25Strip.src, greetings: ['偷偷看一眼。'] },
  { id: 'L29', name: '小白 · 小口吃冰棒', characterName: '小白', ...l29, poster: l29Poster.src, strip: l29Strip.src, greetings: ['冰棒慢慢吃。'] },
  { id: 'L30', name: '山新 · 吸一口饮料', characterName: '山新', ...l30, poster: l30Poster.src, strip: l30Strip.src, greetings: ['歇一下，喝口饮料。'] },
]

// Fit every pose into the same stage so the date stays in place.
export const xiaoheiAnimations: readonly XiaoheiAnimation[] = entries.map(entry => ({
  ...entry,
  displayWidth: Math.min(108, 85.32 * entry.width / entry.height),
}))
