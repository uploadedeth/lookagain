'use server'

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Import Modality for use in image editing requests.
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Helper function to convert base64 string to File-like format for server-side
const base64ToFilePart = (base64: string): { inlineData: { mimeType: string; data: string; } } => {
    // Extract base64 data from data URL if needed
    const base64Data = base64.includes('base64,') 
        ? base64.split('base64,')[1] 
        : base64;
    
    return { inlineData: { mimeType: 'image/png', data: base64Data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Validates that the API key is available
 */
const validateApiKey = (): string => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('API key not found. Please set GEMINI_API_KEY in your environment variables. Get your API key from: https://aistudio.google.com/app/apikey');
    }
    return apiKey;
};

/**
 * Generates the initial scene image from a text prompt.
 */
export async function generateInitialImage(prompt: string): Promise<string> {
    try {
        const apiKey = validateApiKey();
        const ai = new GoogleGenAI({ apiKey });
        console.log(`Generating initial image with prompt: ${prompt}`);
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Photorealistic, high-detail image of: ${prompt}. Cinematic lighting, vibrant colors.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error('Image generation failed to produce an image.');
        }
        
        const firstImage = response.generatedImages[0];
        if (!firstImage?.image?.imageBytes) {
            throw new Error('Generated image data is missing or invalid.');
        }
        
        const base64ImageBytes: string = firstImage.image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error('Error in generateInitialImage:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                throw error; // Re-throw API key errors as-is
            }
            if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('API quota exceeded. Please check your Gemini API usage limits and try again later.');
            }
        }
        
        throw new Error(`Failed to generate initial image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates a list of differences for the game.
 */
export async function planDifferences(originalPrompt: string, count: number): Promise<string[]> {
    try {
        const apiKey = validateApiKey();
        const ai = new GoogleGenAI({ apiKey });
        console.log(`Planning ${count} differences for prompt: ${originalPrompt}`);
        
        const prompt = `You are a creative game designer for a "spot the difference" game.
        Based on the user's requested scene, "${originalPrompt}", come up with exactly ${count} subtle but findable differences.
        The differences should be a mix of: removing an object, adding a plausible object, changing an object's color or style, or moving an object slightly.
        Describe each difference as a concise, imperative instruction for an AI photo editor.
        
        Example for scene "a cat sleeping on a bookshelf":
        [
            "Remove the book with the red cover.",
            "Add a small potted cactus to the top shelf.",
            "Change the cat's collar color to blue.",
            "Make the window in the background slightly larger.",
            "Remove one of the cat's whiskers."
        ]

        Return ONLY a valid JSON array of ${count} strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        try {
            const responseText = response.text;
            if (!responseText) {
                throw new Error('Empty response from AI model.');
            }
            const jsonStr = responseText.trim();
            const differences = JSON.parse(jsonStr);
            if (Array.isArray(differences) && differences.length > 0 && differences.every(d => typeof d === 'string')) {
                console.log('Successfully planned differences:', differences);
                return differences;
            }
            throw new Error("Parsed JSON is not a non-empty array of strings.");
        } catch (e) {
            console.error("Failed to parse differences from model response:", response.text, e);
            throw new Error("The AI failed to generate a valid list of differences. Please try a different prompt.");
        }
    } catch (error) {
        console.error('Error in planDifferences:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                throw error; // Re-throw API key errors as-is
            }
            if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('API quota exceeded. Please check your Gemini API usage limits and try again later.');
            }
        }
        
        throw new Error(`Failed to plan differences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generates the modified image by applying a list of text-based differences.
 */
export async function generateModifiedImage(
    originalImageBase64: string,
    differences: string[]
): Promise<string> {
    try {
        const apiKey = validateApiKey();
        const ai = new GoogleGenAI({ apiKey });
        console.log('Generating modified image with differences:', differences);
        
        const originalImagePart = base64ToFilePart(originalImageBase64);
        const instructionPrompt = differences.map(d => `- ${d}`).join('\n');

        const prompt = `You are an expert, subtle photo editor.
Your task is to edit the provided image according to a precise list of instructions to create a "spot the difference" game.

There are exactly ${differences.length} instructions. You must apply all of them, and only them.

Editing Instructions:
${instructionPrompt}

Editing Guidelines:
- Apply ONLY the changes listed above. Do not add, remove, or alter anything else.
- The edits must be photorealistic and blend seamlessly into the image.
- Most importantly, the rest of the image (outside the immediate edit areas) must remain IDENTICAL to the original. This is critical for the game to work.

Output: Return ONLY the final edited image. Do not return any text.`;

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [originalImagePart, textPart] },
            // FIX: Added required `responseModalities` config for the image editing model.
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
    
        console.log('Received response from model for modification.', response);
        return handleApiResponse(response, 'modification');
    } catch (error) {
        console.error('Error in generateModifiedImage:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('API key')) {
                throw error; // Re-throw API key errors as-is
            }
            if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('API quota exceeded. Please check your Gemini API usage limits and try again later.');
            }
            if (error.message.includes('INTERNAL')) {
                throw new Error('Gemini API internal error. This is usually temporary - please try again in a few moments.');
            }
            if (error.message.includes('PERMISSION_DENIED')) {
                throw new Error('API permission denied. Please check that your API key has the necessary permissions for image generation.');
            }
        }
        
        // Generic error fallback
        throw new Error(`Failed to generate modified image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
