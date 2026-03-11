import styles from './Footer.module.css'

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top Row */}
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>⬡</span>
              <span className={styles.logoText}>CollabMate</span>
            </div>
            <p className={styles.tagline}>
              Empowering students to learn, solve, and grow together through collaborative study rooms.
            </p>
            <div className={styles.socials}>
              <a href="#" className={styles.social} aria-label="Twitter">𝕏</a>
              <a href="#" className={styles.social} aria-label="GitHub">⌥</a>
              <a href="#" className={styles.social} aria-label="LinkedIn">in</a>
            </div>
          </div>

          {/* Links */}
          <div className={styles.linksGrid}>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Platform</h4>
              <ul>
                <li><a href="#features" className={styles.link}>Features</a></li>
                <li><a href="#how-it-works" className={styles.link}>How It Works</a></li>
                <li><a href="#" className={styles.link}>Study Rooms</a></li>
                <li><a href="#" className={styles.link}>Pricing</a></li>
              </ul>
            </div>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Resources</h4>
              <ul>
                <li><a href="#" className={styles.link}>Documentation</a></li>
                <li><a href="#" className={styles.link}>Blog</a></li>
                <li><a href="#" className={styles.link}>Support</a></li>
                <li><a href="#" className={styles.link}>Community</a></li>
              </ul>
            </div>
            <div className={styles.linkCol}>
              <h4 className={styles.colTitle}>Company</h4>
              <ul>
                <li><a href="#about" className={styles.link}>About</a></li>
                <li><a href="#" className={styles.link}>Careers</a></li>
                <li><a href="#" className={styles.link}>Privacy Policy</a></li>
                <li><a href="#" className={styles.link}>Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider}></div>

        {/* Bottom Row */}
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © 2025 CollabMate. All rights reserved.
          </p>
          <p className={styles.made}>
            «Built for collaborative learning»
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
