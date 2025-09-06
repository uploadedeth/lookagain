import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createGameRound } from '../services/gameService';
import Spinner from './Spinner';

interface GameConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  prompt: string;
  originalImage: string;
  modifiedImage: string;
  differences: string[];
}

const GameConfirmationModal: React.FC<GameConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  prompt,
  originalImage,
  modifiedImage,
  differences
}) => {
  const { user, userProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveGame = async () => {
    if (!user || !userProfile) {
      setError('You must be signed in to save games');
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
      
      onConfirm();
    } catch (err) {
      console.error('Error saving game:', err);
      setError('Failed to save game. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#262628] rounded-3xl max-w-2xl w-full p-8 animate-fade-in">
        <h2 className="text-2xl font-normal text-[#e3e3e3] mb-4 text-center">Save Your Game</h2>
        
        <div className="mb-6 space-y-4">
          <div className="text-center">
            <p className="text-lg text-[#9aa0a6] mb-2">{prompt}</p>
            <p className="text-[#fbbf24] font-medium">{differences.length} differences</p>
          </div>

          <div className="bg-[#1c1c1d] rounded-2xl p-4 text-center">
            <p className="text-[#9aa0a6] text-sm">
              <span className="material-symbols-outlined text-base align-middle mr-1">public</span>
              Your game will be shared publicly for other players to enjoy
            </p>
          </div>
        </div>

        {!user && (
          <div className="mb-6 p-4 bg-[#1c1c1d] rounded-2xl">
            <p className="text-[#9aa0a6] text-center">
              Sign in to save and share your games
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 rounded-2xl">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-8 py-3 text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
          
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
              'Save & Share'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameConfirmationModal;
