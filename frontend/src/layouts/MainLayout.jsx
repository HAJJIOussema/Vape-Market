import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

function MainLayout({ children, currentPage, onNavigate, searchQuery, onSearch }) {
  return <><Header currentPage={currentPage} onNavigate={onNavigate} searchQuery={searchQuery} onSearch={onSearch} /><main className="main-content">{children}</main><Footer /></>
}

export default MainLayout
