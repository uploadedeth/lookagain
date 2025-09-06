'use server'

import { 
  collection,
  doc,
  getDoc,
  runTransaction,
  getCountFromServer,
  increment
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { USER_GAME_QUOTA, APP_GAME_QUOTA } from '../lib/quotas'

export interface QuotaStatus {
  used: number
  limit: number
  remaining: number
}

interface QuotaCheckResult {
  success: boolean
  userQuota?: QuotaStatus
  appQuota?: QuotaStatus
  error?: string
}

export async function checkUserQuota(userId: string): Promise<QuotaStatus> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      return {
        used: 0,
        limit: USER_GAME_QUOTA,
        remaining: USER_GAME_QUOTA
      }
    }
    
    const userData = userSnap.data()
    const used = userData.gamesCreated || 0
    
    return {
      used,
      limit: USER_GAME_QUOTA,
      remaining: Math.max(0, USER_GAME_QUOTA - used)
    }
  } catch (error) {
    console.error('Error checking user quota:', error)
    throw error
  }
}

export async function checkAppQuota(): Promise<QuotaStatus> {
  try {
    const gameRoundsRef = collection(db, 'gameRounds')
    const snapshot = await getCountFromServer(gameRoundsRef)
    const used = snapshot.data().count
    
    return {
      used,
      limit: APP_GAME_QUOTA,
      remaining: Math.max(0, APP_GAME_QUOTA - used)
    }
  } catch (error) {
    console.error('Error checking app quota:', error)
    throw error
  }
}

export async function verifyAndConsumeQuota(userId: string): Promise<QuotaCheckResult> {
  try {
    // First, check app-wide quota
    console.log('Checking app-wide quota...')
    const appQuota = await checkAppQuota()
    console.log('App quota:', appQuota.used, '/', appQuota.limit)
    
    if (appQuota.remaining <= 0) {
      return {
        success: false,
        appQuota,
        error: 'Application has reached its game creation limit. Please try again later.'
      }
    }
    
    // Then perform user quota check and increment in a transaction
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId)
      const userDoc = await transaction.get(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }
      
      const userData = userDoc.data()
      const currentGamesCreated = userData.gamesCreated || 0
      
      // Check user quota
      if (currentGamesCreated >= USER_GAME_QUOTA) {
        return {
          success: false,
          userQuota: {
            used: currentGamesCreated,
            limit: USER_GAME_QUOTA,
            remaining: 0
          },
          error: `You have reached your game creation limit (${USER_GAME_QUOTA} games).`
        }
      }
      
      // Increment user's game count
      transaction.update(userRef, {
        gamesCreated: increment(1)
      })
      
      return {
        success: true,
        userQuota: {
          used: currentGamesCreated + 1,
          limit: USER_GAME_QUOTA,
          remaining: USER_GAME_QUOTA - (currentGamesCreated + 1)
        },
        appQuota
      }
    })
    
    return result
  } catch (error) {
    console.error('Error verifying quota:', error)
    return {
      success: false,
      error: 'Failed to verify quota. Please try again.'
    }
  }
}
