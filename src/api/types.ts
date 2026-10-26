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
}

export interface SearchPage {
  items: Video[]
  /** Pass back to get the next page; null on the last one. */
  nextPageToken: string | null
}
