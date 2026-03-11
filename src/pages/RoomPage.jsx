import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { io } from 'socket.io-client'
import { apiRequest } from '../api'
import styles from './RoomPage.module.css'

const POLL_INTERVAL = 4000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// --- Initialize Socket once (outside component or via ref/effect if needed dynamic) ---
// Note: We'll initialize it inside the component to use the room ID properly, 
// or connect and join room.

// ── Sidebar menu items ──────────────────────────────────────────
const MENU_ITEMS = [
  { id: 'overview', icon: '/overview.png', label: 'Overview' },
  { id: 'chat', icon: '/chat-room.png', label: 'Room Chat' },
  { id: 'qa', icon: '/Q&A.png', label: 'Q&A Discussion' },
  { id: 'announcements', icon: '/announcement.png', label: 'Announcements' },
  { id: 'whiteboard', icon: '/whiteboard.png', label: 'Whiteboard' },
  { id: 'files', icon: '/shared-files.png', label: 'Shared Files' },
  { id: 'polls', icon: '/polls.png', label: 'Polls' },
  { id: 'sessions', icon: '/study-sessions.png', label: 'Study Sessions' },
  { id: 'members', icon: '/members.png', label: 'Members' },
  { id: 'settings', icon: '/settings.png', label: 'Room Settings' },
]

