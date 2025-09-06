# Look Again

An AI-powered spot-the-difference game where users can create and play custom puzzles generated using Google's Gemini AI.

## Features

- 🎨 **AI-Generated Puzzles**: Create unique spot-the-difference games using AI
- 🎮 **Community Games**: Play puzzles created by other users
- 🏆 **Leaderboard**: Compete for the top score
- 👤 **User Profiles**: Track your stats and created puzzles
- 🎯 **Quota System**: Fair usage limits per user
- 🔐 **Google Authentication**: Secure sign-in with Google

## Tech Stack

- **Frontend**: Next.js + TypeScript (App Router)
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **AI**: Google Gemini API
- **Icons**: Google Material Symbols

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Firebase project
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lookagain.git
cd lookagain
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your configuration:
```env
# Public environment variables (exposed to client)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Server-side only environment variables
GEMINI_API_KEY=your_gemini_api_key
APP_GAME_QUOTA=1000
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Firebase Setup

1. Create a Firebase project
2. Enable Authentication (Google provider)
3. Create a Firestore database
4. Enable Storage
5. Add your domain to authorized domains in Authentication settings

## Game Rules

- Players guess the number of differences between two AI-generated images
- Correct guesses earn 10 points
- Each user can create up to 5 games (configurable)
- All games are public and can be played by anyone

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)