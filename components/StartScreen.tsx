/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface StartScreenProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    handleGenerate: () => void;
    isLoading: boolean;
    numDifferences: number;
    setNumDifferences: (num: number) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ prompt, setPrompt, handleGenerate, isLoading, numDifferences, setNumDifferences }) => {
    return (
        <div className="w-full max-w-4xl mx-auto text-center flex flex-col items-center gap-6 animate-fade-in">
            <h1 className="text-4xl font-light text-[#e3e3e3] sm:text-5xl">
                Create Your Own <span className="text-[#fbbf24]">Spot the Difference</span> Game
            </h1>
            <p className="text-lg text-[#9aa0a6] font-light">
                Describe a scene, choose the number of differences, and our AI will generate a unique puzzle for you.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full mt-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-grow">
                  <label htmlFor="scene-prompt" className="block text-sm font-medium text-[#9aa0a6] mb-2 text-left">Describe the scene</label>
                  <input
                      id="scene-prompt"
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., 'A cat napping in a sunlit library'"
                      className="bg-[#262628] border border-[#3c3c3f] text-[#e3e3e3] rounded-2xl p-5 text-lg focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent focus:outline-none transition w-full placeholder-[#6e7681]"
                      disabled={isLoading}
                      aria-label="Scene description"
                  />
                </div>
                <div>
                  <label htmlFor="num-diffs" className="block text-sm font-medium text-[#9aa0a6] mb-2 text-left">Differences</label>
                   <input
                      id="num-diffs"
                      type="number"
                      value={numDifferences}
                      onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                              setNumDifferences(val);
                          }
                      }}
                      min="3"
                      max="10"
                      className="bg-[#262628] border border-[#3c3c3f] text-[#e3e3e3] rounded-2xl p-5 text-lg focus:ring-2 focus:ring-[#fbbf24] focus:border-transparent focus:outline-none transition w-full sm:w-28 text-center"
                      disabled={isLoading}
                      aria-label="Number of differences"
                  />
                </div>
                <button 
                    type="submit"
                    className="bg-[#fbbf24] hover:bg-[#fbbf24]/90 text-[#1c1c1d] font-medium py-5 px-10 text-lg rounded-full transition-all active:scale-95 disabled:bg-[#3c3c3f] disabled:text-[#6e7681] disabled:cursor-not-allowed w-full sm:w-auto"
                    disabled={isLoading || !prompt.trim() || numDifferences < 3 || numDifferences > 10}
                >
                    Generate
                </button>
            </form>
        </div>
    );
};

export default StartScreen;
