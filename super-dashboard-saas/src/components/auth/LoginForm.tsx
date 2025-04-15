'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { Lock, Mail, AlertCircle, LogIn } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 100
    }
  }
};

// Use CSS variables for theme consistency
const inputVariants = {
  focus: {
    scale: 1.01,
    // Use the CSS variable for the primary color border
    borderColor: "hsl(var(--primary))", 
    // Use the CSS variable for the ring color (often based on primary) with opacity
    boxShadow: "0 0 0 3px hsl(var(--primary) / 0.3)" 
  },
};

const buttonVariants = {
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  disabled: { opacity: 0.7 }
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginResponse = await fetchApi('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const { access_token, refresh_token, api_key } = loginResponse;

      if (!access_token) {
          setError('Login failed: Missing access token from server response.');
          setIsLoading(false);
          return;
      }
      if (!api_key) {
          setError('Login failed: API key missing from server response.');
          setIsLoading(false);
          return;
      }

      try {
          localStorage.setItem('authToken', access_token);
          const userData: User = await fetchApi('/api/users/me');

          if (userData) {
              login(userData, access_token, api_key);
              router.push('/dashboard');
          } else {
              setError('Login failed: Could not retrieve user details after login.');
              localStorage.removeItem('authToken');
          }
      } catch (userFetchError: any) {
          console.error('Failed to fetch user data after login:', userFetchError);
          setError(`Login succeeded but failed to fetch user details: ${userFetchError.message}`);
          localStorage.removeItem('authToken');
      }

    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit} 
      className="space-y-6"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring" }}
           // Use dark theme colors for error message
           className="flex items-center p-4 text-sm rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
         >
           <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}
      
       <motion.div variants={itemVariants}>
         <label
           htmlFor="email"
           // Apply dark theme text color
           className="block text-sm font-medium text-muted-foreground mb-1"
         >
           Email address
         </label>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <Mail className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary as Framer Motion handles focus style now
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="your@email.com"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
         <div className="flex items-center justify-between">
           <label
             htmlFor="password"
             // Apply dark theme text color
             className="block text-sm font-medium text-muted-foreground mb-1"
           >
             Password
           </label>
           <div className="text-sm">
             {/* Apply dark theme link color */}
             <a href="#" className="font-medium text-primary hover:text-primary/80">
               Forgot password?
             </a>
          </div>
        </div>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <Lock className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary as Framer Motion handles focus style now
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="••••••••"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <motion.button
          type="submit"
          disabled={isLoading}
           whileHover={!isLoading ? "hover" : undefined}
           whileTap={!isLoading ? "tap" : undefined}
           variants={buttonVariants}
           // Apply dark theme button styles
           className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-70 transition-colors duration-200 text-sm font-medium"
         >
           {isLoading ? (
             <>
               {/* Adjust spinner color for dark theme */}
               <span className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" />
              Sign in
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}
