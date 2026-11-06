import type { XiaoheiAnimation } from '~/types/companion'
import l02 from './animation.json'
import l04 from './L04/animation.json'
import l04Poster from './L04/poster.webp'
import l04Strip from './L04/rest-strip.webp'
import l05 from './L05/animation.json'
import l05Poster from './L05/poster.webp'
import l05Strip from './L05/rest-strip.webp'
import l06 from './L06/animation.json'
import l06Poster from './L06/poster.webp'
import l06Strip from './L06/rest-strip.webp'
import l08 from './L08/animation.json'
import l08Poster from './L08/poster.webp'
import l08Strip from './L08/rest-strip.webp'
import l10 from './L10/animation.json'
import l10Poster from './L10/poster.webp'
import l10Strip from './L10/rest-strip.webp'
import l11 from './L11/animation.json'
import l11Poster from './L11/poster.webp'
import l11Strip from './L11/rest-strip.webp'
import l02Poster from './poster.webp'
import l02Strip from './rest-strip.webp'

const entries = [
  { id: 'L02', name: '趴卧小动作', ...l02, poster: l02Poster.src, strip: l02Strip.src, greetings: ['喵，陪你待一会儿。', '翻个身，继续晒太阳。', '今天也慢慢来。'] },
  { id: 'L04', name: '安静趴着', ...l04, poster: l04Poster.src, strip: l04Strip.src, greetings: ['我在这里呢。', '陪你安静一会儿。'] },
  { id: 'L05', name: '睡个懒觉', ...l05, poster: l05Poster.src, strip: l05Strip.src, greetings: ['再睡五分钟。', '今天也要好好休息。'] },
  { id: 'L06', name: '纸箱里的小黑', ...l06, poster: l06Poster.src, strip: l06Strip.src, greetings: ['纸箱里还有位置。', '一起窝着吧。'] },
  { id: 'L08', name: '开心小动作', ...l08, poster: l08Poster.src, strip: l08Strip.src, greetings: ['喵，见到你很开心。', '好心情分你一点。'] },
  { id: 'L10', name: '侦探小黑', ...l10, poster: l10Poster.src, strip: l10Strip.src, greetings: ['让我仔细看看。', '今天有什么新发现？'] },
  { id: 'L11', name: '雨天撑伞', ...l11, poster: l11Poster.src, strip: l11Strip.src, greetings: ['下雨也陪着你。', '伞下分你一半。'] },
]

// Fit every pose into the same stage, keeping the approved L02 size exactly.
export const xiaoheiAnimations: readonly XiaoheiAnimation[] = entries.map(entry => ({
  ...entry,
  displayWidth: Math.min(108, 85.32 * entry.width / entry.height),
}))
