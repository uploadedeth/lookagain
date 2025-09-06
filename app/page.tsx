/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

"use client";

import React, { useState, useCallback, useTransition, useEffect } from 'react';
import Header from '@/components/Header';
import Spinner from '@/components/Spinner';
import StartScreen from '@/components/StartScreen';
import { generateGame } from './actions';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

type GameState = 'start' | 'loading' | 'playing' | 'finished';

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [prompt, setPrompt] = useState<string>('');
  const [numDifferences, setNumDifferences] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [modifiedImage, setModifiedImage] = useState<string | null>(null);
  const [differences, setDifferences] = useState<string[]>([]);
  
  const [guessOptions, setGuessOptions] = useState<string[]>([]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  const { setFrameReady, isFrameReady } = useMiniKit();

  const getCorrectRange = (count: number): string => {
      if (count >= 3 && count <= 5) return '3-5 differences';
      if (count >= 6 && count <= 8) return '6-8 differences';
      return '9+ differences';
  };

  useEffect(() => {
    if (!isFrameReady) setFrameReady();
  }, [isFrameReady, setFrameReady]);

  const handleGenerateGame = useCallback(() => {
    if (!prompt.trim()) {
      setError('Please enter a description for the scene.');
      return;
    }
    if (numDifferences < 3 || numDifferences > 10) {
      setError('Please enter a number of differences between 3 and 10.');
      return;
    }

    setGameState('loading');
    setError(null);
    setFeedback(null);
    setShowAnswers(false);
    setSelectedGuess(null);
    setGuessOptions([]);

    startTransition(async () => {
      const result = await generateGame(prompt, numDifferences);
      
      if (result.success) {
        setOriginalImage(result.originalImage);
        setModifiedImage(result.modifiedImage);
        setDifferences(result.differences);
        setGuessOptions(['3-5 differences', '6-8 differences', '9+ differences']);
        setGameState('playing');
      } else {
        setError(`Failed to generate the game. ${result.error}`);
        setGameState('start');
        console.error(result.error);
      }
    });
  }, [prompt, numDifferences]);

  const handleCheckAnswer = (guess: string) => {
    setSelectedGuess(guess);
    const actualCount = differences.length;
    const correctRange = getCorrectRange(actualCount);

    if (guess === correctRange) {
        setFeedback(`Correct! There are ${actualCount} differences.`);
        setGameState('finished');
    } else {
        setFeedback(`Not quite. The correct answer was ${actualCount} differences.`);
    }
  };

  const handlePlayAgain = () => {
    setGameState('start');
    setPrompt('');
    setOriginalImage(null);
    setModifiedImage(null);
    setDifferences([]);
    setError(null);
    setFeedback(null);
    setSelectedGuess(null);
    setGuessOptions([]);
  };
  
  const renderContent = () => {
    if (gameState === 'loading') {
      return (
        <div className="text-center animate-fade-in flex flex-col items-center gap-6">
            <Spinner />
            <p className="text-xl text-gray-300">Generating your game...</p>
        </div>
      );
    }
    
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => { setError(null); setGameState('start'); }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
              >
                Try Again
            </button>
          </div>
        );
    }

    if (gameState === 'playing' || gameState === 'finished') {
      return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <h2 className="text-3xl font-bold text-center">Spot the Differences!</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <img src={originalImage!} alt="Original Scene" className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"/>
            <img src={modifiedImage!} alt="Modified Scene" className="w-full h-auto object-contain rounded-xl shadow-2xl bg-black/20"/>
          </div>

          <div className="w-full max-w-2xl bg-gray-800/80 border border-gray-700/80 rounded-lg p-6 mt-4 flex flex-col items-center gap-4 backdrop-blur-sm">
            <h3 className="text-xl font-semibold">How many differences can you spot?</h3>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {guessOptions.map(option => {
                const isSelected = selectedGuess === option;
                const correctRange = getCorrectRange(differences.length);
                const isCorrect = option === correctRange;
                
                let buttonClass = 'bg-gradient-to-br from-blue-600 to-blue-500 hover:shadow-xl';
                if (selectedGuess !== null) {
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
                        onClick={() => handleCheckAnswer(option)}
                        className={`${buttonClass} text-white font-bold py-3 px-6 text-lg rounded-lg transition-all shadow-lg active:scale-95 disabled:shadow-none disabled:cursor-not-allowed`}
                        disabled={selectedGuess !== null}
                    >
                        {option}
                    </button>
                );
              })}
            </div>
            
            {feedback && (
                <p className={`mt-2 font-semibold text-lg ${gameState === 'finished' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {feedback}
                </p>
            )}

            {gameState === 'finished' && (
                <div className="w-full flex flex-col items-center gap-4 mt-4 animate-fade-in">
                    <button
                        onClick={() => setShowAnswers(!showAnswers)}
                        className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all hover:bg-white/20"
                    >
                        {showAnswers ? 'Hide' : 'Show'} Answers
                    </button>
                    {showAnswers && (
                        <div className="w-full bg-black/20 p-4 rounded-lg text-left">
                            <h4 className="font-bold text-lg mb-2">The differences were:</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-300">
                                {differences.map((diff, index) => <li key={index}>{diff}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
          </div>
          <button 
            onClick={handlePlayAgain}
            className="mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Play Again
          </button>
        </div>
      );
    }
    
    return <StartScreen 
      prompt={prompt} 
      setPrompt={setPrompt} 
      handleGenerate={handleGenerateGame} 
      isLoading={isPending}
      numDifferences={numDifferences}
      setNumDifferences={setNumDifferences}
    />;
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex justify-center items-center`}>
        {renderContent()}
      </main>
    </div>
  );
};
