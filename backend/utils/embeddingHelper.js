import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Create a helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateEmbedding = async (text, maxRetries = 3) => {
  // GUARD CLAUSE: If text is empty or just spaces, do not call Google API
  if (!text || !text.trim()) {
    console.warn("Skipping embedding generation: Provided text is empty.");
    return []; // Return an empty array or handle as skipped
  }
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

  // 2. Wrap the API call in a retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      // 3. Only retry if it's a server error (503) or rate limit (429)
      if (error.status === 503 || error.status === 429) {
        if (attempt === maxRetries) {
          console.error(
            `Gemini API permanently failed after ${maxRetries} attempts.`,
          );
          throw error;
        }

        // 4. Calculate the backoff delay: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `[Attempt ${attempt} failed] Google API overloaded. Retrying in ${delay / 1000}s...`,
        );

        await sleep(delay); // Pause the loop before trying again
      } else {
        // If it's a 400 (Bad Request) or 404 (Not Found), retrying won't fix it.
        throw error;
      }
    }
  }
};
