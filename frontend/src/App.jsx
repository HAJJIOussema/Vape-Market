import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import ProductsPage from './pages/ProductsPage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'
import CategoriesPage from './pages/CategoriesPage.jsx'
import CartPage from './pages/CartPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function RoutedApp() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPage = location.pathname.startsWith('/products') ? 'products' : location.pathname.slice(1) || 'home'
  const searchParams = new URLSearchParams(location.search)
  const searchQuery = searchParams.get('q') || ''
  const categoryId = searchParams.get('category_id') || ''

  function navigateTo(page) {
    navigate(page === 'home' ? '/' : `/${page}`)
  }

  function searchProducts(query) {
    const trimmedQuery = query.trim()
    navigate(trimmedQuery ? `/products?q=${encodeURIComponent(trimmedQuery)}` : '/products')
  }

  return (
    <AuthProvider>
      <CartProvider>
      <MainLayout
        currentPage={currentPage}
        onNavigate={navigateTo}
        searchQuery={searchQuery}
        onSearch={searchProducts}
      >
        <Routes>
          <Route path="/" element={<HomePage onNavigate={navigateTo} />} />
          <Route path="/products" element={<ProductsPage searchQuery={searchQuery} categoryId={categoryId} />} />
          <Route path="/products/:slug" element={<ProductDetailsPage key={location.pathname} />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/addresses" element={<AccountPage section="addresses" />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MainLayout>
      </CartProvider>
    </AuthProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}

export default App
