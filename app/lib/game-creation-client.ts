'use client'

import { 
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction,
  getCountFromServer
} from 'firebase/firestore'
import { 
  ref,
  uploadString,
  getDownloadURL
} from 'firebase/storage'
import { db, storage } from './firebase'
import { USER_GAME_QUOTA, APP_GAME_QUOTA } from './quotas'

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

interface GameRound {
  id?: string
  creatorId: string
  creatorName: string
  prompt: string
  originalImageUrl: string
  modifiedImageUrl: string
  differences: string[]
  difficultyRange: string
  createdAt: any
  playCount: number
  isPublic: boolean
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

// Check only app-wide quota for unauthenticated users via API
export async function checkAppQuotaOnly(): Promise<QuotaCheckResult> {
  try {
    console.log('Checking app-wide quota via API...')
    const response = await fetch('/api/check-app-quota')
    
    if (!response.ok) {
      throw new Error('Failed to fetch app quota')
    }
    
    const data = await response.json()
    
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to check app quota'
      }
    }
    
    console.log('App quota:', data.appQuota.used, '/', data.appQuota.limit)
    
    if (data.appQuota.remaining <= 0) {
      return {
        success: false,
        appQuota: data.appQuota,
        error: 'Application has reached its game creation limit. Please try again later.'
      }
    }
    
    return {
      success: true,
      appQuota: data.appQuota
    }
  } catch (error) {
    console.error('Error checking app quota:', error)
    return {
      success: false,
      error: 'Failed to verify quota. Please try again.'
    }
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

export async function createGameRound(
  userId: string,
  userName: string,
  prompt: string,
  originalImageDataUrl: string,
  modifiedImageDataUrl: string,
  differences: string[],
  isPublic: boolean = true
): Promise<string> {
  try {
    // First, verify quota
    console.log('Checking quota for user:', userId)
    const quotaResult = await verifyAndConsumeQuota(userId)
    
    if (!quotaResult.success) {
      throw new Error(quotaResult.error || 'Quota check failed')
    }
    
    console.log('Quota verified. User games:', quotaResult.userQuota?.used, '/', quotaResult.userQuota?.limit)
    
    // Create a new document reference to get the ID
    const gameRef = doc(collection(db, 'gameRounds'))
    const gameId = gameRef.id

    // Upload images to storage
    console.log('Uploading images to storage...')
    const originalRef = ref(storage, `games/${userId}/${gameId}/original.png`)
    const modifiedRef = ref(storage, `games/${userId}/${gameId}/modified.png`)
    
    const [originalSnapshot, modifiedSnapshot] = await Promise.all([
      uploadString(originalRef, originalImageDataUrl, 'data_url'),
      uploadString(modifiedRef, modifiedImageDataUrl, 'data_url')
    ])
    
    const [originalImageUrl, modifiedImageUrl] = await Promise.all([
      getDownloadURL(originalSnapshot.ref),
      getDownloadURL(modifiedSnapshot.ref)
    ])

    // Determine difficulty range
    const diffCount = differences.length
    let difficultyRange = '3-5'
    if (diffCount >= 6 && diffCount <= 8) {
      difficultyRange = '6-8'
    } else if (diffCount >= 9) {
      difficultyRange = '9+'
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
    }

    console.log('Saving game round to Firestore...')
    await setDoc(gameRef, gameRound)

    console.log('Game round created successfully:', gameId)
    return gameId
  } catch (error) {
    console.error('Error creating game round:', error)
    throw error
  }
}
