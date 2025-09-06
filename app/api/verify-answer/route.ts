'use server'

import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '../../lib/firebase-admin'

interface GamePlay {
  gameId: string
  playerId: string
  playerName: string
  score: number
  selectedAnswer: string
  correctAnswer: number
  isCorrect: boolean
  playedAt: any
}

export async function POST(request: NextRequest) {
  try {
    const { gameId, userId, userName, selectedAnswer } = await request.json()

    if (!gameId || !userId || !userName || !selectedAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      // Get the game round to verify the answer
      const gameRef = adminDb.collection('gameRounds').doc(gameId)
      const gameSnap = await transaction.get(gameRef)
      
      if (!gameSnap.exists) {
        throw new Error('Game not found')
      }
      
      const gameData = gameSnap.data()!
      
      // Check if game is public and user is not the creator
      if (!gameData.isPublic || gameData.creatorId === userId) {
        throw new Error('Cannot play this game')
      }
      
      // Check if user has already played this game
      const gamePlayId = `${gameId}_${userId}`
      const gamePlayRef = adminDb.collection('gamePlays').doc(gamePlayId)
      const existingPlaySnap = await transaction.get(gamePlayRef)
      
      if (existingPlaySnap.exists) {
        throw new Error('Game already played')
      }
      
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
      const gamePlay: GamePlay = {
        gameId,
        playerId: userId,
        playerName: userName,
        score: pointsEarned,
        selectedAnswer,
        correctAnswer: actualCount,
        isCorrect,
        playedAt: FieldValue.serverTimestamp()
      }
      
      transaction.set(gamePlayRef, gamePlay)
      
      // Update game play count
      transaction.update(gameRef, {
        playCount: FieldValue.increment(1)
      })
      
      // Update user's score and games played
      const userRef = adminDb.collection('users').doc(userId)
      transaction.update(userRef, {
        score: FieldValue.increment(pointsEarned),
        gamesPlayed: FieldValue.increment(1)
      })
      
      return {
        isCorrect,
        actualCount,
        pointsEarned
      }
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error verifying answer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify answer' },
      { status: 500 }
    )
  }
}
