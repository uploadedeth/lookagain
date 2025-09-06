'use server'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '../../lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get public games the user hasn't created
    const publicGamesSnapshot = await adminDb.collection('gameRounds')
      .where('isPublic', '==', true)
      .where('creatorId', '!=', userId)
      .get()
    
    if (publicGamesSnapshot.empty) {
      return NextResponse.json(
        { error: 'No games available' },
        { status: 404 }
      )
    }
    
    // Get games the user has already played
    const userPlaysSnapshot = await adminDb.collection('gamePlays')
      .where('playerId', '==', userId)
      .get()
    
    const playedGameIds = new Set(userPlaysSnapshot.docs.map(doc => doc.data().gameId))
    
    // Filter out games the user has already played
    const unplayedGames = publicGamesSnapshot.docs.filter(doc => !playedGameIds.has(doc.id))
    
    if (unplayedGames.length === 0) {
      return NextResponse.json(
        { error: 'No unplayed games available' },
        { status: 404 }
      )
    }
    
    // Select a random unplayed game
    const randomIndex = Math.floor(Math.random() * unplayedGames.length)
    const selectedGame = unplayedGames[randomIndex]
    const gameData = selectedGame.data()
    
    // Return only safe game data - exclude sensitive fields
    const safeGameData = {
      id: selectedGame.id,
      creatorId: gameData.creatorId,
      creatorName: gameData.creatorName,
      prompt: gameData.prompt,
      originalImageUrl: gameData.originalImageUrl,
      modifiedImageUrl: gameData.modifiedImageUrl,
      createdAt: gameData.createdAt,
      playCount: gameData.playCount,
      isPublic: gameData.isPublic
      // Explicitly NOT including: differences, difficultyRange
    }
    
    return NextResponse.json(safeGameData)
  } catch (error) {
    console.error('Error fetching random game:', error)
    return NextResponse.json(
      { error: 'Failed to fetch random game' },
      { status: 500 }
    )
  }
}
