import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { apiRequest } from '../api'
import styles from './JoinRoomPage.module.css'

const JoinRoomPage = () => {
  const { token } = useParams()
  const { user } = useUser()
  const navigate = useNavigate()

  const [room, setRoom]         = useState(null)
  const [status, setStatus]     = useState('loading') // loading | preview | requesting | done | error
  const [message, setMessage]   = useState('')

  const userMeta = {
    userId:   user?.id || '',
    userName: user?.fullName || user?.firstName || 'User',
  }

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const data = await apiRequest(`/api/rooms/invite/${token}`, {}, {})
        setRoom(data)
        setStatus('preview')
      } catch (err) {
        setMessage(err.message || 'Invalid invite link')
        setStatus('error')
      }
    }
    fetchRoom()
  }, [token])

  const handleJoin = async () => {
    setStatus('requesting')
    try {
      const data = await apiRequest(`/api/rooms/join/${token}`, { method: 'POST' }, userMeta)
      if (data.alreadyMember) {
        navigate(`/room/${data.roomId}`)
        return
      }
      setStatus('done')
      setMessage('Your join request has been sent! The room owner will approve it shortly.')
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>

      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>CollabMate</span>
        </Link>

        {status === 'loading' && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Fetching room info…</p>
          </div>
        )}

        {status === 'preview' && room && (
          <>
            <div className={styles.roomIcon}>{room.name[0]?.toUpperCase()}</div>
            <h1 className={styles.roomName}>{room.name}</h1>
            <p className={styles.hosted}>Hosted by <strong>{room.ownerName}</strong></p>
            <p className={styles.memberInfo}>
              {room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''} already in this room
            </p>
            <button className={styles.joinBtn} onClick={handleJoin}>
              Request to Join
            </button>
            <Link to="/dashboard" className={styles.cancelLink}>Back to Dashboard</Link>
          </>
        )}

        {status === 'requesting' && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Sending your request…</p>
          </div>
        )}

        {status === 'done' && (
          <div className={styles.successState}>
            <div className={styles.successIcon}>✅</div>
            <h2 className={styles.successTitle}>Request Sent!</h2>
            <p className={styles.successMsg}>{message}</p>
            <Link to="/dashboard" className={styles.joinBtn}>Go to Dashboard</Link>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.successState}>
            <div className={styles.successIcon}>❌</div>
            <h2 className={styles.successTitle}>Oops!</h2>
            <p className={styles.successMsg}>{message}</p>
            <Link to="/dashboard" className={styles.cancelLink}>Back to Dashboard</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinRoomPage
