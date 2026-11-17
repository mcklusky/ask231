import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useLayoutEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Account from './pages/Account'
import MyAds from './pages/MyAds'
import AdForm from './pages/AdForm'
import AdminDashboard from './pages/AdminDashboard'
import Listings from './pages/Listings'
import AdvertisementDetail from './pages/AdvertisementDetail'
import DemoAdvertisementDetail from './pages/DemoAdvertisementDetail'
import Messages from './pages/Messages'
import Favorites from './pages/Favorites'
import { ThemeProvider } from './lib/theme'

function AuthRoute({ children }: { children: React.ReactNode }) { const { profile } = useAuth(); const location = useLocation(); const requested = new URLSearchParams(location.search).get('next'); const next = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/account'; return profile ? <Navigate to={next} replace /> : <>{children}</> }
function StaffRoute({ children }: { children: React.ReactNode }) { const { profile, ready } = useAuth(); if (!ready) return <div className="admin-route-loading"><span className="spinner large-spinner" /></div>; if (!profile) return <Navigate to="/login" replace />; if (!profile.is_staff) return <Navigate to="/account" replace />; return <>{children}</> }
function ScrollToTop() { const location = useLocation(); useLayoutEffect(() => { window.scrollTo(0, 0) }, [location.key]); return null }
function AppRoutes() { return <><ScrollToTop /><Routes><Route path="/" element={<Home />} /><Route path="/listings" element={<Listings />} /><Route path="/category/:slug" element={<Listings />} /><Route path="/favorites" element={<Favorites />} /><Route path="/ads/demo/:slug" element={<DemoAdvertisementDetail />} /><Route path="/ads/:slug" element={<AdvertisementDetail />} /><Route path="/messages" element={<Messages />} /><Route path="/messages/:conversationId" element={<Messages />} /><Route path="/login" element={<AuthRoute><Login /></AuthRoute>} /><Route path="/register" element={<AuthRoute><Register /></AuthRoute>} /><Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/verify-email" element={<VerifyEmail />} /><Route path="/account" element={<Account />} /><Route path="/my-ads" element={<MyAds />} /><Route path="/ads/new" element={<AdForm />} /><Route path="/ads/:slug/edit" element={<AdForm />} /><Route path="/admin" element={<StaffRoute><AdminDashboard /></StaffRoute>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></> }
export default function App() { return <ThemeProvider><AuthProvider><AppRoutes /></AuthProvider></ThemeProvider> }
