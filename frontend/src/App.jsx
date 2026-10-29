import { useState } from 'react'
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

function App() {
  const [page, setPage] = useState('home')
  const pages = {
    home: <HomePage onNavigate={setPage} />,
    products: <ProductsPage />,
    product: <ProductDetailsPage />,
    categories: <CategoriesPage />,
    cart: <CartPage />,
    login: <LoginPage />,
    register: <RegisterPage />,
    account: <AccountPage />,
    orders: <OrdersPage />,
    notFound: <NotFoundPage />,
  }

  return (
    <MainLayout currentPage={page} onNavigate={setPage}>
      {pages[page] || pages.notFound}
    </MainLayout>
  )
}

export default App
