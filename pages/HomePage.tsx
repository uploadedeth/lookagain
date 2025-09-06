import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generateInitialImage, planDifferences, generateModifiedImage } from '../services/geminiService';
import GameConfirmationModal from '../components/GameConfirmationModal';
import Spinner from '../components/Spinner';

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
  const navigate = useNavigate();
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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
      const originalImageFile = dataURLtoFile(initialImageUrl, 'original.png');

      setLoadingMessage(`Planning ${numDifferences} clever differences...`);
      const plannedDifferences = await planDifferences(prompt, numDifferences);
      setDifferences(plannedDifferences);

      setLoadingMessage('Applying subtle changes...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLoadingMessage('Finalizing your puzzle...');
      const finalModifiedImageUrl = await generateModifiedImage(originalImageFile, plannedDifferences);
      setModifiedImage(finalModifiedImageUrl);

      // Navigate to create page with the generated game
      navigate('/create', { 
        state: { 
          originalImage: initialImageUrl,
          modifiedImage: finalModifiedImageUrl,
          differences: plannedDifferences,
          prompt
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate the game. ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  const handlePlayClick = () => {
    navigate('/play');
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-4">
      {/* Main greeting and input */}
      {!isGenerating ? (
        <div className="w-full text-center mb-12">
          <h1 className="text-4xl font-light text-[#e3e3e3] mb-2">
            <span className="bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] bg-clip-text text-transparent">Hello</span>{authLoading ? (
              <span className="inline-block">
                , <span className="inline-block w-32 h-10 bg-[#262628] rounded-lg animate-pulse align-middle"></span>
              </span>
            ) : user && userProfile ? `, ${userProfile.displayName}` : ''}
          </h1>
          <p className="text-xl text-[#6e7681] mb-8">Create your spot-the-difference game</p>
          
          {/* Input container */}
          <div className="max-w-2xl mx-auto w-full">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a scene description"
                  className="w-full px-6 pt-4 pb-10 pr-14 bg-[#1c1c1d] border border-[#3c3c3f] rounded-3xl text-[#e3e3e3] text-lg placeholder-[#6e7681] focus:outline-none focus:border-[#fbbf24] transition-colors"
                  disabled={isGenerating}
                />
                {!prompt && (
                  <p className="absolute left-6 bottom-3 text-sm text-[#6e7681] pointer-events-none">
                    <span className="text-[#9aa0a6]">Eg.</span> {examplePrompt}
                  </p>
                )}
                {prompt.trim() && (
                  <button
                    type="submit"
                    className="absolute right-3 bottom-3 p-2 bg-[#fbbf24] hover:bg-[#fbbf24]/90 rounded-full transition-all"
                    disabled={isGenerating}
                  >
                    <svg className="w-5 h-5 text-[#1c1c1d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Loading animation with AI avatar */
        <div className="w-full text-center animate-fade-in">
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-[#fbbf24] rounded-full flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-4xl">smart_toy</span>
            </div>
          </div>
          <h2 className="text-2xl font-light text-[#e3e3e3] mb-4">Creating your game...</h2>
          <p className="text-lg text-[#9aa0a6] mb-2">{loadingMessage}</p>
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* Action buttons - only show when not generating */}
      {!isGenerating && (
        <div className="flex gap-3">
          <button
            onClick={handlePlayClick}
            className="px-8 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-xl">sports_esports</span>
            <span className="font-medium">Play Community Games</span>
          </button>
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="px-8 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-xl">help_outline</span>
            <span className="font-medium">How it works</span>
          </button>
        </div>
      )}

      {/* Difficulty Selection Modal */}
      {showDifficultyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-3xl p-8 max-w-md w-full animate-fade-in">
            <h2 className="text-2xl font-normal text-[#e3e3e3] mb-6 text-center">
              Select number of differences
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  onClick={() => handleDifficultySelect(num)}
                  className="aspect-square bg-[#1c1c1d] hover:bg-[#fbbf24] hover:text-[#1c1c1d] text-[#e3e3e3] rounded-full text-xl font-medium transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDifficultyModal(false)}
              className="mt-6 w-full py-3 text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-3xl p-8 max-w-md">
            <h3 className="text-xl font-medium text-[#e3e3e3] mb-4">Error</h3>
            <p className="text-[#9aa0a6] mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3 bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] rounded-full font-medium transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#262628] rounded-3xl p-8 max-w-2xl max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-normal text-[#e3e3e3]">How LookAgain Works</h2>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-2 hover:bg-[#1c1c1d] rounded-full transition-all"
              >
                <span className="material-symbols-outlined text-[#9aa0a6]">close</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Create Games Section */}
              <div>
                <h3 className="text-lg font-medium text-[#fbbf24] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">add_circle</span>
                  Create Your Own Games
                </h3>
                <div className="space-y-3 text-[#9aa0a6]">
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">1.</span>
                    <p>Enter a creative scene description (e.g., "A magical forest with glowing mushrooms")</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">2.</span>
                    <p>Choose difficulty level (3-10 differences)</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">3.</span>
                    <p>AI generates two images: an original and one with subtle differences</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">4.</span>
                    <p>Save your creation to share with the community</p>
                  </div>
                </div>
              </div>

              {/* Play Games Section */}
              <div>
                <h3 className="text-lg font-medium text-[#fbbf24] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">sports_esports</span>
                  Play Community Games
                </h3>
                <div className="space-y-3 text-[#9aa0a6]">
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">1.</span>
                    <p>Click "Play Community Games" to get a random puzzle</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">2.</span>
                    <p>Compare the two images side by side</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">3.</span>
                    <p>Guess the number of differences (3-5, 6-8, or 9+)</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[#e3e3e3] font-medium">4.</span>
                    <p>Earn 10 points for each correct answer!</p>
                  </div>
                </div>
              </div>

              {/* Scoring Section */}
              <div>
                <h3 className="text-lg font-medium text-[#fbbf24] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">leaderboard</span>
                  Compete & Climb the Leaderboard
                </h3>
                <div className="space-y-2 text-[#9aa0a6]">
                  <p>• Earn points by correctly guessing the number of differences</p>
                  <p>• Track your progress with personal stats</p>
                  <p>• Compete with other players on the global leaderboard</p>
                  <p>• Create popular games to contribute to the community</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorksModal(false)}
              className="w-full mt-8 py-3 bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] rounded-full font-medium transition-all"
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