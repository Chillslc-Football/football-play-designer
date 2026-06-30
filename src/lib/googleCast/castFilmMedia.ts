export async function loadFilmOnCastSession(
  session: cast.framework.CastSession,
  playbackUrl: string,
  title?: string,
): Promise<void> {
  const mediaInfo = new chrome.cast.media.MediaInfo(playbackUrl, 'video/mp4')
  mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED

  if (title) {
    const metadata = new chrome.cast.media.GenericMediaMetadata()
    metadata.title = title
    mediaInfo.metadata = metadata
  }

  const request = new chrome.cast.media.LoadRequest(mediaInfo)
  await session.loadMedia(request)
}
