'use client'

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import Spinner from './Spinner';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  score: number;
  gamesPlayed: number;
  photoURL: string | null;
}

interface LeaderboardProps {
  onClose: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [allLeaders, setAllLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const USERS_PER_PAGE = 10;
  const MAX_USERS = 100;

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('score', 'desc'),
        limit(MAX_USERS)
      );
      
      const snapshot = await getDocs(usersQuery);
      const leaderboardData: LeaderboardUser[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.score > 0) { // Only show users who have scored
          leaderboardData.push({
            uid: doc.id,
            displayName: data.displayName || 'Anonymous',
            score: data.score || 0,
            gamesPlayed: data.gamesPlayed || 0,
            photoURL: data.photoURL
          });
        }
      });
      
      setAllLeaders(leaderboardData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Calculate pagination
  const totalPages = Math.ceil(allLeaders.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const currentPageLeaders = allLeaders.slice(startIndex, endIndex);

  // Find user's rank if they're in the leaderboard
  const userRank = user ? allLeaders.findIndex(leader => leader.uid === user.uid) + 1 : -1;
  const userPage = userRank > 0 ? Math.ceil(userRank / USERS_PER_PAGE) : -1;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#262628] rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-bounce-in">
        <div className="p-4 sm:p-8 border-b border-[#3c3c3f] flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-normal text-[#e3e3e3] flex items-center gap-2">
            <span className="material-symbols-outlined text-xl sm:text-2xl">leaderboard</span>
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors text-xl sm:text-2xl p-1 sm:p-2 hover:bg-[#3c3c3f] rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(80vh-100px)]">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Spinner size="md" />
              <p className="text-gray-400">Loading rankings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : allLeaders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No scores yet. Be the first to play!</p>
            </div>
          ) : (
            <>
              {/* Show user's position if not on current page */}
              {userRank > 0 && userPage !== currentPage && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded-xl text-xs sm:text-sm">
                  <p className="text-[#fbbf24]">
                    Your rank: #{userRank} 
                    <button 
                      onClick={() => setCurrentPage(userPage)}
                      className="ml-2 underline hover:no-underline"
                    >
                      (Go to your page)
                    </button>
                  </p>
                </div>
              )}
              
              <div className="space-y-2 sm:space-y-3">
                {currentPageLeaders.map((leader, index) => {
                  const globalIndex = startIndex + index;
                  const isCurrentUser = user?.uid === leader.uid;
                  return (
                  <div
                    key={leader.uid}
                    className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                      isCurrentUser 
                        ? 'bg-[#fbbf24]/10 border border-[#fbbf24]/20' 
                        : 'bg-[#1c1c1d] hover:bg-[#2d2d30]'
                    }`}
                  >
                    <div className="text-lg sm:text-2xl font-bold w-8 sm:w-12 text-center">
                      {getRankDisplay(globalIndex)}
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      {leader.photoURL ? (
                        <img 
                          src={leader.photoURL} 
                          alt={leader.displayName}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.avatar-fallback')?.classList.remove('hidden');
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#3c3c3f] flex items-center justify-center avatar-fallback flex-shrink-0 ${leader.photoURL ? 'hidden' : ''}`}>
                        <span className="text-sm sm:text-lg font-medium text-[#e3e3e3]">
                          {leader.displayName?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-lg text-[#e3e3e3] truncate">
                          {leader.displayName}
                          {isCurrentUser && <span className="text-[#fbbf24] ml-1 sm:ml-2">(You)</span>}
                        </p>
                        <p className="text-xs sm:text-sm text-[#9aa0a6]">
                          {leader.gamesPlayed} game{leader.gamesPlayed !== 1 ? 's' : ''} played
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg sm:text-2xl font-medium text-[#fbbf24]">{leader.score}</p>
                      <p className="text-xs sm:text-sm text-[#9aa0a6]">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 sm:mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#3c3c3f] hover:bg-[#4a4a4d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">chevron_left</span>
                </button>
                
                <div className="flex items-center gap-1">
                  {/* Show page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-medium transition-all text-sm sm:text-base ${
                            page === currentPage
                              ? 'bg-[#fbbf24] text-[#1c1c1d]'
                              : 'bg-[#3c3c3f] hover:bg-[#4a4a4d] text-[#e3e3e3]'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-[#9aa0a6] text-sm">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#3c3c3f] hover:bg-[#4a4a4d] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">chevron_right</span>
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