const RoomPage = () => {
  const { id } = useParams()
  const { user } = useUser()
  const navigate = useNavigate()

  const userMeta = {
    userId: user?.id || '',
    userName: user?.fullName || user?.firstName || 'User',
  }

  // ── Core state ──────────────────────────────────────────────
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copyDone, setCopyDone] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Q&A
  const [qText, setQText] = useState('')
  const [selQuestion, setSelQuestion] = useState(null)
  const [answerText, setAnswerText] = useState('')

  // Chat
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const chatEndRef = useRef(null)

  // Join requests (owner)
  const [showRequests, setShowRequests] = useState(false)

  // DM
  const [dmTarget, setDmTarget] = useState(null)
  const [dmMessages, setDmMessages] = useState([])
  const [dmText, setDmText] = useState('')
  const [dmRequests, setDmRequests] = useState([])
  const [showDmRequests, setShowDmRequests] = useState(false)

  // Sidebar collapse (mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Fetch helpers ────────────────────────────────────────────
  const fetchRoom = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/rooms/${id}`, {}, userMeta)
      setRoom(data)
    } catch (err) {
      if (err.message === 'Access denied') navigate('/dashboard')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, user?.id]) // eslint-disable-line

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/rooms/${id}/messages`, {}, userMeta)
      setMessages(data)
    } catch (err) { /* ignore */ }
  }, [id, user?.id]) // eslint-disable-line

  const fetchDmRequests = useCallback(async () => {
    try {
      const data = await apiRequest(`/api/rooms/${id}/dm-requests`, {}, userMeta)
      setDmRequests(data)
    } catch (err) { /* ignore */ }
  }, [id, user?.id]) // eslint-disable-line

  const fetchDmMessages = useCallback(async (peerId) => {
    try {
      const data = await apiRequest(`/api/rooms/${id}/dm/${peerId}`, {}, userMeta)
      setDmMessages(data)
    } catch (err) { /* ignore */ }
  }, [id, user?.id]) // eslint-disable-line

  useEffect(() => {
    if (user) { fetchRoom(); fetchMessages(); fetchDmRequests() }
  }, [user]) // eslint-disable-line

  // --- Real-time Socket Connection (Chat) ---
  useEffect(() => {
    if (!id) return
    
    // Connect to the Socket.IO server
    const socket = io(API_URL)
    
    socket.on('connect', () => {
      console.log('Connected to socket:', socket.id)
      socket.emit('join_room', id)
    })
    
    socket.on('new_message', (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages if already present
        if (prev.find(m => m._id === msg._id)) return prev
        return [...prev, msg]
      })
    })
    
    return () => {
      socket.disconnect()
    }
  }, [id])

  useEffect(() => {
    const iv = setInterval(() => {
      fetchRoom(); fetchDmRequests()
      if (dmTarget) fetchDmMessages(dmTarget.userId)
    }, POLL_INTERVAL)
    return () => clearInterval(iv)
  }, [dmTarget]) // eslint-disable-line

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Actions ──────────────────────────────────────────────────
  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${room.inviteToken}`)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const postQuestion = async (e) => {
    e.preventDefault()
    if (!qText.trim()) return
    try {
      await apiRequest(`/api/rooms/${id}/questions`, {
        method: 'POST', body: JSON.stringify({ content: qText.trim() }),
      }, userMeta)
      setQText(''); fetchRoom()
    } catch (err) { alert(err.message) }
  }

  const voteQuestion = async (qId) => {
    try {
      await apiRequest(`/api/rooms/${id}/questions/${qId}/vote`, { method: 'POST' }, userMeta)
      fetchRoom()
    } catch (err) { alert(err.message) }
  }

  const postAnswer = async (e) => {
    e.preventDefault()
    if (!answerText.trim() || !selQuestion) return
    try {
      await apiRequest(`/api/rooms/${id}/questions/${selQuestion._id}/answers`, {
        method: 'POST', body: JSON.stringify({ content: answerText.trim() }),
      }, userMeta)
      setAnswerText(''); fetchRoom()
    } catch (err) { alert(err.message) }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!msgText.trim()) return
    try {
      // Opt. clear local state instantly for UI feel, but we'll wait for the real-time broadcast.
      await apiRequest(`/api/rooms/${id}/messages`, {
        method: 'POST', body: JSON.stringify({ content: msgText.trim() }),
      }, userMeta)
      setMsgText('')
      // fetchMessages() is no longer needed here as Socket.IO will broadcast it back to us via 'new_message'
    } catch (err) { alert(err.message) }
  }

  const approveRequest = async (reqId, action) => {
    try {
      await apiRequest(`/api/rooms/${id}/join-requests/${reqId}`, {
        method: 'PATCH', body: JSON.stringify({ action }),
      }, userMeta)
      fetchRoom()
    } catch (err) { alert(err.message) }
  }

  const sendDmRequest = async (toUserId) => {
    try {
      await apiRequest(`/api/rooms/${id}/dm-request`, {
        method: 'POST', body: JSON.stringify({ toUserId }),
      }, userMeta)
      alert('DM request sent!')
    } catch (err) { alert(err.message) }
  }

  const handleDmAction = async (reqId, action) => {
    try {
      await apiRequest(`/api/rooms/${id}/dm-request/${reqId}`, {
        method: 'PATCH', body: JSON.stringify({ action }),
      }, userMeta)
      fetchDmRequests()
    } catch (err) { alert(err.message) }
  }

  const openDm = (member) => {
    setDmTarget(member); fetchDmMessages(member.userId)
  }

  const sendDm = async (e) => {
    e.preventDefault()
    if (!dmText.trim() || !dmTarget) return
    try {
      await apiRequest(`/api/rooms/${id}/dm/${dmTarget.userId}`, {
        method: 'POST', body: JSON.stringify({ content: dmText.trim() }),
      }, userMeta)
      setDmText(''); fetchDmMessages(dmTarget.userId)
    } catch (err) { alert(err.message) }
  }

  // ── Loading / Error screens ──────────────────────────────────
  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner}></div>
      <p>Loading room…</p>
    </div>
  )

  if (error && !room) return (
    <div className={styles.loadingScreen}>
      <p className={styles.errText}>{error}</p>
      <Link to="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>
    </div>
  )

  // ── Derived data ─────────────────────────────────────────────
  const sortedQuestions = room ? [...room.questions].sort((a, b) => b.votes - a.votes) : []
  const pendingJoinRequests = room?.joinRequests?.filter(r => r.status === 'pending') || []
  const isOwner = room?.ownerId === user?.id
  const selectedQuestionFull = selQuestion
    ? room?.questions.find(q => q._id === selQuestion._id) || selQuestion
    : null

  // ── Tab content renderer ─────────────────────────────────────
  const renderWorkspace = () => {
    switch (activeTab) {

      // ── Overview ──────────────────────────────────────────────
      case 'overview':
        return (
          <div className={styles.overviewPane}>
            <div className={styles.overviewHero}>
              <div className={styles.overviewAvatar}>{room?.name?.[0]?.toUpperCase()}</div>
              <h2 className={styles.overviewName}>{room?.name}</h2>
              {room?.description && <p className={styles.overviewDesc}>{room.description}</p>}
              <div className={styles.overviewStats}>
                <div className={styles.statCard}>
                  <span className={styles.statNum}>{room?.members?.length || 0}</span>
                  <span className={styles.statLabel}>Members</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statNum}>{room?.questions?.length || 0}</span>
                  <span className={styles.statLabel}>Questions</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statNum}>{messages.length}</span>
                  <span className={styles.statLabel}>Messages</span>
                </div>
              </div>
            </div>
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard} onClick={() => setActiveTab('chat')}>
                <img src="/chat-room.png" alt="Chat" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Room Chat</div>
                  <div className={styles.overviewCardDesc}>{messages.length} message{messages.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className={styles.overviewCard} onClick={() => setActiveTab('qa')}>
                <img src="/Q&A.png" alt="Q&A" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Q&A Discussion</div>
                  <div className={styles.overviewCardDesc}>{room?.questions?.length || 0} question{room?.questions?.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className={styles.overviewCard} onClick={() => setActiveTab('announcements')}>
                <img src="/announcement.png" alt="Announcements" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Announcements</div>
                  <div className={styles.overviewCardDesc}>Room notices & updates</div>
                </div>
              </div>
              <div className={styles.overviewCard} onClick={() => setActiveTab('whiteboard')}>
                <img src="/whiteboard.png" alt="Whiteboard" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Whiteboard</div>
                  <div className={styles.overviewCardDesc}>Collaborative canvas</div>
                </div>
              </div>
              <div className={styles.overviewCard} onClick={() => setActiveTab('files')}>
                <img src="/shared-files.png" alt="Files" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Shared Files</div>
                  <div className={styles.overviewCardDesc}>Upload & share resources</div>
                </div>
              </div>
              <div className={styles.overviewCard} onClick={() => setActiveTab('polls')}>
                <img src="/polls.png" alt="Polls" className={styles.overviewCardIcon} />
                <div>
                  <div className={styles.overviewCardTitle}>Polls</div>
                  <div className={styles.overviewCardDesc}>Vote on topics</div>
                </div>
              </div>
            </div>
          </div>
        )

      // ── Chat ──────────────────────────────────────────────────
      case 'chat':
        return (
          <div className={styles.chatPane}>
            <div className={styles.chatMessages}>
              {messages.length === 0 && <p className={styles.emptyMsg}>No messages yet. Say hello!</p>}
              {messages.map(m => (
                <div key={m._id} className={`${styles.chatMsg} ${m.userId === user?.id ? styles.chatMsgOwn : ''}`}>
                  {m.userId !== user?.id && <span className={styles.chatAuthor}>{m.userName}</span>}
                  <div className={styles.chatBubble}>{m.content}</div>
                  <span className={styles.chatTime}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className={styles.chatInputRow}>
              <input
                className={styles.inp}
                placeholder="Type a message…"
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
              />
              <button className={styles.sendBtn} type="submit">Send</button>
            </form>
          </div>
        )

      // ── Q&A ───────────────────────────────────────────────────
      case 'qa':
        return (
          <div className={styles.qaPane}>
            <form onSubmit={postQuestion} className={styles.inputRow}>
              <input
                className={styles.inp}
                placeholder="Ask a question…"
                value={qText}
                onChange={e => setQText(e.target.value)}
              />
              <button className={styles.sendBtn} type="submit">Post</button>
            </form>
            <div className={styles.qaBody}>
              <div className={styles.qaList}>
                {sortedQuestions.length === 0 && <p className={styles.emptyMsg}>No questions yet. Be the first!</p>}
                {sortedQuestions.map(q => (
                  <div
                    key={q._id}
                    className={`${styles.qCard} ${selQuestion?._id === q._id ? styles.qCardActive : ''}`}
                    onClick={() => setSelQuestion(q)}
                  >
                    <div className={styles.qTop}>
                      <span className={styles.qAuthor}>{q.userName}</span>
                      <button
                        className={`${styles.voteBtn} ${q.votedBy?.includes(user?.id) ? styles.votedBtn : ''}`}
                        onClick={e => { e.stopPropagation(); voteQuestion(q._id) }}
                      >▲ {q.votes}</button>
                    </div>
                    <p className={styles.qContent}>{q.content}</p>
                    <span className={styles.qMeta}>{q.answers?.length || 0} answer{q.answers?.length !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>

              {/* Answer sub-panel */}
              {selectedQuestionFull && (
                <div className={styles.answerPanel}>
                  <div className={styles.answerPanelHeader}>
                    <p className={styles.answerForQ}>"{selectedQuestionFull.content}"</p>
                    <button className={styles.closeAnswers} onClick={() => setSelQuestion(null)}>✕</button>
                  </div>
                  <div className={styles.answerList}>
                    {selectedQuestionFull.answers?.length === 0 && <p className={styles.emptyMsg}>No answers yet.</p>}
                    {selectedQuestionFull.answers?.map(a => (
                      <div key={a._id} className={styles.answerItem}>
                        <span className={styles.answerAuthor}>{a.userName}</span>
                        <p className={styles.answerContent}>{a.content}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={postAnswer} className={styles.inputRow}>
                    <input
                      className={styles.inp}
                      placeholder="Write an answer…"
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                    />
                    <button className={styles.sendBtn} type="submit">Answer</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )

      // ── Members tab ───────────────────────────────────────────
      case 'members':
        return (
          <div className={styles.membersTabPane}>
            <div className={styles.workspaceHeader}>
              <h2 className={styles.workspaceTitle}>👥 Members</h2>
              <span className={styles.memberCount}>{room?.members?.length || 0} total</span>
            </div>
            <div className={styles.membersFullList}>
              {room?.members?.map(m => (
                <div key={m.userId} className={styles.memberItemFull}>
                  <div className={styles.memberAvatar}>{m.userName[0]?.toUpperCase()}</div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>
                      {m.userName}
                      {m.userId === user?.id && <span className={styles.youTag}> (you)</span>}
                    </span>
                    <span className={styles.memberRole}>{m.role}</span>
                  </div>
                  {m.userId !== user?.id && (
                    <button className={styles.dmBtn} onClick={() => openDm(m)} title={`Message ${m.userName}`}>
                      💬 DM
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      // ── Placeholders ──────────────────────────────────────────
      case 'announcements':
        return <ComingSoon icon="/announcement.png" title="Announcements" desc="Pin important notices and updates for all room members." />
      case 'whiteboard':
        return <ComingSoon icon="/whiteboard.png" title="Whiteboard" desc="A collaborative canvas to draw diagrams and brainstorm ideas together." />
      case 'files':
        return <ComingSoon icon="/shared-files.png" title="Shared Files" desc="Upload and share study materials, notes, and resources with the room." />
      case 'polls':
        return <ComingSoon icon="/polls.png" title="Polls" desc="Create polls to vote on study topics, schedules, and more." />
      case 'sessions':
        return <ComingSoon icon="/study-sessions.png" title="Study Sessions" desc="Schedule and join live study sessions with room members." />
      case 'settings':
        return (
          <div className={styles.settingsPane}>
            <div className={styles.workspaceHeader}>
              <h2 className={styles.workspaceTitle}>⚙️ Room Settings</h2>
            </div>
            <div className={styles.settingsCard}>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Room Name</div>
                  <div className={styles.settingValue}>{room?.name}</div>
                </div>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>Invite Link</div>
                  <div className={styles.settingValue}>{window.location.origin}/join/{room?.inviteToken}</div>
                </div>
                <button className={styles.settingActionBtn} onClick={copyInviteLink}>
                  {copyDone ? '✓ Copied!' : '🔗 Copy'}
                </button>
              </div>
              {isOwner && (
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.settingLabel}>Pending Join Requests</div>
                    <div className={styles.settingValue}>{pendingJoinRequests.length} pending</div>
                  </div>
                  {pendingJoinRequests.length > 0 && (
                    <button className={styles.settingActionBtn} onClick={() => setShowRequests(true)}>
                      🔔 Review
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >☰</button>
          <Link to="/dashboard" className={styles.backBtn}>← Dashboard</Link>
          <h1 className={styles.roomTitle}>{room?.name}</h1>
          <span className={styles.memberBadge}>{room?.members?.length || 0} members</span>
        </div>
        <div className={styles.headerRight}>
          {dmRequests.length > 0 && (
            <button className={styles.dmBadgeBtn} onClick={() => setShowDmRequests(true)}>
              💬 {dmRequests.length} DM{dmRequests.length > 1 ? 's' : ''}
            </button>
          )}
          {isOwner && pendingJoinRequests.length > 0 && (
            <button className={styles.requestsBadgeBtn} onClick={() => setShowRequests(true)}>
              🔔 {pendingJoinRequests.length} join{pendingJoinRequests.length > 1 ? 's' : ''}
            </button>
          )}
          <button className={styles.inviteBtn} onClick={copyInviteLink}>
            {copyDone ? '✓ Copied!' : '🔗 Copy Invite Link'}
          </button>
        </div>
      </header>

      {/* ── Workspace ──────────────────────────────────────── */}
      <div className={styles.workspace}>

        {/* Left Sidebar */}
        <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarRoomLabel}>
            <span className={styles.sidebarRoomIcon}>{room?.name?.[0]?.toUpperCase()}</span>
            <span className={styles.sidebarRoomName}>{room?.name}</span>
          </div>
          <ul className={styles.navList}>
            {MENU_ITEMS.map(item => (
              <li key={item.id}>
                <button
                  className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
                >
                  <img src={item.icon} alt="" className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.id === 'members' && (
                    <span className={styles.navBadge}>{room?.members?.length || 0}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Workspace */}
        <main className={styles.main}>
          {renderWorkspace()}
        </main>

        {/* Right Members Panel */}
        <aside className={styles.membersPanel}>
          <div className={styles.membersPanelTitle}>👥 Members</div>
          <div className={styles.memberList}>
            {room?.members?.map(m => (
              <div key={m.userId} className={styles.memberItem}>
                <div className={styles.memberAvatar}>{m.userName[0]?.toUpperCase()}</div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {m.userName}
                    {m.userId === user?.id && <span className={styles.youTag}> (you)</span>}
                  </span>
                  <span className={styles.memberRole}>{m.role}</span>
                </div>
                {m.userId !== user?.id && (
                  <button className={styles.dmBtn} onClick={() => openDm(m)} title={`Message ${m.userName}`}>💬</button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      {/* Join Requests Modal */}
      {showRequests && (
        <div className={styles.modalOverlay} onClick={() => setShowRequests(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Pending Join Requests</h3>
            {pendingJoinRequests.length === 0
              ? <p className={styles.emptyMsg}>No pending requests.</p>
              : pendingJoinRequests.map(r => (
                <div key={r._id} className={styles.requestRow}>
                  <span>{r.userName}</span>
                  <div className={styles.requestActions}>
                    <button className={styles.approveBtn} onClick={() => approveRequest(r._id, 'approve')}>✓ Approve</button>
                    <button className={styles.rejectBtn} onClick={() => approveRequest(r._id, 'reject')}>✕ Reject</button>
                  </div>
                </div>
              ))
            }
            <button className={styles.closeModalBtn} onClick={() => setShowRequests(false)}>Close</button>
          </div>
        </div>
      )}

      {/* DM Requests Modal */}
      {showDmRequests && (
        <div className={styles.modalOverlay} onClick={() => setShowDmRequests(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>DM Requests</h3>
            {dmRequests.length === 0
              ? <p className={styles.emptyMsg}>No pending DM requests.</p>
              : dmRequests.map(r => (
                <div key={r._id} className={styles.requestRow}>
                  <span>{r.fromUserName} wants to DM you</span>
                  <div className={styles.requestActions}>
                    <button className={styles.approveBtn} onClick={() => handleDmAction(r._id, 'accept')}>✓ Accept</button>
                    <button className={styles.rejectBtn} onClick={() => handleDmAction(r._id, 'reject')}>✕ Decline</button>
                  </div>
                </div>
              ))
            }
            <button className={styles.closeModalBtn} onClick={() => setShowDmRequests(false)}>Close</button>
          </div>
        </div>
      )}

      {/* DM Chat Pane */}
      {dmTarget && (
        <div className={styles.dmOverlay}>
          <div className={styles.dmPane}>
            <div className={styles.dmHeader}>
              <span>💬 {dmTarget.userName}</span>
              <button className={styles.closeAnswers} onClick={() => { setDmTarget(null); setDmMessages([]) }}>✕</button>
            </div>
            {dmMessages.length === 0 && (
              <p className={styles.emptyMsg} style={{ padding: '1rem' }}>
                No messages yet. Send a DM request first if the chat isn't active.
              </p>
            )}
            <div className={styles.dmMessages}>
              {dmMessages.map(m => (
                <div key={m._id} className={`${styles.chatMsg} ${m.fromUserId === user?.id ? styles.chatMsgOwn : ''}`}>
                  <div className={styles.chatBubble}>{m.content}</div>
                  <span className={styles.chatTime}>
                    {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={sendDm} className={styles.chatInputRow}>
              <input
                className={styles.inp}
                placeholder="Type a DM…"
                value={dmText}
                onChange={e => setDmText(e.target.value)}
              />
              <button className={styles.sendBtn} type="submit">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Coming Soon placeholder ──────────────────────────────────────
const ComingSoon = ({ icon, title, desc }) => {
  const styles_cs = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '1rem',
    color: 'var(--text-muted)',
    padding: '2rem',
    textAlign: 'center',
  }
  return (
    <div style={styles_cs}>
      <img src={icon} alt={title} style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', maxWidth: '320px', lineHeight: 1.6, margin: 0 }}>{desc}</p>
      <span style={{
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        color: 'var(--green)',
        padding: '0.35rem 0.9rem',
        borderRadius: '20px',
        fontSize: '0.78rem',
        fontWeight: 600,
      }}>Coming Soon</span>
    </div>
  )
}

export default RoomPage
