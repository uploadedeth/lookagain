'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { generateInitialImage, planDifferences, generateModifiedImage } from '../actions/gemini';
import { createGameRound, checkUserQuota, QuotaStatus } from '../lib/game-creation-client';
import Spinner from './Spinner';
import QuotaDisplay from './QuotaDisplay';
import ImageWithLoader from './ImageWithLoader';
import TypewriterText from './TypewriterText';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  if (arr.length < 2) throw new Error("Invalid data URL");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
};

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  "A cozy coffee shop with vintage decor and warm lighting",
  "A magical forest with glowing mushrooms and fairy lights",
  "A busy Japanese street market at sunset with food stalls",
  "An underwater coral reef scene with colorful fish",
  "A retro 80s arcade with neon lights and game machines",
  "A peaceful zen garden with cherry blossoms and koi pond",
  "A steampunk workshop filled with gears and inventions",
  "A medieval castle courtyard during a festival",
  "A futuristic cyberpunk city street with holographic ads",
  "A whimsical candy land with chocolate rivers and gummy bears"
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [examplePrompt] = useState(() => 
    EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]
  );
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [modifiedImage, setModifiedImage] = useState<string | null>(null);
  const [differences, setDifferences] = useState<string[]>([]);
  const [userQuota, setUserQuota] = useState<QuotaStatus | null>(null);
  const [showGeneratedGame, setShowGeneratedGame] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayedDifferences, setDisplayedDifferences] = useState<string[]>([]);
  const [currentDifferenceIndex, setCurrentDifferenceIndex] = useState(0);
  const [allDifferencesTyped, setAllDifferencesTyped] = useState(false);
  const typingCompleteRef = useRef<(() => void) | null>(null);

  // Fetch user quota on mount and when user changes
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
    
    fetchQuota();
  }, [user]);

  // Handle typewriter effect for differences
  useEffect(() => {
    if (currentDifferenceIndex < differences.length && loadingMessage === 'differences') {
      setDisplayedDifferences(prev => [...prev, differences[currentDifferenceIndex]]);
    }
  }, [currentDifferenceIndex, differences, loadingMessage]);

  // Check if all differences are typed
  useEffect(() => {
    if (displayedDifferences.length === differences.length && differences.length > 0 && loadingMessage === 'differences') {
      // Add a small delay after the last difference is fully typed
      const timer = setTimeout(() => {
        setAllDifferencesTyped(true);
        // Call the callback if it exists
        if (typingCompleteRef.current) {
          typingCompleteRef.current();
          typingCompleteRef.current = null;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [displayedDifferences, differences, loadingMessage]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Check quota before showing difficulty modal
    if (!user) {
      setError('Please sign in to create games');
      return;
    }
    
    if (userQuota && userQuota.remaining === 0) {
      setError(`You've reached your limit of ${userQuota.limit} games. Contact us to increase your quota.`);
      return;
    }
    
    if (prompt.trim()) {
      setShowDifficultyModal(true);
    }
  };

  const handleDifficultySelect = async (numDifferences: number) => {
    setShowDifficultyModal(false);
    setIsGenerating(true);
    setError(null);

    try {
      setLoadingMessage('Understanding your prompt...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingMessage('Creating the base scene...');
      const initialImageUrl = await generateInitialImage(prompt);
      setOriginalImage(initialImageUrl);

      setLoadingMessage(`Planning ${numDifferences} clever differences...`);
      const plannedDifferences = await planDifferences(prompt, numDifferences);
      setDifferences(plannedDifferences);
      
      // Start showing differences one by one with typewriter effect
      setDisplayedDifferences([]);
      setCurrentDifferenceIndex(0);
      setAllDifferencesTyped(false);
      setLoadingMessage('differences');

      // Wait for all differences to be typed
      await new Promise<void>((resolve) => {
        typingCompleteRef.current = resolve;
        
        // Timeout fallback after 30 seconds
        const timeout = setTimeout(() => {
          resolve();
          typingCompleteRef.current = null;
        }, 30000);
        
        // Clean up timeout if resolved earlier
        const originalResolve = resolve;
        resolve = () => {
          clearTimeout(timeout);
          originalResolve();
        };
      });
      
      setLoadingMessage('Applying subtle changes...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setLoadingMessage('Finalizing your puzzle...');
      const finalModifiedImageUrl = await generateModifiedImage(initialImageUrl, plannedDifferences);
      setModifiedImage(finalModifiedImageUrl);

      // Show the generated game
      setShowGeneratedGame(true);
      setIsGenerating(false);
      setLoadingMessage('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate the game. ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handlePlayClick = () => {
    router.push('/play');
  };

  const handleSaveGame = async () => {
    if (!user || !userProfile || !originalImage || !modifiedImage) return;
    
    setIsSaving(true);
    try {
      const gameId = await createGameRound(
        user.uid,
        userProfile.displayName,
        prompt,
        originalImage,
        modifiedImage,
        differences,
        true // isPublic
      );
      
      // Refresh quota after saving
      const updatedQuota = await checkUserQuota(user.uid);
      setUserQuota(updatedQuota);
      
      // Reset the form
      setPrompt('');
      setOriginalImage(null);
      setModifiedImage(null);
      setDifferences([]);
      setShowGeneratedGame(false);
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error saving game:', error);
      setError(error instanceof Error ? error.message : 'Failed to save game');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] sm:min-h-[80vh]">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-2 sm:px-4">
      {/* Show generated game */}
      {showGeneratedGame && originalImage && modifiedImage ? (
        <div className="w-full text-center animate-fade-in px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#e3e3e3]">Your Game is Ready!</h2>
          <p className="text-[#9aa0a6] mb-6 sm:mb-8 text-sm sm:text-base">{prompt}</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div>
              <p className="text-xs sm:text-sm text-[#9aa0a6] mb-2">Original</p>
              <ImageWithLoader
                src={originalImage} 
                alt="Original Scene" 
                className="w-full h-auto object-contain rounded-lg sm:rounded-xl shadow-2xl bg-black/20"
              />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-[#9aa0a6] mb-2">Find the differences</p>
              <ImageWithLoader
                src={modifiedImage} 
                alt="Modified Scene" 
                className="w-full h-auto object-contain rounded-lg sm:rounded-xl shadow-2xl bg-black/20"
              />
            </div>
          </div>
          
          <div className="bg-[#262628] rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 max-w-2xl mx-auto">
            <p className="text-[#9aa0a6] text-xs sm:text-sm mb-3 sm:mb-4 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base sm:text-lg">public</span>
              Your game will be shared publicly for other players to enjoy
            </p>
            <p className="text-[#e3e3e3] font-medium text-sm sm:text-base">{differences.length} differences in this puzzle</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={handleSaveGame}
              disabled={isSaving}
              className="px-6 sm:px-8 py-3 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#1c1c1d] rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {isSaving ? (
                <>
                  <Spinner size="xs" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg sm:text-xl">save</span>
                  <span>Save & Share Game</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowGeneratedGame(false);
                setPrompt('');
                setOriginalImage(null);
                setModifiedImage(null);
                setDifferences([]);
              }}
              className="px-6 sm:px-8 py-3 bg-[#3c3c3f] hover:bg-[#4a4a4d] text-[#e3e3e3] rounded-full font-medium transition-all text-sm sm:text-base"
            >
              Create Another
            </button>
          </div>
          {/* Mobile bottom spacing for browser navigation */}
          <div className="h-16 sm:h-0"></div>
        </div>
      ) : !isGenerating ? (
        <div className="w-full text-center mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#e3e3e3] mb-2 px-4">
            <span className="bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent">Hello</span>{authLoading ? (
              <span className="inline-block">
                , <span className="inline-block w-24 sm:w-32 h-8 sm:h-10 bg-[#262628] rounded-lg animate-pulse align-middle"></span>
              </span>
            ) : user && userProfile ? `, ${userProfile.displayName}` : ''}
          </h1>
          <p className="text-lg sm:text-xl text-[#6e7681] mb-6 md:mb-8 px-4">Create your spot-the-difference game</p>
          
          {/* Input container */}
          <div className="max-w-2xl mx-auto w-full px-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a scene description"
                  className="w-full px-4 sm:px-6 pt-4 sm:pt-4 pb-12 sm:pb-10 pr-12 sm:pr-14 bg-[#1c1c1d] border border-[#3c3c3f] rounded-2xl sm:rounded-3xl text-[#e3e3e3] text-base sm:text-lg placeholder-[#6e7681] focus:outline-none focus:border-[#fbbf24] transition-colors min-h-[56px] sm:min-h-[60px]"
                  disabled={isGenerating}
                />
                {!prompt && (
                  <p className="absolute left-4 sm:left-6 bottom-2 sm:bottom-3 text-xs sm:text-sm text-[#6e7681] pointer-events-none">
                    <span className="text-[#9aa0a6]">Eg.</span> <span className="hidden xs:inline">{examplePrompt}</span><span className="xs:hidden">{examplePrompt.length > 40 ? examplePrompt.substring(0, 40) + '...' : examplePrompt}</span>
                  </p>
                )}
                {prompt.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 bg-[#fbbf24] hover:bg-[#fbbf24]/90 rounded-full transition-all"
                    disabled={isGenerating}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#1c1c1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
            
            {/* Quota Display - only show if user has created at least 1 game */}
            {user && userQuota && userQuota.used > 0 && (
              <div className="mt-6 max-w-sm mx-auto">
                <QuotaDisplay 
                  quota={userQuota} 
                  label="Your Game Creation Quota"
                  showProgressBar={true}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Loading animation with banana */
        <div className="w-full text-center animate-fade-in max-w-2xl px-4">
          <div className="mb-6 md:mb-8 flex justify-center">
            <div className="text-6xl sm:text-7xl md:text-8xl animate-bounce">🍌</div>
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-[#e3e3e3] mb-4">Creating your game...</h2>
          
          {loadingMessage === 'differences' ? (
            <div className="text-left bg-[#262628] rounded-2xl p-6 mb-4">
              <p className="text-[#9aa0a6] mb-4">Here's what I'm planning:</p>
              <div className="space-y-2">
                {displayedDifferences.map((diff, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-[#fbbf24]">{index + 1}.</span>
                    {index === displayedDifferences.length - 1 && currentDifferenceIndex < differences.length ? (
                      <TypewriterText 
                        text={diff} 
                        speed={20}
                        onComplete={() => setCurrentDifferenceIndex(prev => prev + 1)}
                        className="text-[#e3e3e3]"
                      />
                    ) : (
                      <span className="text-[#e3e3e3]">{diff}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-base sm:text-lg text-[#9aa0a6] mb-2 px-2">{loadingMessage}</p>
          )}
          
          {loadingMessage !== 'differences' && (
            <div className="flex justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons - only show when not generating and not showing generated game */}
      {!isGenerating && !showGeneratedGame && (
        <div className="flex flex-col sm:flex-row gap-3 px-4">
          <button
            onClick={handlePlayClick}
            className="px-6 sm:px-8 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
          >
            <span className="material-symbols-outlined text-xl">sports_esports</span>
            <span className="font-medium">Play Community Games</span>
          </button>
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="px-6 sm:px-8 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all flex items-center justify-center gap-3 text-sm sm:text-base"
          >
            <span className="material-symbols-outlined text-xl">help_outline</span>
            <span className="font-medium">How it works</span>
          </button>
        </div>
      )}

      {/* Difficulty Selection Modal */}
      {showDifficultyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-normal text-[#e3e3e3] mb-4 sm:mb-6 text-center">
              Select number of differences
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  onClick={() => handleDifficultySelect(num)}
                  className="aspect-square bg-[#1c1c1d] hover:bg-[#fbbf24] hover:text-[#1c1c1d] text-[#e3e3e3] rounded-full text-lg sm:text-xl font-medium transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDifficultyModal(false)}
              className="mt-4 sm:mt-6 w-full py-3 text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-medium text-[#e3e3e3] mb-3 sm:mb-4">Error</h3>
            <p className="text-[#9aa0a6] mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] rounded-full font-medium transition-all text-sm sm:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-normal text-[#e3e3e3]">How LookAgain Works</h2>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1 sm:p-2 hover:bg-[#1c1c1d] rounded-full transition-all"
              >
                <span className="material-symbols-outlined text-[#9aa0a6] text-xl sm:text-2xl">close</span>
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Create Games Section */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[#fbbf24] mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg sm:text-xl">add_circle</span>
                  Create Your Own Games
                </h3>
                <div className="space-y-2 sm:space-y-3 text-[#9aa0a6] text-sm sm:text-base">
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">1.</span>
                    <p>Enter a creative scene description (e.g., "A magical forest with glowing mushrooms")</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">2.</span>
                    <p>Choose difficulty level (3-10 differences)</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">3.</span>
                    <p>AI generates two images: an original and one with subtle differences</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">4.</span>
                    <p>Save your creation to share with the community</p>
                  </div>
                </div>
              </div>

              {/* Play Games Section */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[#fbbf24] mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg sm:text-xl">sports_esports</span>
                  Play Community Games
                </h3>
                <div className="space-y-2 sm:space-y-3 text-[#9aa0a6] text-sm sm:text-base">
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">1.</span>
                    <p>Click "Play Community Games" to get a random puzzle</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">2.</span>
                    <p>Compare the two images side by side</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">3.</span>
                    <p>Guess the number of differences (3-5, 6-8, or 9+)</p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <span className="text-[#e3e3e3] font-medium">4.</span>
                    <p>Earn 10 points for each correct answer!</p>
                  </div>
                </div>
              </div>

              {/* Scoring Section */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[#fbbf24] mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg sm:text-xl">leaderboard</span>
                  Compete & Climb the Leaderboard
                </h3>
                <div className="space-y-1 sm:space-y-2 text-[#9aa0a6] text-sm sm:text-base">
                  <p>• Earn points by correctly guessing the number of differences</p>
                  <p>• Track your progress with personal stats</p>
                  <p>• Compete with other players on the global leaderboard</p>
                  <p>• Create popular games to contribute to the community</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorksModal(false)}
              className="w-full mt-6 sm:mt-8 py-3 bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] rounded-full font-medium transition-all text-sm sm:text-base"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HomePage;