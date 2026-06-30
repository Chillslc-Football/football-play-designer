export {}

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void
  }

  namespace cast {
    namespace framework {
      class CastContext {
        static getInstance(): CastContext
        setOptions(options: CastOptions): void
        getCastState(): CastState
        getCurrentSession(): CastSession | null
        addEventListener(
          type: CastContextEventType,
          handler: (event: { sessionState?: SessionState }) => void,
        ): void
        removeEventListener(
          type: CastContextEventType,
          handler: (event: { sessionState?: SessionState }) => void,
        ): void
      }

      class CastOptions {
        receiverApplicationId?: string
        autoJoinPolicy?: chrome.cast.AutoJoinPolicy
      }

      class CastSession {
        loadMedia(request: chrome.cast.media.LoadRequest): Promise<chrome.cast.media.Media>
      }

      enum CastContextEventType {
        CAST_STATE_CHANGED = 'caststatechanged',
        SESSION_STATE_CHANGED = 'sessionstatechanged',
      }

      enum CastState {
        NO_DEVICES_AVAILABLE = 'NO_DEVICES_AVAILABLE',
        NOT_CONNECTED = 'NOT_CONNECTED',
        CONNECTING = 'CONNECTING',
        CONNECTED = 'CONNECTED',
      }

      enum SessionState {
        NO_SESSION = 'NO_SESSION',
        SESSION_STARTING = 'SESSION_STARTING',
        SESSION_STARTED = 'SESSION_STARTED',
        SESSION_ENDING = 'SESSION_ENDING',
        SESSION_ENDED = 'SESSION_ENDED',
        SESSION_RESUMED = 'SESSION_RESUMED',
      }

      namespace ui {
        class CastButton {
          constructor(element: HTMLElement)
        }
      }
    }
  }

  namespace chrome {
    namespace cast {
      enum AutoJoinPolicy {
        ORIGIN_SCOPED = 'origin_scoped',
      }

      namespace media {
        const DEFAULT_MEDIA_RECEIVER_APP_ID: string

        enum StreamType {
          BUFFERED = 'BUFFERED',
        }

        class GenericMediaMetadata {
          title?: string
        }

        class MediaInfo {
          constructor(contentId: string, contentType: string)
          metadata?: GenericMediaMetadata
          streamType?: StreamType
        }

        class LoadRequest {
          constructor(media: MediaInfo)
        }

        class Media {}
      }
    }
  }
}
