'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { Mail, User, Building, Lock, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';

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

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchApi('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password, company_name: companyName }),
      });

      console.log('Registration successful:', response);
      setSuccessMessage('Registration successful! Please check your email to verify your account.');
      setEmail('');
      setUsername('');
      setCompanyName('');
      setPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      console.error('Registration failed:', err);
      const detail = err.response?.data?.detail || err.message;
      setError(detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (): { strength: 'weak' | 'medium' | 'strong', color: string } => {
    if (!password) return { strength: 'weak', color: 'bg-gray-200' };
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 8;
    
    const score = [hasLower, hasUpper, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;
    
    if (score <= 2) return { strength: 'weak', color: 'bg-red-500' };
    if (score <= 4) return { strength: 'medium', color: 'bg-yellow-500' };
    return { strength: 'strong', color: 'bg-green-500' };
  };

  const { strength, color } = passwordStrength();

  return (
    <motion.form 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit} 
      className="space-y-5"
    >
      {error && (
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring" }}
           // Apply dark theme error styles
           className="flex items-center p-4 text-sm rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
         >
           <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring" }}
           // Apply dark theme success styles
           className="flex items-center p-4 text-sm rounded-lg bg-green-600/10 border border-green-600/30 text-green-500"
         >
           <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p>{successMessage}</p>
        </motion.div>
      )}
      
       <motion.div variants={itemVariants}>
         <label
           htmlFor="email-register"
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
            id="email-register"
            name="email"
            type="email"
            autoComplete="email"
            required
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="your@email.com"
          />
        </div>
      </motion.div>

       <motion.div variants={itemVariants}>
         <label
           htmlFor="username-register"
           // Apply dark theme text color
           className="block text-sm font-medium text-muted-foreground mb-1"
         >
           Username
         </label>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <User className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="username-register"
            name="username"
            type="text"
            autoComplete="username"
            required
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="johndoe"
          />
        </div>
      </motion.div>

       <motion.div variants={itemVariants}>
         <label
           htmlFor="company-name-register"
           // Apply dark theme text color
           className="block text-sm font-medium text-muted-foreground mb-1"
         >
           Company Name (Optional)
         </label>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <Building className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="company-name-register"
            name="companyName"
            type="text"
            autoComplete="organization"
             value={companyName}
             onChange={(e) => setCompanyName(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="Acme Inc."
          />
        </div>
      </motion.div>

       <motion.div variants={itemVariants}>
         <label
           htmlFor="password-register"
           // Apply dark theme text color
           className="block text-sm font-medium text-muted-foreground mb-1"
         >
           Password
         </label>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <Lock className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="password-register"
            name="password"
            type="password"
            autoComplete="new-password"
            required
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             // Apply dark theme input styles - Removed focus:ring-primary and focus:border-primary
             className="appearance-none block w-full pl-10 px-3 py-2.5 border border-border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground"
             disabled={isLoading}
             placeholder="••••••••"
          />
        </div>
         {password && (
           <div className="mt-2">
             {/* Apply dark theme background for strength bar */}
             <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
               <motion.div 
                 className={`h-full ${color}`} 
                initial={{ width: 0 }}
                animate={{ 
                  width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%' 
                }}
                 transition={{ duration: 0.3 }}
               />
             </div>
             {/* Apply dark theme text color */}
             <p className="text-xs mt-1 text-muted-foreground">
               Password strength: {strength === 'weak' ? 'Weak' : strength === 'medium' ? 'Medium' : 'Strong'}
             </p>
          </div>
        )}
      </motion.div>

       <motion.div variants={itemVariants}>
         <label
           htmlFor="confirm-password"
           // Apply dark theme text color
           className="block text-sm font-medium text-muted-foreground mb-1"
         >
           Confirm Password
         </label>
         <div className="relative mt-1">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {/* Apply dark theme icon color */}
             <Lock className="h-5 w-5 text-muted-foreground" />
           </div>
           <motion.input
            whileFocus="focus"
            variants={inputVariants}
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)}
             // Apply dark theme input styles, including error state - Removed focus:ring-primary and focus:border-primary
             className={`appearance-none block w-full pl-10 px-3 py-2.5 border rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 bg-input text-foreground ${
               confirmPassword && password !== confirmPassword 
                 ? 'border-destructive bg-destructive/10' // Dark theme error border/bg
                 : 'border-border'
             }`}
             disabled={isLoading}
             placeholder="••••••••"
          />
        </div>
         {confirmPassword && password !== confirmPassword && (
           // Apply dark theme error text color
           <p className="text-xs mt-1 text-destructive">Passwords do not match</p>
         )}
      </motion.div>

      <motion.div variants={itemVariants} className="pt-2">
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
               Registering...
             </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" />
              Register
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}
