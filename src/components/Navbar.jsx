import { Link } from 'react-router-dom'
import { useAuth, UserButton } from '@clerk/clerk-react'
import styles from './Navbar.module.css'

const Navbar = () => {
  const { isSignedIn } = useAuth()
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>CollabMate</span>
        </Link>

        {/* Nav Links */}
        <ul className={styles.navLinks}>
          <li><a href="#home" className={styles.navLink}>Home</a></li>
          <li><a href="#features" className={styles.navLink}>Features</a></li>
          <li><a href="#about" className={styles.navLink}>About</a></li>
          <li><a href="#how-it-works" className={styles.navLink}>How It Works</a></li>
        </ul>

        {/* CTAs */}
        <div className={styles.ctaGroup}>
          {isSignedIn ? (
            <>
              <Link to="/dashboard" className={styles.signInBtn}>Dashboard</Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link to="/login" className={styles.signInBtn}>Sign In</Link>
              <Link to="/signup" className={styles.getStartedBtn}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
