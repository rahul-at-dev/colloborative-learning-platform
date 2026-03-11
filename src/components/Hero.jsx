import { Link } from 'react-router-dom'
import styles from './Hero.module.css'

const Hero = () => {
  return (
    <section id="home" className={styles.hero}>
      {/* Left Content */}
      <div className={styles.content}>
        <h1 className={styles.heading}>
          Learn together,<br />
          <span className={styles.highlight}>grow faster</span><br />
          with <span className={styles.brand}>CollabMate</span>
        </h1>

        <p className={styles.abstract}>
          CollabMate is a collaborative learning platform where students create or join
          virtual study rooms to solve academic problems together. Post questions, vote
          on priorities, share answers, and chat — all in real time.
        </p>


        <div className={styles.ctaRow}>
          <Link to="/signup" className={styles.primaryCta}>Get Started</Link>
          <a href="#features" className={styles.secondaryCta}>
            <span className={styles.playIcon}>▶</span>
            See How It Works
          </a>
        </div>

      </div>

      {/* Right — Image Panel */}
      <div className={styles.imagePanel}>
        {/* Decorative shapes */}
        <div className={styles.starBig}>✳</div>
        <div className={styles.starSmall}>✦</div>
        <div className={styles.circle}></div>
        <img
          src="/hero_student.png"
          alt="Student learning with CollabMate"
          className={styles.heroImg}
        />

      </div>
    </section>
  )
}

export default Hero
