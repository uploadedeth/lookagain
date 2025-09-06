/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

"use server";

import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

// Helper to convert a data URL to a Gemini API Part
const imageToPart = (imageDataUrl: string) => {
    const arr = imageDataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string
): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

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

const generateInitialImage = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
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
    
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
}

const planDifferences = async (originalPrompt: string, count: number): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
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
        const jsonStr = response.text.trim();
        const differences = JSON.parse(jsonStr);
        if (Array.isArray(differences) && differences.length > 0 && differences.every(d => typeof d === 'string')) {
            return differences;
        }
        throw new Error("Parsed JSON is not a non-empty array of strings.");
    } catch (e) {
        console.error("Failed to parse differences from model response:", response.text, e);
        throw new Error("The AI failed to generate a valid list of differences. Please try a different prompt.");
    }
}

const generateModifiedImage = async (
    originalImageDataUrl: string,
    differences: string[]
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = imageToPart(originalImageDataUrl);
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
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    return handleApiResponse(response, 'modification');
};

/**
 * Main server action to generate the entire game in one call.
 */
export async function generateGame(prompt: string, numDifferences: number): Promise<{
    success: boolean;
    originalImage?: string;
    modifiedImage?: string;
    differences?: string[];
    error?: string;
}> {
    try {
        const initialImageUrl = await generateInitialImage(prompt);
        const plannedDifferences = await planDifferences(prompt, numDifferences);
        const finalModifiedImageUrl = await generateModifiedImage(initialImageUrl, plannedDifferences);

        return {
            success: true,
            originalImage: initialImageUrl,
            modifiedImage: finalModifiedImageUrl,
            differences: plannedDifferences,
        };
    } catch (error) {
        console.error("Error in generateGame action:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "An unknown server error occurred."
        };
    }
}
