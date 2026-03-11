import styles from './Features.module.css'

const features = [
  {
    icon: '🏠',
    title: 'Virtual Study Rooms',
    description: 'Create or join topic-based study rooms. Collaborate with peers in a focused environment built for learning.',
    color: '#22c55e',
  },
  {
    icon: '❓',
    title: 'Academic Q&A',
    description: 'Post questions, get detailed answers from peers. Organized by topic so you always find what you need.',
    color: '#f59e0b',
  },
  {
    icon: '⬆',
    title: 'Upvote System',
    description: 'Vote on questions to surface the most important topics. Community-driven prioritization keeps rooms focused.',
    color: '#8b5cf6',
  },
  {
    icon: '💬',
    title: 'Real-time Chat',
    description: 'Communicate instantly with other room members. Discuss solutions, share resources, and stay in sync.',
    color: '#06b6d4',
  },
  {
    icon: '🤝',
    title: 'Peer Learning',
    description: 'Learn from each other, not just textbooks. Build understanding by teaching and being taught by peers.',
    color: '#f43f5e',
  },
  {
    icon: '📌',
    title: 'Organized Discussions',
    description: 'Every study room is structured for clarity. Topics, threads, and answers are always easy to navigate.',
    color: '#ec4899',
  },
]

const Features = () => {
  return (
    <section id="features" className={styles.features}>
      <div className={styles.container}>
        {/* Section header */}
        <div className={styles.header}>
          <span className={styles.sectionTag}>Why CollabMate?</span>
          <h2 className={styles.title}>
            Everything you need to<br />
            <span className={styles.highlight}>learn collaboratively</span>
          </h2>
          <p className={styles.subtitle}>
            A complete toolkit for peer learning — from structured Q&amp;A to live chat,
            CollabMate keeps your study sessions organized and effective.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.grid}>
          {features.map((f, i) => (
            <div key={i} className={styles.card} style={{ '--accent': f.color }}>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.description}</p>
              <div className={styles.cardAccent} style={{ background: f.color }}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
