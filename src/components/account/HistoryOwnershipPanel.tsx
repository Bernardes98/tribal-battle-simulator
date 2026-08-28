import {
  useEffect,
  useState,
} from 'react'

import {
  AUTH_SESSION_CHANGED_EVENT,
  loadAuthSession,
} from '../../domain/auth/authSession'

import {
  getSimulationHistoryClientId,
} from '../../domain/history/simulationHistoryClient'

import {
  claimBrowserSimulationHistory,
} from '../../services/simulationHistoryApi'

import './HistoryOwnershipPanel.css'

interface HistoryOwnershipPanelProps {
  onClaimed?: () => void
}

function HistoryOwnershipPanel({
  onClaimed,
}: HistoryOwnershipPanelProps) {
  const [
    signedIn,
    setSignedIn,
  ] = useState(
    () =>
      Boolean(
        loadAuthSession(),
      ),
  )

  const [
    clientId,
  ] = useState(
    () =>
      getSimulationHistoryClientId(),
  )

  const [
    importing,
    setImporting,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState<
    {
      type:
        | 'success'
        | 'error'
      text: string
    } | null
  >(null)

  useEffect(
    () => {
      const syncAuth =
        () =>
          setSignedIn(
            Boolean(
              loadAuthSession(),
            ),
          )

      window.addEventListener(
        AUTH_SESSION_CHANGED_EVENT,
        syncAuth,
      )

      return () =>
        window.removeEventListener(
          AUTH_SESSION_CHANGED_EVENT,
          syncAuth,
        )
    },
    [],
  )

  const handleClaim =
    async () => {
      if (
        importing ||
        !signedIn
      ) {
        return
      }

      try {
        setImporting(
          true,
        )

        setMessage(
          null,
        )

        const result =
          await claimBrowserSimulationHistory()

        setMessage({
          type:
            'success',
          text:
            result.claimedCount >
            0
              ? `${result.claimedCount} browser simulation${result.claimedCount === 1 ? '' : 's'} moved into your account history.`
              : 'No unclaimed simulations were found for this browser.',
        })

        onClaimed?.()
      } catch (
        error
      ) {
        setMessage({
          type:
            'error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not import browser history.',
        })
      } finally {
        setImporting(
          false,
        )
      }
    }

  return (
    <section
      id="history-ownership"
      className="history-ownership-panel"
    >
      <div className="history-ownership-header">
        <div>
          <span>
            Account History
          </span>

          <strong>
            User-owned simulation history
          </strong>

          <small>
            New simulations are attached to your account whenever you are signed in. Guest simulations remain browser-owned until you explicitly import them.
          </small>
        </div>

        <span className={`history-ownership-state ${signedIn ? 'account' : 'browser'}`}>
          {signedIn
            ? 'Account Mode'
            : 'Browser Mode'}
        </span>
      </div>

      {message && (
        <div className={`history-ownership-message ${message.type}`}>
          {
            message.text
          }
        </div>
      )}

      <div className="history-ownership-body">
        <div className="history-ownership-flow">
          <div>
            <span>
              Guest
            </span>

            <strong>
              Browser History
            </strong>

            <small>
              Stored by anonymous browser client ID
            </small>
          </div>

          <div className="history-ownership-arrow">
            →
          </div>

          <div>
            <span>
              Signed In
            </span>

            <strong>
              Account History
            </strong>

            <small>
              Available on every signed-in device
            </small>
          </div>
        </div>

        <div className="history-ownership-client">
          <span>
            Current Browser Client ID
          </span>

          <code>
            {
              clientId
            }
          </code>
        </div>

        {signedIn ? (
          <div className="history-ownership-account-actions">
            <div>
              <strong>
                Have simulations from before you created your account?
              </strong>

              <span>
                Import only the anonymous simulation history belonging to this browser. Existing account-owned rows are never reassigned.
              </span>
            </div>

            <button
              type="button"
              disabled={
                importing
              }
              onClick={() =>
                void handleClaim()
              }
            >
              {importing
                ? 'Importing...'
                : 'Import This Browser History'}
            </button>
          </div>
        ) : (
          <div className="history-ownership-guest-note">
            <strong>
              Guest behavior is preserved.
            </strong>

            <span>
              Sign in when you want new history to follow your account across devices. Nothing is claimed automatically.
            </span>
          </div>
        )}

        <div className="history-ownership-safety">
          <strong>
            Explicit migration only
          </strong>

          <span>
            V51 does not silently assign old anonymous database history to an account. Claiming requires an authenticated account plus the random client ID already present in this browser.
          </span>
        </div>
      </div>
    </section>
  )
}

export default HistoryOwnershipPanel
