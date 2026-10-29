const currentYear = new Date().getFullYear()

function Footer() {
  return <footer className="site-footer"><div className="footer-inner">
    <span>© {currentYear} VAPE MARKET</span><span>Une expérience simple pour vos achats au quotidien.</span>
  </div></footer>
}

export default Footer