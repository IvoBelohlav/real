import { Inter } from 'next/font/google'
import Providers from '@/components/layout/Providers' // Corrected path assuming it's in components
import '../styles/globals.css'
// Use the new AuthProvider based on NextAuth session
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext' // Re-added SubscriptionProvider
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard for managing widgets and users',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap with NextAuth SessionProvider via Providers component */}
        <Providers>
          {/* Wrap with our AuthContext Provider */}
          <AuthProvider>
            <SubscriptionProvider>
              {children}
              <ToastContainer position="bottom-right" />
            </SubscriptionProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
