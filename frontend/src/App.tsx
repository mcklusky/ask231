import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Suspense, lazy, useLayoutEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Home from './pages/Home'
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const VerifyPhone = lazy(() => import('./pages/VerifyPhone'))
const Account = lazy(() => import('./pages/Account'))
const MyAds = lazy(() => import('./pages/MyAds'))
const AdForm = lazy(() => import('./pages/AdForm'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Listings = lazy(() => import('./pages/Listings'))
const AdvertisementDetail = lazy(() => import('./pages/AdvertisementDetail'))
const DemoAdvertisementDetail = lazy(() => import('./pages/DemoAdvertisementDetail'))
const Messages = lazy(() => import('./pages/Messages'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Requests = lazy(() => import('./pages/Requests'))
const RequestForm = lazy(() => import('./pages/RequestForm'))
const RequestDetail = lazy(() => import('./pages/RequestDetail'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
import { ThemeProvider } from './lib/theme'
import { Toaster } from '@/components/ui/sonner'
import { OfflineBar } from '@/components/InstallApp'

function AuthRoute({ children }: { children: React.ReactNode }) { const { profile } = useAuth(); const location = useLocation(); const requested = new URLSearchParams(location.search).get('next'); const next = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/account'; return profile ? <Navigate to={next} replace /> : <>{children}</> }
function StaffRoute({ children }: { children: React.ReactNode }) { const { profile, ready } = useAuth(); if (!ready) return <div className="admin-route-loading"><span className="spinner large-spinner" /></div>; if (!profile) return <Navigate to="/login" replace />; if (!profile.is_staff) return <Navigate to="/account" replace />; return <>{children}</> }
// Pages other than the homepage load on demand, so phones only download what they open.
function PageLoading() { return <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading"><span className="size-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" /></div> }
// New page: start at the top, unless the address names a section (e.g. /terms#prohibited); then scroll to it,
// retrying briefly because pages load on demand.
function ScrollToTop() {
  const location = useLocation()
  useLayoutEffect(() => {
    if (!location.hash) { window.scrollTo(0, 0); return }
    const id = decodeURIComponent(location.hash.slice(1))
    let tries = 0
    const timer = window.setInterval(() => {
      const target = document.getElementById(id)
      if (target || ++tries > 20) {
        window.clearInterval(timer)
        // Leave room for the sticky header so the section heading is not hidden under it.
        const align = () => {
          const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0
          if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerHeight - 16 })
        }
        align()
        // Fonts and images arriving after the first jump can shift the page; align once more when settled.
        void document.fonts?.ready.then(() => window.setTimeout(align, 150))
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [location.key, location.hash])
  return null
}
function AppRoutes() { return <><ScrollToTop /><Suspense fallback={<PageLoading />}><Routes><Route path="/" element={<Home />} /><Route path="/listings" element={<Listings />} /><Route path="/category/:slug" element={<Listings />} /><Route path="/favorites" element={<Favorites />} />{import.meta.env.DEV && <Route path="/ads/demo/:slug" element={<DemoAdvertisementDetail />} />}<Route path="/ads/:slug" element={<AdvertisementDetail />} /><Route path="/messages" element={<Messages />} /><Route path="/messages/:conversationId" element={<Messages />} /><Route path="/login" element={<AuthRoute><Login /></AuthRoute>} /><Route path="/register" element={<AuthRoute><Register /></AuthRoute>} /><Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/verify-email" element={<VerifyEmail />} /><Route path="/verify-phone" element={<VerifyPhone />} /><Route path="/account" element={<Account />} /><Route path="/my-ads" element={<MyAds />} /><Route path="/ads/new" element={<AdForm />} /><Route path="/ads/:slug/edit" element={<AdForm />} /><Route path="/admin" element={<StaffRoute><AdminDashboard /></StaffRoute>} /><Route path="/requests" element={<Requests />} /><Route path="/requests/new" element={<RequestForm />} /><Route path="/requests/:id" element={<RequestDetail />} /><Route path="/terms" element={<Terms />} /><Route path="/privacy" element={<Privacy />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></> }
export default function App() { return <ThemeProvider><AuthProvider><AppRoutes /><OfflineBar /><Toaster /></AuthProvider></ThemeProvider> }
