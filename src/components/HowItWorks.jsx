import styles from './HowItWorks.module.css'

const steps = [
  {
    num: '01',
    title: 'Create an Account',
    desc: 'Sign up in seconds. No credit card needed. Jump straight into collaborative learning.',
    icon: '👤',
  },
  {
    num: '02',
    title: 'Join or Create a Room',
    desc: 'Browse existing study rooms by subject or create your own for any topic you want to explore.',
    icon: '🚪',
  },
  {
    num: '03',
    title: 'Post & Answer Questions',
    desc: 'Ask academic questions, provide detailed answers, and upvote the most important discussions.',
    icon: '✍️',
  },
  {
    num: '04',
    title: 'Learn & Grow Together',
    desc: 'Chat in real time with your room members, watch knowledge grow, and improve together.',
    icon: '🚀',
  },
]

const HowItWorks = () => {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.tag}>Simple Process</span>
          <h2 className={styles.title}>
            How <span className={styles.highlight}>CollabMate</span> works
          </h2>
          <p className={styles.subtitle}>Four easy steps to start learning with your peers</p>
        </div>

        {/* Steps */}
        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepLeft}>
                <div className={styles.stepNum}>{step.num}</div>
                {i < steps.length - 1 && <div className={styles.connector}></div>}
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
