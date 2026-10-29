import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

function MainLayout({ children, currentPage, onNavigate }) {
  return <><Header currentPage={currentPage} onNavigate={onNavigate} /><main className="main-content">{children}</main><Footer /></>
}

export default MainLayout
