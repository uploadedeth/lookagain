import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlayGame from '../components/PlayGame';

const PlayPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToMenu = () => {
    navigate('/');
  };

  return <PlayGame onBackToMenu={handleBackToMenu} />;
};

export default PlayPage;
