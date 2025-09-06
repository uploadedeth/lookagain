/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SignInButton from './SignInButton';
import Leaderboard from './Leaderboard';


const Header: React.FC = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
    <header className="w-full py-5 px-8 sticky top-0 z-50 bg-[#1c1c1d]">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="hover:opacity-70 transition-opacity">
          <img 
            src="https://imagedelivery.net/6WLqUjtBbGnMsdHq6NNK_w/6c9544ec-79c6-4afd-ec90-b0ca210eb700/public"
            alt="LookAgain Logo"
            className="w-[150px] object-contain"
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/play"
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