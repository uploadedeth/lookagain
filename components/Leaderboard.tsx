import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
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
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('score', 'desc'),
        limit(50)
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
      
      setLeaders(leaderboardData);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#262628] rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden animate-fade-in">
        <div className="p-8 border-b border-[#3c3c3f] flex justify-between items-center">
          <h2 className="text-2xl font-normal text-[#e3e3e3]">🏆 Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors text-2xl p-2 hover:bg-[#3c3c3f] rounded-full"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Spinner size="md" />
              <p className="text-gray-400">Loading rankings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : leaders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No scores yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => {
                const isCurrentUser = user?.uid === leader.uid;
                return (
                  <div
                    key={leader.uid}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isCurrentUser 
                        ? 'bg-[#fbbf24]/10 border border-[#fbbf24]/20' 
                        : 'bg-[#1c1c1d] hover:bg-[#2d2d30]'
                    }`}
                  >
                    <div className="text-2xl font-bold w-12 text-center">
                      {getRankDisplay(index)}
                    </div>
                    
                    <div className="flex items-center gap-3 flex-1">
                      {leader.photoURL ? (
                        <img 
                          src={leader.photoURL} 
                          alt={leader.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.avatar-fallback')?.classList.remove('hidden');
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-[#3c3c3f] flex items-center justify-center avatar-fallback ${leader.photoURL ? 'hidden' : ''}`}>
                        <span className="text-lg font-medium text-[#e3e3e3]">
                          {leader.displayName?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-lg text-[#e3e3e3]">
                          {leader.displayName}
                          {isCurrentUser && <span className="text-[#fbbf24] ml-2">(You)</span>}
                        </p>
                        <p className="text-sm text-[#9aa0a6]">
                          {leader.gamesPlayed} game{leader.gamesPlayed !== 1 ? 's' : ''} played
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-medium text-[#fbbf24]">{leader.score}</p>
                      <p className="text-sm text-[#9aa0a6]">points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
