'use server'

import { 
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { 
  ref,
  uploadString,
  getDownloadURL
} from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { verifyAndConsumeQuota } from './quota'

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
