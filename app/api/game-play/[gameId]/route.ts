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

    if (!gameId || !userId) {
      return NextResponse.json(
        { error: 'Game ID and User ID are required' },
        { status: 400 }
      )
    }

    const gamePlayId = `${gameId}_${userId}`
    const gamePlayRef = adminDb.collection('gamePlays').doc(gamePlayId)
    const gamePlaySnap = await gamePlayRef.get()
    
    if (!gamePlaySnap.exists) {
      return NextResponse.json({ gamePlay: null })
    }
    
    return NextResponse.json({ gamePlay: gamePlaySnap.data() })
  } catch (error) {
    console.error('Error fetching game play:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game play' },
      { status: 500 }
    )
  }
}
