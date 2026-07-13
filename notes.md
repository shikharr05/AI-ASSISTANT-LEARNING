soo first what we were doingg we were like in documentroutes we were calling document controller and in document controller using different utils we were extracting out text from pdfs and so on...
but when we were extracting text using our oldPdfParser in oldLearnings we were doing it via general help of locally node.js.. it was working on normal pdfs but it was not able to extract text from like ppt converted to pdfs or scanned pdfs. 
so for that we need to change our working style and we rather than extracting text using node.js we used gemini model and send our file to google servers and using gemini api's we extracted text from the pdf...

//now we got the text and the major work now was to create chunks.
so for that we calculated the number of pages locally as it can be easilly done and we dont want to waste tokens or money on that so we locally counted number of pages (also done in pdfParser.js only) and we calculated the density of the pdf..
coz our chunks are being made on the word count and like chunk ka general size we have to tell and then it will be divided into that size of chunks..
so agr pdf would be very big we need that chunks size should not be small as it will make so many chunks which will cause multiple RAG, that would not be helpful and if pdf is small then we need that chunk size should not be much big as it will result in muddy results as due to vector RAG multiple concepts might mix making it a little muddy.

//so we found the density and passed the dynamic chunksize and overlapsize to make good chunks...


//then our next major step was too apply semantic vector RAG rather than lexical RAG...
first we were just checking wether the query words are present in our chunk if yess then its a good chunk... but sometimes its not good as words are different and meaning is samee..
so we used gemini-embedding-2 model for creating embedding for all chunks basically its a vector which stores the meaning of the chunk rather than just comparing the actual words and compare how far or close the queryVector and chunkVector is.
so after creating all these embeddings we added the chunk in Chunk Model.
all this was done in processPdF function.

//now our next major work was to Search a vector which is best suited for the user query and send those chunks to gemini or wherever we want.
so for that we created another util vectorSearch where we first created a vector_index in our MONGO DB on our embeddings so that we can access it faster in our vector search and then we applied vector search on our vector_index matching the queryVector and return the closest vectors to the queryVector that we will send it to gemini.. alsoo one most important thing as we have created a new Model Chunk now rather than just creating an array in our Document model it is now very important that we only apply vectorSearch on those whose Document id is same as that of the pdf... so we need to apply filter on it mentioning the Document id so that vectorSearch only applies on those that matches the documentId.
now these most closest chunks to query is returned and sent to gemini for its reference and it can answer whatever user wants.




agar na smjh aaye to check this out




