/**
 * One line a day. Public-domain translations only:
 * George Long (Meditations 1862, Discourses 1877), Richard Gummere (Letters to Lucilius, Loeb 1917 to 1925),
 * Elizabeth Carter (Enchiridion 1758) and Thomas Higginson (1865).
 * Lint: src/lib/stoic.test.ts asserts no dashes, an author on every line, under 100 characters.
 */
import { parseDayKey } from './day'

export type StoicLine = { text: string; author: string }

export const STOIC_LINES: readonly StoicLine[] = [
  { text: 'Confine thyself to the present.', author: 'Marcus Aurelius' },
  { text: 'Let not future things disturb thee.', author: 'Marcus Aurelius' },
  { text: 'Look within. Within is the fountain of good.', author: 'Marcus Aurelius' },
  { text: 'Adapt thyself to the things with which thy lot has been cast.', author: 'Marcus Aurelius' },
  { text: 'Death hangs over thee. While thou livest, while it is in thy power, be good.', author: 'Marcus Aurelius' },
  { text: 'Do not act as if thou wert going to live ten thousand years.', author: 'Marcus Aurelius' },
  { text: 'Be like the promontory against which the waves continually break.', author: 'Marcus Aurelius' },
  { text: 'That which is not good for the swarm, neither is it good for the bee.', author: 'Marcus Aurelius' },
  { text: 'Nothing happens to any man which he is not formed by nature to bear.', author: 'Marcus Aurelius' },
  { text: 'No longer talk about the kind of man that a good man ought to be, but be such.', author: 'Marcus Aurelius' },
  { text: 'It is not the man who has too little, but the man who craves more, that is poor.', author: 'Seneca' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },
  { text: 'Begin at once to live, and count each separate day as a separate life.', author: 'Seneca' },
  { text: 'Until we have begun to go without them, we fail to realize how unnecessary many things are.', author: 'Seneca' },
  { text: 'No man can have a peaceful life who thinks too much about lengthening it.', author: 'Seneca' },
  { text: 'Hunger costs but little; squeamishness costs much.', author: 'Seneca' },
  { text: 'Indulge the body only so far as is needful for good health.', author: 'Seneca' },
  { text: 'The body should be treated more rigorously, that it may not be disobedient to the mind.', author: 'Seneca' },
  { text: 'While we are postponing, life speeds by.', author: 'Seneca' },
  { text: 'First, to have what is necessary, and, second, to have what is enough.', author: 'Seneca' },
  { text: 'Some things are in our control and others not.', author: 'Epictetus' },
  { text: 'Men are disturbed not by the things which happen, but by the opinions about the things.', author: 'Epictetus' },
  { text: 'Never say of anything, I have lost it; but, I have restored it.', author: 'Epictetus' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus' },
  { text: 'It is impossible for a man to learn what he thinks he already knows.', author: 'Epictetus' },
  { text: 'If you want to improve, be content to be thought foolish with regard to external things.', author: 'Epictetus' },
  { text: 'Practise yourself, for heaven’s sake, in little things, and thence proceed to greater.', author: 'Epictetus' },
  { text: 'It is difficulties which show what men are.', author: 'Epictetus' },
  { text: 'Only the educated are free.', author: 'Epictetus' },
]

/** The line for a local day key. Same line all day, cycles through the list. */
export function stoicLineForDay(dayKey: string): StoicLine {
  const d = parseDayKey(dayKey)
  const daysSinceEpoch = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
  const i = ((daysSinceEpoch % STOIC_LINES.length) + STOIC_LINES.length) % STOIC_LINES.length
  return STOIC_LINES[i]
}
