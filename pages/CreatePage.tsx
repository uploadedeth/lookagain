import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateInitialImage, planDifferences, generateModifiedImage } from '../services/geminiService';
import { createGameRound } from '../services/gameService';
import { useAuth } from '../contexts/AuthContext';
import StartScreen from '../components/StartScreen';
import Spinner from '../components/Spinner';
import ImageWithLoader from '../components/ImageWithLoader';

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

type GameState = 'create' | 'loading' | 'confirming' | 'playing' | 'finished';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const [gameState, setGameState] = useState<GameState>('create');
  const [prompt, setPrompt] = useState<string>('');
  const [numDifferences, setNumDifferences] = useState<number>(5);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [modifiedImage, setModifiedImage] = useState<string | null>(null);
  const [differences, setDifferences] = useState<string[]>([]);
  
  const [guessOptions, setGuessOptions] = useState<string[]>([]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  // Check if we have game data from navigation
  useEffect(() => {
    if (location.state) {
      const { originalImage: original, modifiedImage: modified, differences: diffs, prompt: gamePrompt } = location.state;
      if (original && modified && diffs) {
        setOriginalImage(original);
        setModifiedImage(modified);
        setDifferences(diffs);
        setPrompt(gamePrompt || '');
        setGuessOptions(['3-5 differences', '6-8 differences', '9+ differences']);
        setGameState('confirming');
      }
    }
  }, [location.state]);

  const getCorrectRange = (count: number): string => {
    if (count >= 3 && count <= 5) return '3-5 differences';
    if (count >= 6 && count <= 8) return '6-8 differences';
    return '9+ differences';
  };

  const handleGenerateGame = useCallback(async () => {
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

    try {
      setLoadingMessage('Step 1/3: Generating your scene...');
      const initialImageUrl = await generateInitialImage(prompt);
      setOriginalImage(initialImageUrl);
      const originalImageFile = dataURLtoFile(initialImageUrl, 'original.png');

      setLoadingMessage('Step 2/3: Thinking of clever differences...');
      const plannedDifferences = await planDifferences(prompt, numDifferences);
      setDifferences(plannedDifferences);

      // Setup guess options
      setGuessOptions(['3-5 differences', '6-8 differences', '9+ differences']);

      setLoadingMessage('Step 3/3: Applying changes...');
      const finalModifiedImageUrl = await generateModifiedImage(originalImageFile, plannedDifferences);
      setModifiedImage(finalModifiedImageUrl);

      setGameState('confirming');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate the game. ${errorMessage}`);
      setGameState('create');
      console.error(err);
    } finally {
      setLoadingMessage('');
    }
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
    navigate('/');
  };

  const handleSaveGame = async () => {
    if (!user || !userProfile) {
      setError('You must be signed in to save games');
      return;
    }

    if (!originalImage || !modifiedImage) {
      setError('Game data is missing');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await createGameRound(
        user.uid,
        userProfile.displayName,
        prompt,
        originalImage,
        modifiedImage,
        differences,
        true // Always public
      );
      
      setGameState('playing');
    } catch (err) {
      console.error('Error saving game:', err);
      setError('Failed to save game. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="text-center animate-fade-in flex flex-col items-center gap-6">
        <Spinner size="md" />
        <p className="text-xl text-gray-300">{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
        <p className="text-md text-red-400">{error}</p>
        <button
          onClick={() => { setError(null); setGameState('create'); }}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (gameState === 'confirming' || gameState === 'playing' || gameState === 'finished') {
    return (
      <>
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <h2 className="text-3xl font-light text-[#e3e3e3] text-center">Your Game is Ready!</h2>
          <p className="text-lg text-[#9aa0a6] -mt-4 mb-4">{differences.length} differences to find</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <div>
              <p className="text-sm text-[#9aa0a6] mb-2 text-center">Original</p>
              <ImageWithLoader src={originalImage!} alt="Original Scene" className="w-full h-auto object-contain rounded-2xl bg-[#262628]"/>
            </div>
            <div>
              <p className="text-sm text-[#9aa0a6] mb-2 text-center">With Differences</p>
              <ImageWithLoader src={modifiedImage!} alt="Modified Scene" className="w-full h-auto object-contain rounded-2xl bg-[#262628]"/>
            </div>
          </div>

          {gameState === 'confirming' && (
            <div className="flex flex-col items-center gap-4 mt-6">
              <div className="bg-[#1c1c1d] rounded-2xl p-4 text-center">
                <p className="text-[#9aa0a6] text-sm">
                  <span className="material-symbols-outlined text-base align-middle mr-1">public</span>
                  Your game will be shared publicly for other players to enjoy
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleSaveGame}
                  disabled={isSaving || !user}
                  className="px-8 py-3 bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] rounded-full font-medium transition-all disabled:bg-[#3c3c3f] disabled:text-[#6e7681] disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Spinner size="xs" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save & Share Game'
                  )}
                </button>
                <button 
                  onClick={handlePlayAgain}
                  disabled={isSaving}
                  className="px-8 py-3 text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors disabled:opacity-50"
                >
                  Create Another
                </button>
              </div>
              {!user && (
                <p className="text-[#9aa0a6] text-sm">
                  Sign in to save and share your games
                </p>
              )}
            </div>
          )}

          {gameState === 'playing' && (
            <div className="text-center mt-6">
              <p className="text-[#9aa0a6] mb-4">Your game has been saved!</p>
              <button 
                onClick={handlePlayAgain}
                className="px-8 py-3 bg-[#262628] hover:bg-[#2d2d30] text-[#e3e3e3] rounded-full transition-all"
              >
                Create Another Game
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <StartScreen 
      prompt={prompt} 
      setPrompt={setPrompt} 
      handleGenerate={handleGenerateGame} 
      isLoading={false}
      numDifferences={numDifferences}
      setNumDifferences={setNumDifferences}
    />
  );
};

export default CreatePage;
