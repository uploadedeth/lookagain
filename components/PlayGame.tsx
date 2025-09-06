import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRandomUnplayedGame, verifyAnswerAndRecordPlay } from '../services/playService';
import Spinner from './Spinner';
import ImageWithLoader from './ImageWithLoader';

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

interface PlayGameProps {
  onBackToMenu: () => void;
}

const PlayGame: React.FC<PlayGameProps> = ({ onBackToMenu }) => {
  const { user, userProfile } = useAuth();
  const [currentGame, setCurrentGame] = useState<GameRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [actualCount, setActualCount] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const guessOptions = ['3-5 differences', '6-8 differences', '9+ differences'];

  useEffect(() => {
    loadNewGame();
  }, [user]);

  const loadNewGame = async () => {
    if (!user) {
      setError('You must be signed in to play');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedGuess(null);
    setFeedback(null);
    setShowResult(false);
    setPointsEarned(0);
    setActualCount(null);

    try {
      const game = await getRandomUnplayedGame(user.uid);
      if (!game) {
        setError('No more games available! Check back later for new puzzles.');
        setCurrentGame(null);
      } else {
        // Remove the differences array to prevent cheating
        const { differences, ...safeGameData } = game;
        setCurrentGame(safeGameData as GameRound);
      }
    } catch (err) {
      console.error('Error loading game:', err);
      setError('Failed to load game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAnswer = async (guess: string) => {
    if (!user || !userProfile || !currentGame) return;

    setSelectedGuess(guess);
    setIsVerifying(true);

    try {
      const result = await verifyAnswerAndRecordPlay(
        currentGame.id,
        user.uid,
        userProfile.displayName,
        guess
      );

      setShowResult(true);
      setPointsEarned(result.pointsEarned);
      setActualCount(result.actualCount);
      
      if (result.isCorrect) {
        setFeedback(`Correct! You earned ${result.pointsEarned} points!`);
      } else {
        setFeedback(`Not quite. The correct answer was ${result.actualCount} differences.`);
      }
    } catch (err) {
      console.error('Error checking answer:', err);
      setError('Failed to verify answer. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading && !currentGame) {
    return (
      <div className="text-center animate-fade-in flex flex-col items-center gap-6">
        <Spinner size="md" />
        <p className="text-xl text-gray-300">Finding a puzzle for you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-red-300">Oops!</h2>
        <p className="text-md text-red-400">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={loadNewGame}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onBackToMenu}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Spot the Differences!</h2>
        <p className="text-gray-400">Created by: {currentGame.creatorName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        <ImageWithLoader
          src={currentGame.originalImageUrl} 
          alt="Original Scene" 
          className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"
        />
        <ImageWithLoader
          src={currentGame.modifiedImageUrl} 
          alt="Modified Scene" 
          className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"
        />
      </div>

      <div className="w-full max-w-2xl bg-gray-800/80 border border-gray-700/80 rounded-lg p-6 mt-4 flex flex-col items-center gap-4 backdrop-blur-sm">
        <h3 className="text-xl font-semibold">How many differences can you spot?</h3>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {guessOptions.map(option => {
            const isSelected = selectedGuess === option;
            const isDisabled = showResult || isVerifying;
            
            let buttonClass = 'bg-gradient-to-br from-yellow-500 to-yellow-400 hover:shadow-xl';
            if (showResult && actualCount !== null) {
              const correctRange = actualCount >= 3 && actualCount <= 5 ? '3-5 differences' :
                                  actualCount >= 6 && actualCount <= 8 ? '6-8 differences' : 
                                  '9+ differences';
              const isCorrect = option === correctRange;
              
              if (isCorrect) {
                buttonClass = 'bg-gradient-to-br from-green-600 to-green-500 scale-105 shadow-xl';
              } else if (isSelected) {
                buttonClass = 'bg-gradient-to-br from-red-600 to-red-500';
              } else {
                buttonClass = 'bg-gradient-to-br from-gray-700 to-gray-600 opacity-60';
              }
            }

            return (
                  <button
                    key={option}
                    onClick={() => !isDisabled && handleCheckAnswer(option)}
                    className={`${buttonClass} text-white font-bold py-3 px-6 text-lg rounded-lg transition-all shadow-lg active:scale-95 disabled:shadow-none disabled:cursor-not-allowed relative`}
                    disabled={isDisabled}
                  >
                    {isVerifying && isSelected ? (
                      <div className="flex items-center gap-2">
                        <Spinner size="xs" />
                        <span>Checking...</span>
                      </div>
                    ) : (
                      option
                    )}
                  </button>
            );
          })}
        </div>
        
        {feedback && (
          <div className="mt-2 text-center">
            <p className={`font-semibold text-lg ${pointsEarned > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {feedback}
            </p>
            {pointsEarned > 0 && (
              <p className="text-yellow-400 mt-2 animate-bounce">
                +{pointsEarned} points!
              </p>
            )}
          </div>
        )}

        {showResult && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={loadNewGame}
              className="bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
              disabled={loading}
            >
              Next Game
            </button>
            <button
              onClick={onBackToMenu}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayGame;
