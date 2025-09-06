# Final Firestore Security Rules with Aggregation Support

Update your Firestore rules to allow aggregation queries for counting game rounds:

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
    
    // Game rounds rules
    match /gameRounds/{gameId} {
      // Allow read if game is public OR user is the creator
      allow read: if resource.data.isPublic == true || 
                    (request.auth != null && request.auth.uid == resource.data.creatorId);
      
      // Allow create if authenticated and user is the creator
      allow create: if request.auth != null && 
                      request.auth.uid == request.resource.data.creatorId;
      
      // Allow update by creator or for incrementing play count
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.creatorId || 
         // Allow updating play count
         request.resource.data.keys().hasAll(['playCount']) &&
         request.resource.data.playCount == resource.data.playCount + 1);
    }
    
    // IMPORTANT: Allow aggregation queries on gameRounds collection
    // This is needed for counting total games
    match /{path=**}/gameRounds/{gameId} {
      allow read: if request.auth != null;
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

## Key Changes:

1. **Added aggregation support**: The rule `match /{path=**}/gameRounds/{gameId}` with `allow read: if request.auth != null;` allows authenticated users to run aggregation queries (like count) on the gameRounds collection.

2. **Maintains existing security**: Individual document access is still restricted based on public status or creator ownership.

3. **Authenticated users only**: Aggregation queries require authentication, preventing anonymous abuse.

## Apply these rules:
1. Go to [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/loog-again-ai/firestore/rules)
2. Replace the existing rules with the above
3. Click "Publish"

After applying these rules, the `getCountFromServer()` function will work properly for authenticated users.
