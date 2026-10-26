import type { Video, VideoDetails } from '../src/api/types.ts'

// Blender's open movies: real, embeddable videos, so the app works end to end
// without an API key. Titles are as published; descriptions are summaries.
const video = (
  id: string,
  title: string,
  description: string,
  channelTitle: 'Blender' | 'Blender Studio',
): Video => ({
  id,
  title,
  description,
  channelId: channelTitle === 'Blender' ? '@BlenderOfficial' : '@BlenderStudio',
  channelTitle,
  publishedAt: null,
  thumbnail: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, width: 320, height: 180 },
  // Not known without the API; the app shows nothing rather than a guess.
  duration: null,
  viewCount: null,
})

export const DEMO_VIDEOS: Video[] = [
  video(
    'aqz-KE-bpKQ',
    'Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film',
    'A giant, gentle rabbit takes revenge on three rodents who bully the forest animals.',
    'Blender',
  ),
  video(
    'eRsGyueVLvQ',
    'Sintel - Open Movie by Blender Foundation',
    'A young woman crosses a harsh world searching for the baby dragon she raised.',
    'Blender',
  ),
  video(
    'R6MlUcmOul8',
    'Tears of Steel - Blender VFX Open Movie',
    'A science-fiction short shot in Amsterdam, made to develop Blender’s visual effects tools.',
    'Blender',
  ),
  video(
    'WhWc3b3KhnY',
    'Spring - Blender Open Movie',
    'A shepherd girl and her dog face ancient spirits to keep the cycle of life going.',
    'Blender Studio',
  ),
  video(
    'Y-rmzh0PI3c',
    'Cosmos Laundromat - First Cycle. Official Blender Foundation release.',
    'A disillusioned sheep meets a strange salesman who offers him the gift of a lifetime.',
    'Blender',
  ),
  video(
    'mN0zPOpADL4',
    'Agent 327: Operation Barbershop',
    'Agent 327 goes undercover in a barbershop that hides a secret.',
    'Blender Studio',
  ),
  video(
    'TLkA0RELQ1g',
    'Elephants Dream',
    'The first Blender open movie: two men explore an endless, strange machine.',
    'Blender',
  ),
  video(
    'SkVqJ1SGeL0',
    'Caminandes 3: Llamigos',
    'Koro the llama meets a penguin while trying to reach a berry bush.',
    'Blender',
  ),
  video(
    'Z4C82eyhwgU',
    '"Caminandes 2: Gran Dillama" - Blender Animated Short',
    'Koro the llama tries to get past a fence to the grass on the other side.',
    'Blender',
  ),
  video(
    'YE7VzlLtp-4',
    'Big Buck Bunny',
    'The original release of Blender’s short about a rabbit who has had enough.',
    'Blender',
  ),
]

/** Sample search: every word must appear in the title, description or channel. */
export function searchDemo(query: string): Video[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return DEMO_VIDEOS.filter((v) => {
    const text = `${v.title} ${v.description} ${v.channelTitle}`.toLowerCase()
    return words.every((w) => text.includes(w))
  })
}

/** A sample video's details: the same video, with no statistics. */
export function demoDetails(id: string): VideoDetails | null {
  const video = DEMO_VIDEOS.find((v) => v.id === id)
  return video ? { ...video, likeCount: null, commentCount: null } : null
}

export const demoChannel = (channelId: string): Video[] =>
  DEMO_VIDEOS.filter((v) => v.channelId === channelId)
