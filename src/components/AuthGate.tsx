import { useEffect, useState } from 'react'
import { TeamProvider } from '../context/TeamProvider'
import { useAuth } from '../hooks/useAuth'
import { AcceptInvitePage } from '../pages/AcceptInvitePage'
import { FilmSharePage } from '../pages/FilmSharePage'
import { JoinTeamPage } from '../pages/JoinTeamPage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import {
  getInviteTokenFromUrl,
  getPendingInviteUrl,
  isAcceptInvitePath,
  isInviteTokenCompleted,
  clearAcceptInviteUrl,
  redirectToAppHome,
  shouldResumePendingInvite,
} from '../utils/inviteToken'
import {
  clearJoinTeamUrl,
  getJoinLinkTokenFromUrl,
  getPendingJoinLinkUrl,
  isJoinLinkTokenCompleted,
  isJoinTeamPath,
  redirectToAppHomeFromJoinLink,
  shouldResumePendingJoinLink,
} from '../utils/joinLinkToken'
import { isFilmSharePath } from '../utils/filmShareToken'
import { captureMessageDeepLinkFromUrl, parseMessageDeepLinkFromUrl } from '../utils/messageLink'
import { capturePlaybookDeepLinkFromUrl } from '../utils/playbookLink'
import { TeamGate } from './TeamGate'
import '../pages/AuthPages.css'

function AcceptInviteFlow() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return (
      <TeamProvider>
        <AcceptInvitePage />
      </TeamProvider>
    )
  }

  return <AcceptInvitePage />
}

function JoinTeamFlow() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return (
      <TeamProvider>
        <JoinTeamPage />
      </TeamProvider>
    )
  }

  return <JoinTeamPage />
}

export function AuthGate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [resumingInvite, setResumingInvite] = useState(false)
  const [resumingJoinLink, setResumingJoinLink] = useState(false)

  useEffect(() => {
    if (!isAcceptInvitePath() && !isJoinTeamPath() && !isFilmSharePath()) {
      if (parseMessageDeepLinkFromUrl()) {
        captureMessageDeepLinkFromUrl()
      } else {
        capturePlaybookDeepLinkFromUrl()
      }
    }
  }, [])

  useEffect(() => {
    if (loading || !isAcceptInvitePath()) return

    const token = getInviteTokenFromUrl()
    if (!token || !isInviteTokenCompleted(token)) return

    clearAcceptInviteUrl()
    if (session) {
      redirectToAppHome()
    }
  }, [loading, session])

  useEffect(() => {
    if (loading || !isJoinTeamPath()) return

    const token = getJoinLinkTokenFromUrl()
    if (!token || !isJoinLinkTokenCompleted(token)) return

    clearJoinTeamUrl()
    if (session) {
      redirectToAppHomeFromJoinLink()
    }
  }, [loading, session])

  useEffect(() => {
    if (loading || isAcceptInvitePath() || isJoinTeamPath() || !session || !shouldResumePendingInvite()) {
      setResumingInvite(false)
      return
    }

    const pending = getPendingInviteUrl()
    if (!pending) {
      setResumingInvite(false)
      return
    }

    setResumingInvite(true)
    window.location.replace(pending)
  }, [loading, session])

  useEffect(() => {
    if (loading || isAcceptInvitePath() || isJoinTeamPath() || !session || !shouldResumePendingJoinLink()) {
      setResumingJoinLink(false)
      return
    }

    const pending = getPendingJoinLinkUrl()
    if (!pending) {
      setResumingJoinLink(false)
      return
    }

    setResumingJoinLink(true)
    window.location.replace(pending)
  }, [loading, session])

  if (isAcceptInvitePath()) {
    return <AcceptInviteFlow />
  }

  if (isJoinTeamPath()) {
    return <JoinTeamFlow />
  }

  if (isFilmSharePath()) {
    return <FilmSharePage />
  }

  if (loading || resumingInvite || resumingJoinLink) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return (
      <TeamProvider>
        <TeamGate />
      </TeamProvider>
    )
  }

  if (authView === 'signup') {
    return <SignupPage onSwitchToLogin={() => setAuthView('login')} />
  }

  return <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
}
