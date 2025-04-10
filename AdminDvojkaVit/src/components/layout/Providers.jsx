'use client';

// Removed import for the old AuthProvider
// import { AuthProvider } from './AuthProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react'; // Import NextAuth SessionProvider

// Create a client
const queryClient = new QueryClient();

export default function Providers({ children }) {
  // Note: The session prop is optional and usually not needed here
  // as SessionProvider fetches it automatically client-side.
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {/* The new AuthProvider from context/AuthContext.jsx will be added in layout.jsx */}
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
