import { splitTeamMessageBodyForDisplay } from '../../utils/teamMessageMentionUtils'

type TeamMessageBodyProps = {
  body: string
  className?: string
}

export function TeamMessageBody({ body, className }: TeamMessageBodyProps) {
  const segments = splitTeamMessageBodyForDisplay(body)

  return (
    <p className={className}>
      {segments.map((segment, index) =>
        segment.type === 'mention' ? (
          <span key={`${index}-${segment.value}`} className="team-messaging-mention">
            {segment.value}
          </span>
        ) : (
          <span key={`${index}-text`}>{segment.value}</span>
        ),
      )}
    </p>
  )
}
