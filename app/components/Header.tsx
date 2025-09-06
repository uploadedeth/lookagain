/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import SignInButton from './SignInButton';
import Leaderboard from './Leaderboard';


const Header: React.FC = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
    <header className="w-full py-5 px-8 sticky top-0 z-50 bg-[#1c1c1d]">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="hover:opacity-70 transition-opacity">
          <img 
            src="https://imagedelivery.net/6WLqUjtBbGnMsdHq6NNK_w/7d170fc8-d414-498c-3040-bb985f103900/public"
            alt="LookAgain Logo"
            className="w-[150px] object-contain"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/play"
            className="px-5 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] font-medium rounded-full transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">sports_esports</span>
            <span>Play</span>
          </Link>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-5 py-2.5 bg-[#3c3c3f] hover:bg-[#4a4a4d] text-[#e3e3e3] font-medium rounded-full transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">leaderboard</span>
            <span>Leaderboard</span>
          </button>
          <SignInButton />
        </div>
      </div>
    </header>
    {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </>
  );
};

export default Header;