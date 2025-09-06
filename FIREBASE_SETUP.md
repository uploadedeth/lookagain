# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "lookagain-game")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Google" provider:
   - Click on Google
   - Toggle "Enable"
   - Set your project support email
   - Click "Save"

## 3. Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up rules later)
4. Select your preferred location
5. Click "Create"

## 4. Set up Firebase Storage

1. Go to "Storage" in the left sidebar
2. Click "Get started"
3. Accept the default rules for now
4. Select your preferred location
5. Click "Done"

## 5. Get Your Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click on the "</>" (Web) icon
4. Register your app with a nickname (e.g., "lookagain-web")
5. Copy the Firebase configuration object

## 6. Set up Environment Variables

Create a `.env.local` file in your project root and add:

```
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Gemini API Key (already in use)
VITE_GEMINI_API_KEY=your_existing_gemini_api_key
```

## 7. Security Rules

### Firestore Rules
Go to Firestore Database → Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read public game rounds
    match /gameRounds/{gameId} {
      allow read: if resource.data.isPublic == true;
      allow write: if request.auth != null && request.auth.uid == request.resource.data.creatorId;
    }
    
    // Game plays can be created by authenticated users
    match /gamePlays/{playId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
```

### Storage Rules
Go to Storage → Rules and add:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload to their own game folders
    match /games/{userId}/{gameId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == userId;
      allow read: if true; // Public read access for game images
    }
  }
}
```

## 8. Enable Google Sign-In Domain

If you're running locally:
1. Go to Authentication → Settings
2. Under "Authorized domains", add `localhost`

For production, add your actual domain.

## Next Steps for your "loog-again-ai" Firebase Project

### ✅ Configuration Complete
Your Firebase configuration has been added to `.env.local`. 

### ⚠️ Important: Add your Gemini API Key
Edit `.env.local` and replace `your_gemini_api_key_here` with your actual Gemini API key.

### 🔧 Complete Firebase Setup:

1. **Enable Google Authentication**
   - Go to [Firebase Console](https://console.firebase.google.com/project/loog-again-ai/authentication/providers)
   - Click on "Google" provider
   - Toggle "Enable"
   - Add your support email
   - Save

2. **Create Firestore Database**
   - Go to [Firestore](https://console.firebase.google.com/project/loog-again-ai/firestore)
   - Click "Create database"
   - Choose your region
   - Start in production mode
   - Apply the security rules from section 7 above

3. **Enable Storage**
   - Go to [Storage](https://console.firebase.google.com/project/loog-again-ai/storage)
   - Click "Get started"
   - Choose your region
   - Apply the security rules from section 7 above

4. **Add Authorized Domain (for local development)**
   - Go to [Authentication Settings](https://console.firebase.google.com/project/loog-again-ai/authentication/settings)
   - Under "Authorized domains", add `localhost`

### 🚀 Run the App
```bash
npm run dev
```

Then test:
1. Sign in with Google
2. Generate a game
3. Save it to the cloud
4. Check Firebase Console to see your data!
