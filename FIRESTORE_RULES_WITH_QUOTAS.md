# Firestore Security Rules with Quota Enforcement

Update your Firestore security rules to include quota enforcement and app stats:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read any user profile (for leaderboard)
    // But can only write to their own profile
    match /users/{userId} {
      allow read: if true; // Public read for leaderboard
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Game rounds are readable by everyone if public
    // OR readable by the creator (for profile page)
    // Only creators can write to their own games
    match /gameRounds/{gameId} {
      allow read: if resource.data.isPublic == true || 
                    (request.auth != null && request.auth.uid == resource.data.creatorId);
      allow create: if request.auth != null && 
                      request.auth.uid == request.resource.data.creatorId;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.creatorId || 
         // Allow updating play count
         request.resource.data.keys().hasAll(['playCount']) &&
         request.resource.data.playCount == resource.data.playCount + 1);
    }
    
    // Game plays can be created by authenticated users
    // Users can read their own plays
    match /gamePlays/{playId} {
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.playerId;
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.playerId || 
         request.auth.uid == resource.data.creatorId);
    }
    
    // App stats document for tracking global metrics
    match /appStats/{statId} {
      allow read: if true; // Anyone can read app stats
      allow write: if false; // Only server-side functions should write (handled by transactions)
      // Note: Transactions bypass security rules, so quota enforcement happens in the service
    }
  }
}
```

## Important Notes:

1. **Quota Enforcement**: The actual quota checking is done in the `quotaService.ts` using Firestore transactions. This ensures atomic updates and prevents race conditions.

2. **App Stats**: The `appStats/global` document tracks application-wide metrics. While rules show `allow write: if false`, the transactional updates in the quota service will still work.

3. **Security**: All quota validation happens server-side before any game creation, preventing users from bypassing quotas by modifying client code.

## Apply these rules:
1. Go to [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/loog-again-ai/firestore/rules)
2. Replace the existing rules with the above
3. Click "Publish"

## Initialize App Stats:
After deploying these rules, the app will automatically initialize the `appStats/global` document when the first game is created.
