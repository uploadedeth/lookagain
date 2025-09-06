# Updated Firestore Security Rules for Profile Page

The current rules don't allow users to read their own game rounds. Update your Firestore rules with these changes:

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

## Key Change:
The important change is in the `gameRounds` read rule:
```javascript
allow read: if resource.data.isPublic == true || 
              (request.auth != null && request.auth.uid == resource.data.creatorId);
```

This allows:
1. Anyone to read public game rounds
2. The creator to read their own game rounds (even if not public)

## Apply these rules:
1. Go to [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/loog-again-ai/firestore/rules)
2. Replace the existing rules with the above
3. Click "Publish"

This will fix the "Missing or insufficient permissions" error when viewing your puzzles on the profile page.
