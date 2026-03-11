import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import styles from './AuthPages.module.css'

const SignUpPage = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>
      
      <div className={styles.contentWrapper}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>CollabMate</span>
        </Link>
        <SignUp signInUrl="/login" fallbackRedirectUrl="/dashboard" />

      </div>
    </div>
  )
}

export default SignUpPage
