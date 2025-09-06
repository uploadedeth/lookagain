'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImageWithLoader from './ImageWithLoader';
import { checkUserQuota, QuotaStatus } from '../lib/game-creation-client';
import QuotaDisplay from './QuotaDisplay';

interface GameRound {
  id: string;
  prompt: string;
  originalImageUrl: string;
  modifiedImageUrl: string;
  differences: string[];
  createdAt: any;
  isPublic: boolean;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [userPuzzles, setUserPuzzles] = useState<GameRound[]>([]);
  const [puzzlesLoading, setPuzzlesLoading] = useState(true);
  const [expandedPuzzle, setExpandedPuzzle] = useState<string | null>(null);
  const [userQuota, setUserQuota] = useState<QuotaStatus | null>(null);

  // Redirect to home if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user]);

  // Fetch user's puzzles
  useEffect(() => {
    const fetchUserPuzzles = async () => {
      if (!user) return;
      
      setPuzzlesLoading(true);
      try {
        const q = query(
          collection(db, 'gameRounds'),
          where('creatorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const puzzles: GameRound[] = [];
        
        querySnapshot.forEach((doc) => {
          puzzles.push({
            id: doc.id,
            ...doc.data()
          } as GameRound);
        });
        
        setUserPuzzles(puzzles);
      } catch (error) {
        console.error('Error fetching user puzzles:', error);
      } finally {
        setPuzzlesLoading(false);
      }
    };

    if (user) {
      fetchUserPuzzles();
    }
  }, [user]);

  // Fetch user quota
  useEffect(() => {
    const fetchQuota = async () => {
      if (user) {
        try {
          const quota = await checkUserQuota(user.uid);
          setUserQuota(quota);
        } catch (error) {
          console.error('Error fetching quota:', error);
        }
      }
    };
    
    if (user) {
      fetchQuota();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-8 mt-10">
        <div className="animate-pulse">
          <div className="h-16 w-64 bg-[#262628] rounded-lg mb-12"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-14 w-32 bg-[#262628] rounded-lg mx-auto mb-2"></div>
              <div className="h-5 w-24 bg-[#262628] rounded mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-14 w-32 bg-[#262628] rounded-lg mx-auto mb-2"></div>
              <div className="h-5 w-24 bg-[#262628] rounded mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-14 w-32 bg-[#262628] rounded-lg mx-auto mb-2"></div>
              <div className="h-5 w-24 bg-[#262628] rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 mt-6 sm:mt-10">
      {/* Profile Header */}
      <div className="mb-8 sm:mb-16">
        <button
          onClick={() => router.push('/')}
          className="mb-6 sm:mb-8 px-3 sm:px-4 py-2 -ml-3 sm:-ml-4 text-[#9aa0a6] hover:text-[#e3e3e3] hover:bg-[#262628] rounded-full transition-all flex items-center gap-2 text-sm sm:text-base"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl">arrow_back</span>
          Back to Home
        </button>
        
        <div className="flex items-center gap-4 sm:gap-6">
          {userProfile.photoURL ? (
            <img 
              src={userProfile.photoURL} 
              alt={userProfile.displayName}
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-[#fbbf24] flex items-center justify-center">
              <span className="text-xl sm:text-3xl font-medium text-[#1c1c1d]">
                {userProfile.displayName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-light text-[#e3e3e3] mb-1 sm:mb-2">{userProfile.displayName}</h1>
            <p className="text-[#9aa0a6] text-sm sm:text-base">{userProfile.email}</p>
            <p className="text-[#9aa0a6] text-xs sm:text-sm mt-1 sm:mt-2">
              Member since {userProfile.createdAt && new Date((userProfile.createdAt as any).seconds ? (userProfile.createdAt as any).seconds * 1000 : userProfile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Quota Display */}
      {userQuota && (
        <div className="mb-8 sm:mb-16 max-w-md">
          <QuotaDisplay 
            quota={userQuota} 
            label="Game Creation Quota"
            showProgressBar={true}
            className="bg-[#262628] p-4 sm:p-6 rounded-2xl"
          />
        </div>
      )}

      {/* Stats Section */}
      <div className="mb-8 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-light text-[#9aa0a6] mb-6 sm:mb-8">My Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12">
          <div className="text-center">
            <p className="text-3xl sm:text-5xl font-medium text-[#e3e3e3] mb-1 sm:mb-2">{userProfile.score || 0}</p>
            <p className="text-sm sm:text-lg text-[#9aa0a6]">Total Score</p>
          </div>
          <div className="text-center">
            <p className="text-3xl sm:text-5xl font-medium text-[#e3e3e3] mb-1 sm:mb-2">{userProfile.gamesCreated || 0}</p>
            <p className="text-sm sm:text-lg text-[#9aa0a6]">Games Created</p>
          </div>
          <div className="text-center">
            <p className="text-3xl sm:text-5xl font-medium text-[#e3e3e3] mb-1 sm:mb-2">{userProfile.gamesPlayed || 0}</p>
            <p className="text-sm sm:text-lg text-[#9aa0a6]">Games Played</p>
          </div>
        </div>
      </div>

      {/* My Puzzles Section */}
      <div className="mb-8 sm:mb-16">
        <h2 className="text-xl sm:text-2xl font-light text-[#9aa0a6] mb-6 sm:mb-8">My Puzzles</h2>
        
        {puzzlesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#262628] rounded-2xl p-4 animate-pulse">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="h-32 bg-[#1c1c1d] rounded-xl"></div>
                  <div className="h-32 bg-[#1c1c1d] rounded-xl"></div>
                </div>
                <div className="h-4 bg-[#1c1c1d] rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-[#1c1c1d] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : userPuzzles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#9aa0a6] text-lg mb-4">You haven't created any puzzles yet</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] rounded-full font-medium transition-all"
            >
              Create Your First Puzzle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPuzzles.map((puzzle) => (
              <div key={puzzle.id} className="bg-[#262628] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {/* Images Grid */}
                <div className="grid grid-cols-2 gap-0.5 p-4">
                  <div className="relative">
                    <p className="absolute top-1 left-1 text-xs bg-black/50 text-white px-2 py-1 rounded">Original</p>
                    <ImageWithLoader 
                      src={puzzle.originalImageUrl} 
                      alt="Original" 
                      className="w-full h-32 object-cover rounded-l-xl"
                    />
                  </div>
                  <div className="relative">
                    <p className="absolute top-1 right-1 text-xs bg-black/50 text-white px-2 py-1 rounded">Modified</p>
                    <ImageWithLoader 
                      src={puzzle.modifiedImageUrl} 
                      alt="Modified" 
                      className="w-full h-32 object-cover rounded-r-xl"
                    />
                  </div>
                </div>
                
                {/* Puzzle Info */}
                <div className="p-4 pt-0">
                  <p className="text-[#e3e3e3] font-medium mb-1 line-clamp-1">{puzzle.prompt}</p>
                  <p className="text-[#9aa0a6] text-sm mb-3">
                    {puzzle.differences.length} differences • {new Date(puzzle.createdAt.seconds * 1000).toLocaleDateString()}
                  </p>
                  
                  {/* Expandable Differences */}
                  <button
                    onClick={() => setExpandedPuzzle(expandedPuzzle === puzzle.id ? null : puzzle.id)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-[#1c1c1d] hover:bg-[#3c3c3f] rounded-xl transition-all text-sm"
                  >
                    <span className="text-[#9aa0a6]">View differences</span>
                    <span className="material-symbols-outlined text-lg">
                      {expandedPuzzle === puzzle.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {expandedPuzzle === puzzle.id && (
                    <div className="mt-3 px-4 py-3 bg-[#1c1c1d] rounded-xl">
                      <ul className="space-y-1">
                        {puzzle.differences.map((diff, index) => (
                          <li key={`${puzzle.id}-diff-${index}`} className="text-sm text-[#9aa0a6] flex items-start">
                            <span className="text-[#fbbf24] mr-2">{index + 1}.</span>
                            {diff}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProfilePage;


