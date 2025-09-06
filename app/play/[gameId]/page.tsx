'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { getSpecificGame, getUserGamePlay, verifyAnswerAndRecordPlay } from '../../lib/game-client';
import Spinner from '../../components/Spinner';
import ImageWithLoader from '../../components/ImageWithLoader';

interface GameRound {
  id: string;
  creatorId: string;
  creatorName: string;
  prompt: string;
  originalImageUrl: string;
  modifiedImageUrl: string;
  difficultyRange: string;
  playCount: number;
}

interface GamePlay {
  gameId: string;
  playerId: string;
  playerName: string;
  score: number;
  selectedAnswer: string;
  correctAnswer: number;
  isCorrect: boolean;
  playedAt: any;
}

const SpecificGamePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const { user, userProfile } = useAuth();
  const [currentGame, setCurrentGame] = useState<GameRound | null>(null);
  const [previousPlay, setPreviousPlay] = useState<GamePlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [actualCount, setActualCount] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const gameId = params?.gameId as string;
  const guessOptions = ['3-5 differences', '6-8 differences', '9+ differences'];

  useEffect(() => {
    if (gameId && user) {
      loadSpecificGame();
    }
  }, [gameId, user]);

  const loadSpecificGame = async () => {
    if (!user) {
      setError('You must be signed in to play');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the specific game
      const game = await getSpecificGame(gameId, user.uid);
      
      if (!game) {
        setError('Game not found or you cannot play this game');
        setLoading(false);
        return;
      }

      // Check if user has already played this game
      const userPlay = await getUserGamePlay(gameId, user.uid);
      
      if (userPlay) {
        setPreviousPlay(userPlay);
        setShowResult(true);
        setActualCount(userPlay.correctAnswer);
        setPointsEarned(userPlay.score);
        setFeedback(userPlay.isCorrect ? 'Correct!' : 'Incorrect');
      }

      // Remove the differences array to prevent cheating
      const { differences, ...safeGameData } = game;
      setCurrentGame(safeGameData as GameRound);
      
    } catch (err) {
      console.error('Error loading specific game:', err);
      setError('Failed to load game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = async (guess: string) => {
    if (!user || !userProfile || !currentGame || isVerifying || previousPlay) return;
    
    setIsVerifying(true);
    setSelectedGuess(guess);
    
    try {
      const result = await verifyAnswerAndRecordPlay(
        currentGame.id,
        user.uid,
        userProfile.displayName,
        guess
      );
      
      setActualCount(result.actualCount);
      setPointsEarned(result.pointsEarned);
      setFeedback(result.isCorrect ? 'Correct!' : 'Incorrect');
      setShowResult(true);
    } catch (error) {
      console.error('Error verifying answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in max-w-2xl px-4">
          <div className="mb-6 md:mb-8 flex justify-center">
            <div className="text-6xl sm:text-7xl md:text-8xl animate-bounce">🍌</div>
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-[#e3e3e3] mb-4">Loading your game...</h2>
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-xl font-medium text-[#e3e3e3] mb-2">Oops!</h2>
          <p className="text-[#9aa0a6] mb-6">{error}</p>
          <button
            onClick={handleBackToHome}
            className="px-6 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] rounded-full font-medium transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
          {/* Game Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e3e3e3] mb-2">
              {previousPlay ? 'Your Previous Result' : 'Spot the Differences'}
            </h1>
            <p className="text-[#9aa0a6] mb-2">{currentGame.prompt}</p>
            <p className="text-sm text-[#6e7681]">Created by {currentGame.creatorName}</p>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="text-center">
              <p className="text-sm text-[#9aa0a6] mb-3">Original</p>
              <ImageWithLoader
                src={currentGame.originalImageUrl}
                alt="Original Scene"
                className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-[#9aa0a6] mb-3">Find the differences</p>
              <ImageWithLoader
                src={currentGame.modifiedImageUrl}
                alt="Modified Scene"
                className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"
              />
            </div>
          </div>

          {/* Game Controls */}
          <div className="max-w-2xl mx-auto text-center">
            {previousPlay ? (
              /* Show previous results */
              <div className="bg-[#262628] rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-medium text-[#e3e3e3] mb-4">Your Previous Answer</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Your guess:</span>
                    <span className="text-[#e3e3e3] font-medium">{previousPlay.selectedAnswer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Actual differences:</span>
                    <span className="text-[#e3e3e3] font-medium">{previousPlay.correctAnswer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Result:</span>
                    <span className={`font-medium ${previousPlay.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {previousPlay.isCorrect ? 'Correct! +10 points' : 'Incorrect'}
                    </span>
                  </div>
                </div>
              </div>
            ) : showResult ? (
              /* Show current result */
              <div className="bg-[#262628] rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-medium text-[#e3e3e3] mb-4">Result</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Your guess:</span>
                    <span className="text-[#e3e3e3] font-medium">{selectedGuess}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Actual differences:</span>
                    <span className="text-[#e3e3e3] font-medium">{actualCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9aa0a6]">Points earned:</span>
                    <span className={`font-medium ${pointsEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pointsEarned > 0 ? `+${pointsEarned}` : '0'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Show guess options */
              <div className="mb-8">
                <h3 className="text-lg font-medium text-[#e3e3e3] mb-6">
                  How many differences do you see?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {guessOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleCheckAnswer(option)}
                      disabled={isVerifying}
                      className="p-4 bg-[#262628] hover:bg-[#fbbf24] hover:text-[#1c1c1d] text-[#e3e3e3] rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? <Spinner size="xs" /> : option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={handleBackToHome}
              className="px-6 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
  );
};

export default SpecificGamePage;
