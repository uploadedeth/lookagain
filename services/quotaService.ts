import { doc, getDoc, runTransaction, increment, collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { QUOTA_CONFIG, QuotaStatus } from '../config/quotas';

// Check if user can create a new game (has quota remaining)
export const checkUserQuota = async (userId: string): Promise<QuotaStatus> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();
  
  const gamesCreated = userData?.gamesCreated || 0;
  const limit = QUOTA_CONFIG.USER_GAME_QUOTA;
  
  return {
    used: gamesCreated,
    limit,
    remaining: Math.max(0, limit - gamesCreated),
    percentage: Math.min(100, (gamesCreated / limit) * 100)
  };
};

// Check application-wide quota by counting all game rounds
export const checkAppQuota = async (): Promise<QuotaStatus> => {
  try {
    // Get the count of all game rounds
    const gameRoundsRef = collection(db, 'gameRounds');
    const snapshot = await getCountFromServer(gameRoundsRef);
    const totalGamesCreated = snapshot.data().count;
    
    const limit = QUOTA_CONFIG.APP_GAME_QUOTA;
    
    return {
      used: totalGamesCreated,
      limit,
      remaining: Math.max(0, limit - totalGamesCreated),
      percentage: Math.min(100, (totalGamesCreated / limit) * 100)
    };
  } catch (error) {
    console.error('Error checking app quota:', error);
    // Return a safe default if count fails
    return {
      used: 0,
      limit: QUOTA_CONFIG.APP_GAME_QUOTA,
      remaining: QUOTA_CONFIG.APP_GAME_QUOTA,
      percentage: 0
    };
  }
};

// Verify quota and increment counters atomically
export const verifyAndConsumeQuota = async (userId: string): Promise<{ 
  success: boolean; 
  error?: string;
  userQuota?: QuotaStatus;
  appQuota?: QuotaStatus;
}> => {
  try {
    // Check app-wide quota first (outside transaction)
    const appQuotaStatus = await checkAppQuota();
    const totalGamesCreated = appQuotaStatus.used;
    
    if (totalGamesCreated >= QUOTA_CONFIG.APP_GAME_QUOTA) {
      throw new Error('The application has reached its game creation limit. Please try again later.');
    }
    
    const result = await runTransaction(db, async (transaction) => {
      // Get current user data
      const userRef = doc(db, 'users', userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const userGamesCreated = userData.gamesCreated || 0;
      
      // Check user quota
      if (userGamesCreated >= QUOTA_CONFIG.USER_GAME_QUOTA) {
        throw new Error(`You've reached your limit of ${QUOTA_CONFIG.USER_GAME_QUOTA} games. Contact us to increase your quota.`);
      }
      
      // If all checks pass, increment user counter only
      transaction.update(userRef, {
        gamesCreated: increment(1)
      });
      
      return {
        userGamesCreated: userGamesCreated + 1,
        appGamesCreated: totalGamesCreated + 1
      };
    });
    
    return {
      success: true,
      userQuota: {
        used: result.userGamesCreated,
        limit: QUOTA_CONFIG.USER_GAME_QUOTA,
        remaining: Math.max(0, QUOTA_CONFIG.USER_GAME_QUOTA - result.userGamesCreated),
        percentage: Math.min(100, (result.userGamesCreated / QUOTA_CONFIG.USER_GAME_QUOTA) * 100)
      },
      appQuota: {
        used: result.appGamesCreated,
        limit: QUOTA_CONFIG.APP_GAME_QUOTA,
        remaining: Math.max(0, QUOTA_CONFIG.APP_GAME_QUOTA - result.appGamesCreated),
        percentage: Math.min(100, (result.appGamesCreated / QUOTA_CONFIG.APP_GAME_QUOTA) * 100)
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify quota'
    };
  }
};

// Initialize app stats document if it doesn't exist
export const initializeAppStats = async () => {
  // Skip app stats initialization for now
  // This would require admin SDK or cloud functions to properly manage
  return;
};
