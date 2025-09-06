'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API (server-side only)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Helper to validate environment
const validateEnvironment = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables')
  }
}

// Convert base64 to Gemini format
const base64ToGeminiPart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType
    }
  }
}

export async function generateInitialImage(prompt: string) {
  validateEnvironment()
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Create a detailed scene based on this description: "${prompt}". 
          Make it visually rich with many distinct objects and details that can be modified later.
          Describe the scene in a way that would help an AI image generator create it.`
        }]
      }]
    })

    const response = await result.response
    const enhancedPrompt = response.text()
    
    // Generate image using Imagen 3
    const imageModel = genAI.getGenerativeModel({ model: 'imagen-3' })
    const imageResult = await imageModel.generateContent([enhancedPrompt])

    const imageResponse = await imageResult.response
    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.[0]
    
    if (!imagePart?.inlineData) {
      throw new Error('No image generated')
    }

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
  } catch (error) {
    console.error('Error generating initial image:', error)
    throw new Error('Failed to generate image')
  }
}

export async function planDifferences(prompt: string, numDifferences: number) {
  validateEnvironment()
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `Given this scene description: "${prompt}"
          
          Generate exactly ${numDifferences} creative and subtle differences that could be made to the scene.
          Make them challenging but fair to spot. Include a mix of:
          - Objects being added or removed
          - Color changes
          - Size or position changes
          - Text or number changes
          - Small detail modifications
          
          Return ONLY a JSON array of strings, each describing one difference clearly and concisely.
          Example: ["A red flower becomes blue", "A window gets an extra pane", "A cat appears on the roof"]`
        }]
      }]
    })

    const response = await result.response
    const text = response.text()
    
    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Invalid response format')
    }
    
    const differences = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(differences) || differences.length !== numDifferences) {
      throw new Error('Invalid differences count')
    }
    
    return differences
  } catch (error) {
    console.error('Error planning differences:', error)
    throw new Error('Failed to plan differences')
  }
}

export async function generateModifiedImage(originalImageBase64: string, differences: string[]) {
  validateEnvironment()
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
    
    // Extract base64 data from data URL if needed
    const base64Data = originalImageBase64.includes('base64,') 
      ? originalImageBase64.split('base64,')[1] 
      : originalImageBase64
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          base64ToGeminiPart(base64Data, 'image/png'),
          {
            text: `Modify this image to include these exact differences:
            ${differences.map((d, i) => `${i + 1}. ${d}`).join('\n')}
            
            Important:
            - Apply ALL differences listed
            - Keep modifications subtle but visible
            - Maintain the overall style and quality
            - Don't change anything else about the image`
          }
        ]
      }]
    })

    const response = await result.response
    const modifiedImagePart = response.candidates?.[0]?.content?.parts?.[0]
    
    if (!modifiedImagePart?.inlineData) {
      throw new Error('No modified image generated')
    }

    return `data:${modifiedImagePart.inlineData.mimeType};base64,${modifiedImagePart.inlineData.data}`
  } catch (error) {
    console.error('Error generating modified image:', error)
    throw new Error('Failed to generate modified image')
  }
}
