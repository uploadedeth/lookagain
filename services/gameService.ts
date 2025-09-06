import { 
  collection,
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { 
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { verifyAndConsumeQuota } from './quotaService';

interface GameRound {
  id?: string;
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

// Helper to convert data URL to Blob
const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Upload image to Firebase Storage
const uploadImage = async (
  dataUrl: string,
  path: string
): Promise<string> => {
  try {
    const blob = dataURLtoBlob(dataUrl);
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

// Create a new game round
export const createGameRound = async (
  userId: string,
  userName: string,
  prompt: string,
  originalImageDataUrl: string,
  modifiedImageDataUrl: string,
  differences: string[],
  isPublic: boolean = true
): Promise<string> => {
  try {
    // First, verify quota before any operations
    console.log('Checking quota for user:', userId);
    const quotaResult = await verifyAndConsumeQuota(userId);
    
    if (!quotaResult.success) {
      throw new Error(quotaResult.error || 'Quota check failed');
    }
    
    console.log('Quota verified. User games:', quotaResult.userQuota?.used, '/', quotaResult.userQuota?.limit);
    
    // Create a new document reference to get the ID
    const gameRef = doc(collection(db, 'gameRounds'));
    const gameId = gameRef.id;

    // Upload images to storage
    console.log('Uploading images to storage...');
    const originalImageUrl = await uploadImage(
      originalImageDataUrl,
      `games/${userId}/${gameId}/original.png`
    );
    const modifiedImageUrl = await uploadImage(
      modifiedImageDataUrl,
      `games/${userId}/${gameId}/modified.png`
    );

    // Determine difficulty range
    const diffCount = differences.length;
    let difficultyRange = '3-5';
    if (diffCount >= 6 && diffCount <= 8) {
      difficultyRange = '6-8';
    } else if (diffCount >= 9) {
      difficultyRange = '9+';
    }

    // Create game round document
    const gameRound: GameRound = {
      creatorId: userId,
      creatorName: userName,
      prompt,
      originalImageUrl,
      modifiedImageUrl,
      differences,
      difficultyRange,
      createdAt: serverTimestamp(),
      playCount: 0,
      isPublic
    };

    console.log('Saving game round to Firestore...');
    await setDoc(gameRef, gameRound);

    // Note: User's gamesCreated count is already updated by verifyAndConsumeQuota

    console.log('Game round created successfully:', gameId);
    return gameId;
  } catch (error) {
    console.error('Error creating game round:', error);
    throw new Error('Failed to create game round');
  }
};

// Record a game play
export const recordGamePlay = async (
  gameId: string,
  playerId: string,
  playerName: string,
  guess: string,
  isCorrect: boolean
): Promise<void> => {
  try {
    // Create play record
    const playRef = doc(collection(db, 'gamePlays'));
    await setDoc(playRef, {
      gameId,
      playerId,
      playerName,
      guess,
      isCorrect,
      playedAt: serverTimestamp()
    });

    // Update game play count
    const gameRef = doc(db, 'gameRounds', gameId);
    await updateDoc(gameRef, {
      playCount: increment(1)
    });

    // Update player's game played count
    const userRef = doc(db, 'users', playerId);
    await updateDoc(userRef, {
      gamesPlayed: increment(1)
    });
  } catch (error) {
    console.error('Error recording game play:', error);
    throw new Error('Failed to record game play');
  }
};
