'use server'

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
import { db } from '../lib/firebase'

interface GameRound {
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

interface GamePlay {
  gameId: string
  playerId: string
  playerName: string
  score: number
  selectedAnswer: number
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

export async function verifyAnswerAndRecordPlay(
  gameId: string,
  userId: string,
  userName: string,
  selectedAnswer: number
): Promise<{
  isCorrect: boolean
  correctAnswer: number
  score: number
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
      const correctAnswer = gameData.differences.length
      const isCorrect = selectedAnswer === correctAnswer
      const score = isCorrect ? 10 : 0
      
      // Create game play record
      const gamePlayId = `${gameId}_${userId}`
      const gamePlayRef = doc(db, 'gamePlays', gamePlayId)
      
      const gamePlay: GamePlay = {
        gameId,
        playerId: userId,
        playerName: userName,
        score,
        selectedAnswer,
        correctAnswer,
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
        score: increment(score),
        gamesPlayed: increment(1)
      })
      
      return {
        isCorrect,
        correctAnswer,
        score
      }
    })
    
    return result
  } catch (error) {
    console.error('Error verifying answer:', error)
    throw new Error('Failed to verify answer')
  }
}
