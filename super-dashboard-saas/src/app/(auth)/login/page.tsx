// Login Page
import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { FaRobot } from 'react-icons/fa';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Purple gradient blob effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] h-[300px] w-[300px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[20%] right-[10%] h-[250px] w-[250px] bg-violet-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <div className="bg-purple-900/30 p-2 rounded-lg mr-2">
              <FaRobot className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-500">
              ChatWidget
            </span>
          </Link>
          
          <h2 className="mt-6 text-center text-3xl font-bold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Or{' '}
            <Link href="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
              create a new account
            </Link>
          </p>
        </div>
        
        <div className="bg-black/50 backdrop-blur-sm p-8 border border-purple-900/20 rounded-xl shadow-lg shadow-purple-900/10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}