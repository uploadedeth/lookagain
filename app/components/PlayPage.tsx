'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import PlayGame from './PlayGame';

const PlayPage: React.FC = () => {
  const router = useRouter();

  const handleBackToMenu = () => {
    router.push('/');
  };

  return <PlayGame onBackToMenu={handleBackToMenu} />;
};

export default PlayPage;
