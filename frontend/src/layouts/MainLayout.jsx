import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import AgeVerification from '../components/AgeVerification.jsx'
import CookieBanner from '../components/CookieBanner.jsx'

function MainLayout({ children, currentPage, onNavigate, searchQuery, onSearch }) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <>
      <AgeVerification />
      <Header
        currentPage={currentPage}
        onNavigate={onNavigate}
        searchQuery={searchQuery}
        onSearch={onSearch}
      />
      <main className="main-content">
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
      <Footer />
      <CookieBanner />
    </>
  )
}

export default MainLayout
