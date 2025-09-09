'use server'

import { NextResponse } from 'next/server'
import { adminDb } from '../../lib/firebase-admin'
import { APP_GAME_QUOTA } from '../../lib/quotas'

export async function GET() {
  try {
    // Get the count of all game rounds using Firebase Admin SDK
    const gameRoundsRef = adminDb.collection('gameRounds')
    const snapshot = await gameRoundsRef.count().get()
    const used = snapshot.data().count
    
    const quotaStatus = {
      used,
      limit: APP_GAME_QUOTA,
      remaining: Math.max(0, APP_GAME_QUOTA - used)
    }
    
    return NextResponse.json({
      success: true,
      appQuota: quotaStatus
    })
  } catch (error) {
    console.error('Error checking app quota:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check app quota. Please try again.' 
      },
      { status: 500 }
    )
  }
}
