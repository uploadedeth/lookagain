import type { Metadata } from 'next'
import { AuthProvider } from './components/AuthProvider'
import Header from './components/Header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Look Again - AI Spot the Difference Game',
  description: 'Create and play AI-generated spot-the-difference puzzles',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="min-h-screen bg-[#1c1c1d]">
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow w-full max-w-[1600px] mx-auto p-2 sm:p-4 md:p-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}