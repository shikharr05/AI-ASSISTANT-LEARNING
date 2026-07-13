import dotenv from "dotenv";
dotenv.config();
import fs from "fs/promises";
// Import pdfjs-dist to parse the page count locally
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// Initialize the clients using your existing API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// Helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract text and page count from PDF using Gemini and pdfjs-dist
 * @param {string} filePath - Local path to the uploaded PDF file
 * @returns {Promise<{text: string, numPages: number}>}
 */
export const extractTextFromPDF = async (filePath) => {
  let uploadedFile = null;

  try {
    // 1. Read file buffer to get page count locally using pdfjs-dist
    const dataBuffer = await fs.readFile(filePath);
    const rawData = new Uint8Array(dataBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: rawData });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    console.log(`Detected page count locally: ${numPages}`);
    console.log("Uploading document to Gemini File API...");

    // 2. Setup Retry Variables
    const maxRetries = 3;
    let extractedText = "";

    // 3. The Exponential Backoff Retry Loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Only upload if it hasn't been successfully uploaded yet
        if (!uploadedFile) {
          const uploadResult = await fileManager.uploadFile(filePath, {
            mimeType: "application/pdf",
            displayName: "User Document",
          });
          uploadedFile = uploadResult.file;
          console.log(`Upload complete! File URI: ${uploadedFile.uri}`);
        }

        // Prompt Gemini 1.5 Flash to extract the text
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });

        const prompt =
          "You are a data extraction assistant. Extract every single word of text from this document perfectly. Preserve the paragraph structure. Do not add any conversational filler, markdown formatting, or introductory text. Just return the raw extracted text.";

        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          },
          { text: prompt },
        ]);

        extractedText = result.response.text();

        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Gemini returned empty text.");
        }

        console.log("Successfully extracted text via Gemini!");
        break; // Break out of the loop because it succeeded!
      } catch (error) {
        // Handle 503 Service Unavailable and 429 Rate Limit errors
        if (error.status === 503 || error.status === 429) {
          if (attempt === maxRetries) {
            console.error(
              `Gemini API permanently failed to extract text after ${maxRetries} attempts.`,
            );
            throw error;
          }
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.warn(
            `[Attempt ${attempt} failed] Gemini overloaded. Retrying in ${delay / 1000}s...`,
          );
          await sleep(delay);
        } else {
          // If it's a completely different error, throw it immediately
          throw error;
        }
      }
    }

    // Return both properties safely
    return {
      text: extractedText,
      numPages: numPages,
    };
  } catch (error) {
    console.error("Gemini PDF parsing error:", error);
    throw new Error("Failed to extract text using Gemini API.");
  } finally {
    // 4. CLEANUP: Always delete the file from Google's servers after extracting the text
    if (uploadedFile) {
      try {
        await fileManager.deleteFile(uploadedFile.name);
        console.log("Cleaned up temporary file from Gemini servers.");
      } catch (cleanupError) {
        console.error("Failed to delete file from Gemini:", cleanupError);
      }
    }
  }
};
