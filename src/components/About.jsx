import { Link } from 'react-router-dom'
import styles from './About.module.css'

const About = () => {
  return (
    <section id="about" className={styles.about}>
      <div className={styles.container}>
        {/* Left — Text content */}
        <div className={styles.content}>
          <span className={styles.tag}>About CollabMate</span>
          <h2 className={styles.title}>
            Built for students,<br />
            <span className={styles.highlight}>by students</span>
          </h2>
          <p className={styles.desc}>
            CollabMate was born from a simple idea: learning is better together. We built
            a platform where students can create or join virtual study rooms, post
            academic questions, vote on what matters most, and chat in real time —
            all in one focused space.
          </p>
          <p className={styles.desc}>
            Our mission is to promote peer learning, collaborative problem solving,
            and organized discussion of study topics. Whether you&apos;re preparing for
            an exam or diving deep into a subject, CollabMate gives every student a
            community to learn with.
          </p>

          <div className={styles.values}>
            <div className={styles.value}>
              <span className={styles.valueIcon}>•</span>
              <div>
                <h4 className={styles.valueTitle}>Peer-First Learning</h4>
                <p className={styles.valueSub}>Real knowledge shared between real students</p>
              </div>
            </div>
            <div className={styles.value}>
              <span className={styles.valueIcon}>•</span>
              <div>
                <h4 className={styles.valueTitle}>Free & Open</h4>
                <p className={styles.valueSub}>No paywalls. Learning should be accessible to all</p>
              </div>
            </div>
            <div className={styles.value}>
              <span className={styles.valueIcon}>•</span>
              <div>
                <h4 className={styles.valueTitle}>Real-time Collaboration</h4>
                <p className={styles.valueSub}>Instant chat and live Q&A in every study room</p>
              </div>
            </div>
          </div>

          <div className={styles.ctaRow}>
            <Link to="/signup" className={styles.primaryCta}>Join CollabMate Free</Link>
            <Link to="/login" className={styles.secondaryCta}>Sign In</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