// Earlier workflow:
//
// In documentRoutes we call documentController, and from there we use various utility functions
// to process uploaded PDFs.
//
// Initially, we were using a local PDF parser (oldPdfParser) which relied on Node.js libraries
// like pdf-parse to extract text from PDFs. This worked well for normal text-based PDFs,
// but struggled with scanned PDFs, image-based PDFs, and PPTs converted to PDFs because
// there was little or no extractable text available.
//
// To solve this, we switched to Gemini's File API. Instead of extracting text locally,
// we upload the PDF to Google's servers and ask Gemini to extract all text from the document.
// Gemini is much better at understanding complex PDF layouts, scanned documents,
// presentations, and image-based content.
//
// -------------------------------------------------------------------------
// STEP 1: EXTRACT TEXT + PAGE COUNT
// -------------------------------------------------------------------------
//
// We still calculate page count locally using pdfjs-dist because page counting
// is simple and doesn't require AI. Doing it locally saves tokens and cost.
//
// After extracting text, we calculate:
//
// averageWordsPerPage = totalWords / totalPages
//
// This gives us the document density.
//
// We use density because chunk size should depend on the type of document.
//
// Sparse document (slides / presentations):
//     Few words per page
//     Smaller chunks
//
// Dense document (books / research papers):
//     Many words per page
//     Larger chunks
//
// If chunk size is too small:
//     → Too many chunks
//     → More retrieval operations
//     → Less context per chunk
//
// If chunk size is too large:
//     → Multiple concepts get mixed together
//     → Retrieval becomes less accurate
//
// Therefore we dynamically choose chunkSize and overlap based on density
// and then create chunks using chunkText().
//
// -------------------------------------------------------------------------
// STEP 2: VECTORIZE THE CHUNKS
// -------------------------------------------------------------------------
//
// Earlier we used Lexical RAG.
//
// Lexical RAG means:
//
// Query:
//     "What causes motion?"
//
// Search:
//     Look for chunks containing words like
//     "causes", "motion", etc.
//
// This works but has a major limitation:
//
// Query:
//     "What causes motion?"
//
// Chunk:
//     "Newton's laws explain moves."
//
// Meaning is similar, but exact words may differ.
//
// To solve this we moved to Semantic Vector RAG.
//
// We use Gemini's embedding model (gemini-embedding-2)
// to convert every chunk into an embedding vector.
//
// Example:
//
// Chunk Text
//      ↓
// Embedding Model
//      ↓
// [0.12, -0.44, 0.88, ...]
//
// The embedding captures the semantic meaning of the chunk
// rather than just its raw words.
//
// Each chunk is stored in the Chunk collection along with:
//
// {
//     content,
//     embedding,
//     documentId,
//     pageNumber,
//     chunkIndex
// }
//
// All of this happens inside processPDF().
//
// -------------------------------------------------------------------------
// STEP 3: VECTOR RETRIEVAL (SEMANTIC SEARCH)
// -------------------------------------------------------------------------
//
// Once all chunk embeddings are stored, we need a way to find
// the chunks most relevant to a user's question.
//
// First we create a MongoDB Atlas Vector Search Index:
//
// vector_index
//
// on the embedding field.
//
// The vector index does NOT store new application data.
// It is simply a special Atlas data structure that makes
// nearest-neighbor searches on embeddings much faster.
//
// Similar to:
//
// email index
//      ↓
// fast email lookup
//
// vector index
//      ↓
// fast embedding similarity search
//
// -------------------------------------------------------------------------
// STEP 4: RETRIEVE RELEVANT CHUNKS
// -------------------------------------------------------------------------
//
// When a user asks a question:
//
// Question
//      ↓
// Generate query embedding
//      ↓
// queryVector
//
// We then use MongoDB's $vectorSearch:
//
// queryVector
//      ↓
// Compare against stored chunk embeddings
//      ↓
// Find nearest vectors
//      ↓
// Return top relevant chunks
//
// IMPORTANT:
//
// Since chunks are now stored in a separate Chunk collection,
// we must restrict the search to the currently selected document.
//
// That's why we apply:
//
// filter: { documentId }
//
// Without this filter:
//
// Physics PDF question
//      ↓
// Could retrieve chunks from Chemistry PDF
//
// With the filter:
//
// Physics PDF question
//      ↓
// Search only Physics PDF chunks
//
// Finally, the most relevant chunks are returned and provided
// to Gemini as context.
//
// This allows Gemini to answer questions using information
// from the uploaded document rather than relying solely on
// its own knowledge.
//
// Final Flow:
//
// Upload PDF
//      ↓
// Gemini extracts text
//      ↓
// Calculate density
//      ↓
// Create dynamic chunks
//      ↓
// Generate embeddings
//      ↓
// Store chunks + vectors
//      ↓
// User asks question
//      ↓
// Generate query embedding
//      ↓
// MongoDB Vector Search
//      ↓
// Retrieve most relevant chunks
//      ↓
// Send chunks to Gemini
//      ↓
// Generate answer


"Initially chunks were embedded inside the Document model, but after moving to vector-based semantic retrieval, each chunk needed its own embedding and became an independent searchable unit. Creating a dedicated Chunk collection allowed efficient vector indexing, scalable retrieval using MongoDB Atlas Vector Search, reduced document size, and aligned the architecture with production-grade RAG systems." 





import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a 768-dimensional vector embedding for a text chunk
 * @param {string} text - The text content of the chunk
 * @returns {Promise<Array<number>>}
 */
export const generateEmbedding = async (text) => {
  // Trim and check if the text is actually usable
  const cleanText = text.trim();
  if (!cleanText) {
    console.warn("Skipping empty chunk...");
    return null; // Handle this in your loop
  }
  try {
    // text-embedding-004 is Google's optimized model for RAG
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent(text);

    // Returns the array of 768 numbers
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating vector embedding:", error);
    throw new Error("Failed to generate vector embedding.");
  }
};;
