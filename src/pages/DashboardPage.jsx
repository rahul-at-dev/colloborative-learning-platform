import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate, Link } from 'react-router-dom'
import { apiRequest } from '../api'
import styles from './DashboardPage.module.css'

const DashboardPage = () => {
  const { user } = useUser()
  const navigate = useNavigate()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copyToast, setCopyToast] = useState('')

  const userMeta = {
    userId: user?.id || '',
    userName: user?.fullName || user?.firstName || 'User',
  }

  const fetchRooms = useCallback(async () => {
    if (!user) return
    try {
      const data = await apiRequest('/api/rooms', {}, userMeta)
      setRooms(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // eslint-disable-line

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    if (!roomName.trim()) return
    setCreating(true)
    setError('')
    try {
      const data = await apiRequest('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: roomName.trim() }),
      }, userMeta)
      setRooms(prev => [...prev, data.room])
      setShowModal(false)
      setRoomName('')
      navigate(`/room/${data.room._id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(link)
    setCopyToast(token)
    setTimeout(() => setCopyToast(''), 2000)
  }

  // Count pending join requests where user is owner
  const totalPending = rooms.reduce((acc, room) => {
    if (room.ownerId === user?.id) {
      return acc + (room.joinRequests?.filter(r => r.status === 'pending').length || 0)
    }
    return acc
  }, 0)

  return (
    <div className={styles.layout}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.logoLink}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>CollabMate</span>
        </Link>

        <div className={styles.avatar}>
          {user?.imageUrl
            ? <img src={user.imageUrl} alt="avatar" className={styles.avatarImg} />
            : <div className={styles.avatarPlaceholder}>
              {(user?.firstName?.[0] || 'U').toUpperCase()}
            </div>
          }
          <div className={styles.avatarInfo}>
            <p className={styles.avatarName}>{user?.fullName || user?.firstName || 'User'}</p>
            <p className={styles.avatarEmail}>{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>

        <nav className={styles.sideNav}>
          <span className={`${styles.sideNavItem} ${styles.sideNavActive}`}>
            <span>»</span> My Rooms
          </span>
          {totalPending > 0 && (
            <span className={styles.pendingBadge}>
              {totalPending} pending request{totalPending > 1 ? 's' : ''}
            </span>
          )}
        </nav>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <div>
            <h1 className={styles.greeting}>
              Welcome back, {user?.firstName || 'Student'} ♨️
            </h1>
            <p className={styles.subText}>Manage your study rooms and collaborate with peers.</p>
          </div>
          <button className={styles.createBtn} onClick={() => setShowModal(true)}>
            + Create Room
          </button>
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className={styles.loadingState}>Loading your rooms…</div>
        ) : rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <p>You haven't joined any study rooms yet.</p>
            <button className={styles.createBtn} onClick={() => setShowModal(true)}>
              Create your first room
            </button>
          </div>
        ) : (
          <div className={styles.roomGrid}>
            {rooms.map(room => {
              const pendingCount = room.ownerId === user?.id
                ? (room.joinRequests?.filter(r => r.status === 'pending').length || 0)
                : 0
              return (
                <div key={room._id} className={styles.roomCard}>
                  <div className={styles.roomCardHeader}>
                    <div className={styles.roomIconWrap}>
                      {room.name[0].toUpperCase()}
                    </div>
                    {pendingCount > 0 && (
                      <span className={styles.badge}>{pendingCount} pending</span>
                    )}
                  </div>
                  <h3 className={styles.roomName}>{room.name}</h3>
                  <p className={styles.roomMeta}>
                    {room.members?.length || 1} member{room.members?.length !== 1 ? 's' : ''} ·{' '}
                    {room.ownerId === user?.id ? 'Owner' : `Host: ${room.ownerName}`}
                  </p>
                  <div className={styles.roomCardActions}>
                    <Link to={`/room/${room._id}`} className={styles.enterBtn}>
                      Enter Room →
                    </Link>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyInviteLink(room.inviteToken)}
                      title="Copy invite link"
                    >
                      {copyToast === room.inviteToken ? '✓ Copied!' : '🔗 Invite'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Create Room Modal ─────────────────────────────────── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create a Study Room</h2>
            <p className={styles.modalSub}>Give your room a name. An invite link will be generated automatically.</p>
            <form onSubmit={handleCreateRoom} className={styles.modalForm}>
              <input
                className={styles.modalInput}
                type="text"
                placeholder="e.g. CS101 Study Group"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                autoFocus
                maxLength={60}
              />
              {error && <p className={styles.modalError}>{error}</p>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancel}
                  onClick={() => { setShowModal(false); setRoomName(''); setError('') }}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.modalSubmit} disabled={creating}>
                  {creating ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
