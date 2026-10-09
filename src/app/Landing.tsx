import { Navigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { landingPath } from './landing'

/** The address `/` sends you to your first page. */
export function Landing() {
  const { user } = useAuth()
  return user ? <Navigate to={landingPath(user)} replace /> : null
}
