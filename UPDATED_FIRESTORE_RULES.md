# Updated Firestore Security Rules

Replace your current Firestore rules with these updated rules that support the new features:

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
    
    // Public game rounds are readable by everyone
    // Only creators can write to their own games
    match /gameRounds/{gameId} {
      allow read: if resource.data.isPublic == true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.creatorId;
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
  }
}
```

## Important Changes:

1. **Users collection**: Now allows public read access so the leaderboard can display all users' scores
2. **GameRounds**: Allows incrementing the playCount field by any authenticated user
3. **GamePlays**: Ensures users can only create plays for themselves

## Apply these rules:
1. Go to [Firestore Rules](https://console.firebase.google.com/project/loog-again-ai/firestore/rules)
2. Replace the existing rules with the above
3. Click "Publish"
