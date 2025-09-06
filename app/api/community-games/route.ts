'use server'

import { NextResponse } from 'next/server'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export async function GET() {
  try {
    const gamesQuery = query(
      collection(db, 'gameRounds'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(12)
    )
    
    const snapshot = await getDocs(gamesQuery)
    const games: any[] = []
    
    snapshot.forEach(doc => {
      const data = doc.data()
      // Server-side filtering - exclude sensitive fields
      const safeGameData = {
        id: doc.id,
        creatorId: data.creatorId,
        creatorName: data.creatorName,
        prompt: data.prompt,
        originalImageUrl: data.originalImageUrl,
        modifiedImageUrl: data.modifiedImageUrl,
        createdAt: data.createdAt,
        playCount: data.playCount,
        isPublic: data.isPublic
        // Explicitly NOT including: differences, difficultyRange
      }
      games.push(safeGameData)
    })
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching community games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community games' },
      { status: 500 }
    )
  }
}
