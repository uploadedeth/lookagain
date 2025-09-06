'use client'

import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { db } from './firebase'

export interface GameRound {
  id: string
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

export interface GamePlay {
  gameId: string
  playerId: string
  playerName: string
  score: number
  selectedAnswer: string
  correctAnswer: number
  isCorrect: boolean
  playedAt: any
}

export async function getRandomUnplayedGame(userId: string): Promise<GameRound | null> {
  try {
    // Get public games the user hasn't created
    const gameRoundsRef = collection(db, 'gameRounds')
    const publicGamesQuery = query(
      gameRoundsRef,
      where('isPublic', '==', true),
      where('creatorId', '!=', userId)
    )
    
    const gamesSnapshot = await getDocs(publicGamesQuery)
    
    if (gamesSnapshot.empty) {
      console.log('No public games found')
      return null
    }
    
    // Get games the user has already played
    const gamePlaysRef = collection(db, 'gamePlays')
    const userPlaysQuery = query(
      gamePlaysRef,
      where('playerId', '==', userId)
    )
    
    const playsSnapshot = await getDocs(userPlaysQuery)
    const playedGameIds = new Set(playsSnapshot.docs.map(doc => doc.data().gameId))
    
    // Filter out games the user has already played
    const unplayedGames = gamesSnapshot.docs.filter(doc => !playedGameIds.has(doc.id))
    
    if (unplayedGames.length === 0) {
      console.log('No unplayed games found')
      return null
    }
    
    // Select a random unplayed game
    const randomIndex = Math.floor(Math.random() * unplayedGames.length)
    const selectedGame = unplayedGames[randomIndex]
    
    return {
      id: selectedGame.id,
      ...selectedGame.data()
    } as GameRound
  } catch (error) {
    console.error('Error fetching unplayed games:', error)
    throw new Error('Failed to fetch games')
  }
}

export async function getSpecificGame(gameId: string, userId: string): Promise<GameRound | null> {
  try {
    const gameRef = doc(db, 'gameRounds', gameId)
    const gameSnap = await getDoc(gameRef)
    
    if (!gameSnap.exists()) {
      return null
    }
    
    const gameData = gameSnap.data()
    
    // Check if game is public and user is not the creator
    if (!gameData.isPublic || gameData.creatorId === userId) {
      return null
    }
    
    return {
      id: gameSnap.id,
      ...gameData
    } as GameRound
  } catch (error) {
    console.error('Error fetching specific game:', error)
    throw new Error('Failed to fetch game')
  }
}

export async function getUserGamePlay(gameId: string, userId: string): Promise<GamePlay | null> {
  try {
    const gamePlayId = `${gameId}_${userId}`
    const gamePlayRef = doc(db, 'gamePlays', gamePlayId)
    const gamePlaySnap = await getDoc(gamePlayRef)
    
    if (!gamePlaySnap.exists()) {
      return null
    }
    
    return gamePlaySnap.data() as GamePlay
  } catch (error) {
    // If the document doesn't exist or there are permission issues, 
    // it likely means the user hasn't played this game yet
    console.log('Game play record not found (user likely hasn\'t played this game):', error)
    return null
  }
}

export async function verifyAnswerAndRecordPlay(
  gameId: string,
  userId: string,
  userName: string,
  selectedAnswer: string
): Promise<{
  isCorrect: boolean
  actualCount: number
  pointsEarned: number
}> {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Get the game round to verify the answer
      const gameRef = doc(db, 'gameRounds', gameId)
      const gameSnap = await transaction.get(gameRef)
      
      if (!gameSnap.exists()) {
        throw new Error('Game not found')
      }
      
      const gameData = gameSnap.data()
      const actualCount = gameData.differences.length
      
      // Convert selected answer to numeric range for comparison
      const getAnswerRange = (answer: string) => {
        if (answer === '3-5 differences') return { min: 3, max: 5 }
        if (answer === '6-8 differences') return { min: 6, max: 8 }
        if (answer === '9+ differences') return { min: 9, max: Infinity }
        return { min: 0, max: 0 }
      }
      
      const answerRange = getAnswerRange(selectedAnswer)
      const isCorrect = actualCount >= answerRange.min && actualCount <= answerRange.max
      const pointsEarned = isCorrect ? 10 : 0
      
      // Create game play record
      const gamePlayId = `${gameId}_${userId}`
      const gamePlayRef = doc(db, 'gamePlays', gamePlayId)
      
      const gamePlay: GamePlay = {
        gameId,
        playerId: userId,
        playerName: userName,
        score: pointsEarned,
        selectedAnswer,
        correctAnswer: actualCount,
        isCorrect,
        playedAt: serverTimestamp()
      }
      
      transaction.set(gamePlayRef, gamePlay)
      
      // Update game play count
      transaction.update(gameRef, {
        playCount: increment(1)
      })
      
      // Update user's score and games played
      const userRef = doc(db, 'users', userId)
      transaction.update(userRef, {
        score: increment(pointsEarned),
        gamesPlayed: increment(1)
      })
      
      return {
        isCorrect,
        actualCount,
        pointsEarned
      }
    })
    
    return result
  } catch (error) {
    console.error('Error verifying answer:', error)
    throw new Error('Failed to verify answer')
  }
}
