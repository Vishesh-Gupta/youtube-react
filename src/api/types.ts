/** A video as the app uses it, flattened from the YouTube Data API's resources. */
export interface Video {
  id: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  /** ISO 8601; null when unknown (sample data). */
  publishedAt: string | null
  thumbnail: { url: string; width: number; height: number }
  /** ISO 8601 duration such as "PT12M14S"; null when unknown. */
  duration: string | null
  viewCount: number | null
}

/** The watch page's fuller view of one video. */
export interface VideoDetails extends Video {
  likeCount: number | null
  commentCount: number | null
}

/** A page of videos: search results, popular videos, or a channel's uploads. */
export interface SearchPage {
  items: Video[]
  /** Pass back to get the next page; null on the last one. */
  nextPageToken: string | null
  /** Where results came from: YouTube, or the sample videos when no API key is set. */
  source: 'youtube' | 'demo'
}
