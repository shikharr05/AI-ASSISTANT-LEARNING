import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Ensure the API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error(
    "FATAL ERROR: GEMINI_API_KEY is not set in the environment variables.",
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to pause execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * CORE GENERATION HELPER WITH EXPONENTIAL BACKOFF
 * All exported functions below route their prompts through this centralized function
 * to protect against 503 Service Unavailable and 429 Rate Limit errors.
 */
const generateWithRetry = async (prompt, maxRetries = 5) => {
  // Corrected model name to the valid and fast 1.5-flash
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error.status === 503 || error.status === 429) {
        if (attempt === maxRetries) {
          console.error(
            `Gemini API permanently failed after ${maxRetries} attempts.`,
          );
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[Attempt ${attempt} failed] Google API overloaded. Retrying in ${delay / 1000}s...`,
        );

        await sleep(delay);
      } else {
        // If it's a 400 Bad Request or other parsing error, fail immediately
        throw error;
      }
    }
  }
};

/**
 * Generate flashcards from text
 */
export const generateFlashcards = async (text, count = 10) => {
  const prompt = `Generate exactly ${count} educational flashcards from the following text.
Format each flashcard as:
Q: [Clear, specific question]
A: [Concise, accurate answer]
D: [Difficulty level: easy, medium, or hard]

Separate each flashcard with "---"

Text:
${text.substring(0, 15000)}`;

  try {
    const generatedText = await generateWithRetry(prompt);

    // Parse the response
    const flashcards = [];
    const cards = generatedText.split("---").filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split("\n");
      let question = "",
        answer = "",
        difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.substring(2).trim();
        } else if (line.startsWith("A:")) {
          answer = line.substring(2).trim();
        } else if (line.startsWith("D:")) {
          const diff = line.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    return flashcards.slice(0, count);
  } catch (error) {
    console.error("Gemini API error in Flashcards:", error);
    throw new Error("Failed to generate flashcards");
  }
};

/**
 * Generate quiz questions
 */
export const generateQuiz = async (text, numQuestions = 5) => {
  const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
Format each question as:
Q: [Question]
O1: [Option 1]
O2: [Option 2]
O3: [Option 3]
O4: [Option 4]
C: [Correct option - exactly as written above]
E: [Brief explanation]
D: [Difficulty: easy, medium, or hard]

Separate questions with "---"

Text:
${text.substring(0, 10000)}`;

  try {
    const generatedText = await generateWithRetry(prompt);

    const questions = [];
    const questionBlocks = generatedText.split("---").filter((q) => q.trim());

    for (const block of questionBlocks) {
      const lines = block.trim().split("\n");
      let question = "",
        options = [],
        correctAnswer = "",
        explanation = "",
        difficulty = "medium";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q:")) {
          question = trimmed.substring(2).trim();
        } else if (trimmed.match(/^O\d:/)) {
          options.push(trimmed.substring(3).trim());
        } else if (trimmed.startsWith("C:")) {
          correctAnswer = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("E:")) {
          explanation = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("D:")) {
          const diff = trimmed.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && options.length === 4 && correctAnswer) {
        questions.push({
          question,
          options,
          correctAnswer,
          explanation,
          difficulty,
        });
      }
    }

    return questions.slice(0, numQuestions);
  } catch (error) {
    console.error("Gemini API error in Quiz:", error);
    throw new Error("Failed to generate quiz");
  }
};

/**
 * Generate document summary
 */
export const generateSummary = async (text) => {
  const prompt = `Provide a concise summary of the following text, highlighting the key concepts, main ideas, and any important conclusions.
Keep the summary clear and structured.

Text:
${text.substring(0, 20000)}`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.error("Gemini API error in Summary:", error);
    throw new Error("Failed to generate summary");
  }
};

/**
 * Chat with document context
 */
export const chatWithContext = async (question, chunks) => {
  const context = chunks
    .map((c, i) => `[Chunk ${i + 1}]\n${c.content}`)
    .join("\n\n");

  const prompt = `You are an expert educational tutor. Your goal is to help the user deeply understand the concepts presented in the provided document context.

### Information & Expansion Protocol:
1. **Primary Grounding:** Always start by analyzing the provided Context to answer the user's question.
2. **Educational Expansion:** If the Context mentions a concept but lacks depth, clarity, or examples, you MUST use your own external knowledge to explain it better. Provide real-world examples, analogies, and deeper context to ensure the user actually learns the concept. 
3. **Offer Depth:** When you introduce external examples or deeper explanations not explicitly in the text, end your response by asking the user if they would like to explore that specific concept further.
4. **Strict Guardrails (Off-Topic):** You are limited to the overarching subject matter of the document. If the user asks a question completely unrelated to the themes of the document, politely deny the request. Use a variation of: "I am specifically tuned to help you understand [Document's Main Subject]. I cannot answer questions outside of this scope."

### Formatting Requirements:
- Use GitHub Markdown.
- Use headings (##) to structure the answer.
- Use bullet points for readability.
- Use numbered lists for step-by-step procedures.
- **Bold** important keywords and concepts.
- Use tables when comparing two or more concepts.
- Use code blocks with appropriate syntax highlighting if needed.
- Keep paragraphs short and digestible.

### Teaching Style:
- Explain like a patient, encouraging teacher.
- Use simple, accessible language. Avoid unnecessary jargon.
- Summarize the answer with a **Key Takeaway** at the end (before offering to go deeper).

Context:
${context}

Question: ${question}

Answer:`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.error("Gemini API error in Chat:", error);
    throw new Error("Failed to process chat request");
  }
};

/**
 * Explain a specific concept
 */
export const explainConcept = async (concept, context) => {
  const prompt = `Explain the concept of "${concept}" based on the following context.
Provide a clear, educational explanation that's easy to understand.
Include examples if relevant.

Context:
${context.substring(0, 10000)}`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.error("Gemini API error in Explain Concept:", error);
    throw new Error("Failed to explain concept");
  }
};
