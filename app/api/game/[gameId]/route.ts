'use server'

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '../../../lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    const gameRef = adminDb.collection('gameRounds').doc(gameId)
    const gameSnap = await gameRef.get()
    
    if (!gameSnap.exists) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    const gameData = gameSnap.data()!
    
    // Check if game is public and user is not the creator (if userId provided)
    if (!gameData.isPublic || (userId && gameData.creatorId === userId)) {
      return NextResponse.json(
        { error: 'Cannot access this game' },
        { status: 403 }
      )
    }
    
    // Return only safe game data - exclude sensitive fields
    const safeGameData = {
      id: gameSnap.id,
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
    console.error('Error fetching game:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game' },
      { status: 500 }
    )
  }
}
