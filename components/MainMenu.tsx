import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface MainMenuProps {
  onCreateClick: () => void;
  onPlayClick: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onCreateClick, onPlayClick }) => {
  const { user, userProfile } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto text-center animate-fade-in">
      <div className="mb-12">
        <h1 className="text-5xl font-light mb-4 text-[#e3e3e3]">
          Welcome to LookAgain
        </h1>
        <p className="text-xl text-[#9aa0a6] font-light">
          Find the differences in AI-generated images
        </p>
      </div>

      {user && userProfile && (
        <div className="mb-8 p-8 bg-[#262628] rounded-2xl">
          <h2 className="text-2xl font-normal mb-2 text-[#e3e3e3]">Welcome back, {userProfile.displayName}!</h2>
          <div className="flex justify-center gap-12 mt-6 text-lg">
            <div>
              <span className="text-[#9aa0a6]">Score</span>{' '}
              <span className="text-[#fbbf24] font-medium">{userProfile.score || 0} points</span>
            </div>
            <div>
              <span className="text-[#9aa0a6]">Games Created</span>{' '}
              <span className="text-[#fbbf24] font-medium">{userProfile.gamesCreated || 0}</span>
            </div>
            <div>
              <span className="text-[#9aa0a6]">Games Played</span>{' '}
              <span className="text-[#fbbf24] font-medium">{userProfile.gamesPlayed || 0}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <button
          onClick={onPlayClick}
          className="group relative bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] py-12 px-8 rounded-2xl text-xl transition-all duration-200"
        >
          <div className="text-center">
            <span className="text-4xl mb-4 block">🎮</span>
            <h3 className="font-medium mb-2">Play Now</h3>
            <p className="text-sm text-[#9aa0a6]">Challenge yourself with community puzzles</p>
          </div>
        </button>

        <button
          onClick={onCreateClick}
          className="group relative bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] py-12 px-8 rounded-2xl text-xl transition-all duration-200"
        >
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl mb-4 block">add_circle</span>
            <h3 className="font-medium mb-2">Create</h3>
            <p className="text-sm text-[#9aa0a6]">Design your own spot-the-difference game</p>
          </div>
        </button>
      </div>

      {!user && (
        <div className="mt-8 p-6 bg-[#262628] rounded-2xl">
          <p className="text-[#9aa0a6]">
            Sign in to track your score and create games
          </p>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
