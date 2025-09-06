import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface GameRound {
  id: string;
  creatorId: string;
  creatorName: string;
  prompt: string;
  originalImageUrl: string;
  modifiedImageUrl: string;
  differences: string[];
  difficultyRange: string;
  createdAt: any;
  playCount: number;
  isPublic: boolean;
}

interface GamePlay {
  gameId: string;
  playerId: string;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  playedAt: any;
}

// Get games that the user hasn't played yet
export const getUnplayedGames = async (userId: string): Promise<GameRound[]> => {
  try {
    // First, get all public games
    const gamesQuery = query(
      collection(db, 'gameRounds'),
      where('isPublic', '==', true),
      where('creatorId', '!=', userId) // Don't show user's own games
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    
    // Get all games the user has played
    const playsQuery = query(
      collection(db, 'gamePlays'),
      where('playerId', '==', userId)
    );
    const playsSnapshot = await getDocs(playsQuery);
    
    const playedGameIds = new Set(
      playsSnapshot.docs.map(doc => doc.data().gameId)
    );
    
    // Filter out played games
    const unplayedGames: GameRound[] = [];
    gamesSnapshot.docs.forEach(doc => {
      if (!playedGameIds.has(doc.id)) {
        unplayedGames.push({
          id: doc.id,
          ...doc.data()
        } as GameRound);
      }
    });
    
    return unplayedGames;
  } catch (error) {
    console.error('Error fetching unplayed games:', error);
    throw new Error('Failed to fetch games');
  }
};

// Get a random unplayed game
export const getRandomUnplayedGame = async (userId: string): Promise<GameRound | null> => {
  try {
    const unplayedGames = await getUnplayedGames(userId);
    
    if (unplayedGames.length === 0) {
      return null; // No games available
    }
    
    // Select a random game
    const randomIndex = Math.floor(Math.random() * unplayedGames.length);
    return unplayedGames[randomIndex];
  } catch (error) {
    console.error('Error getting random game:', error);
    throw error;
  }
};

// Verify answer server-side and record the play
export const verifyAnswerAndRecordPlay = async (
  gameId: string,
  userId: string,
  userName: string,
  userGuess: string
): Promise<{ isCorrect: boolean; actualCount: number; pointsEarned: number }> => {
  try {
    // Fetch the game from Firestore (server-side, so we get the real answer)
    const gameRef = doc(db, 'gameRounds', gameId);
    const gameDoc = await getDoc(gameRef);
    
    if (!gameDoc.exists()) {
      throw new Error('Game not found');
    }
    
    const gameData = gameDoc.data() as GameRound;
    const actualCount = gameData.differences.length;
    
    // Determine correct range
    let correctRange = '3-5 differences';
    if (actualCount >= 6 && actualCount <= 8) {
      correctRange = '6-8 differences';
    } else if (actualCount >= 9) {
      correctRange = '9+ differences';
    }
    
    const isCorrect = userGuess === correctRange;
    const pointsEarned = isCorrect ? 10 : 0;
    
    // Record the play
    const playRef = doc(collection(db, 'gamePlays'));
    await setDoc(playRef, {
      gameId,
      playerId: userId,
      playerName: userName,
      guess: userGuess,
      isCorrect,
      playedAt: serverTimestamp()
    });
    
    // Update game play count
    await updateDoc(gameRef, {
      playCount: increment(1)
    });
    
    // Update user stats
    const userRef = doc(db, 'users', userId);
    const updates: any = {
      gamesPlayed: increment(1)
    };
    
    if (isCorrect) {
      updates.score = increment(10);
    }
    
    await updateDoc(userRef, updates);
    
    return { isCorrect, actualCount, pointsEarned };
  } catch (error) {
    console.error('Error verifying answer:', error);
    throw new Error('Failed to verify answer');
  }
};
