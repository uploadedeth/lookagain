/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SignInButton from './SignInButton';
import Leaderboard from './Leaderboard';
import { useAuth } from './AuthProvider';


const Header: React.FC = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user } = useAuth();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  return (
    <>
    <header className="w-full py-3 px-4 md:py-5 md:px-8 sticky top-0 z-50 bg-[#1c1c1d]">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Mobile Menu Button / Sign In Button (if not logged in) */}
        <div className="flex items-center">
          {user ? (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-[#262628] rounded-lg transition-all mr-3"
              aria-label="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-2xl text-[#e3e3e3]">
                {showMobileMenu ? 'close' : 'menu'}
              </span>
            </button>
          ) : (
            <div className="md:hidden mr-3">
              <SignInButton />
            </div>
          )}
          
          {/* Logo */}
          <Link href="/" className="hover:opacity-70 transition-opacity">
            <img 
              src="https://imagedelivery.net/6WLqUjtBbGnMsdHq6NNK_w/7d170fc8-d414-498c-3040-bb985f103900/public"
              alt="LookAgain Logo"
              className="w-[120px] md:w-[150px] object-contain"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/play"
            className="px-5 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] font-medium rounded-full transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">sports_esports</span>
            <span>Play</span>
          </Link>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-5 py-2.5 bg-[#262628] hover:bg-[#4a4a4d] text-[#e3e3e3] font-medium rounded-full transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">leaderboard</span>
            <span>Leaderboard</span>
          </button>
          <SignInButton />
        </div>

        {/* Mobile Profile Button (if logged in) */}
        {user && (
          <div className="md:hidden">
            <SignInButton />
          </div>
        )}
      </div>
    </header>

    {/* Mobile Menu Overlay */}
    {showMobileMenu && user && (
      <div className="fixed inset-0 z-40 md:hidden">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <div 
          ref={mobileMenuRef}
          className="fixed left-0 top-0 bottom-0 w-80 bg-[#1c1c1d] shadow-xl animate-slide-in-left"
        >
          <div className="p-6 pt-20">
            <nav className="space-y-4">
              <Link
                href="/play"
                onClick={() => setShowMobileMenu(false)}
                className="w-full px-6 py-4 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] font-medium rounded-2xl transition-all flex items-center gap-3 text-lg"
              >
                <span className="material-symbols-outlined text-2xl">sports_esports</span>
                <span>Play Games</span>
              </Link>
              <button
                onClick={() => {
                  setShowLeaderboard(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-6 py-4 bg-[#262628] hover:bg-[#4a4a4d] text-[#e3e3e3] font-medium rounded-2xl transition-all flex items-center gap-3 text-lg"
              >
                <span className="material-symbols-outlined text-2xl">leaderboard</span>
                <span>Leaderboard</span>
              </button>
              <Link
                href="/profile"
                onClick={() => setShowMobileMenu(false)}
                className="w-full px-6 py-4 bg-[#262628] hover:bg-[#4a4a4d] text-[#e3e3e3] font-medium rounded-2xl transition-all flex items-center gap-3 text-lg"
              >
                <span className="material-symbols-outlined text-2xl">person</span>
                <span>Profile</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    )}

    {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </>
  );
};

export default Header;