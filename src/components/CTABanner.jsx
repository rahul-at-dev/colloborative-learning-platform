import styles from './CTABanner.module.css'

const CTABanner = () => {
  return (
    <section id="about" className={styles.banner}>
      <div className={styles.container}>
        <div className={styles.glow}></div>
        <div className={styles.content}>
          <h2 className={styles.title}>
            Ready to study smarter<br />with your <span className={styles.highlight}>peers?</span>
          </h2>
          <p className={styles.subtitle}>
            Create your free account today or sign in to continue your journey
          </p>
          <div className={styles.btns}>
            <a href="#register" className={styles.primary}>Create Free Account</a>
            <a href="#login" className={styles.secondary}>Sign In</a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTABanner
