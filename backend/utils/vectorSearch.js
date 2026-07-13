import { generateEmbedding } from "./embeddingHelper.js";
import Chunk from "../models/Chunk.js";
import mongoose from "mongoose";

export const findRelevantChunksVector = async (
  documentId,
  userQuery,
  maxChunks = 3,
) => {
  // 1. Turn the question into numbers
  const queryVector = await generateEmbedding(userQuery);

  // 2. Let Atlas do the heavy lifting
  return await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryVector,
        numCandidates: maxChunks * 10,
        limit: maxChunks,
        filter: { documentId: new mongoose.Types.ObjectId(documentId) },
      },
    },
    {
      $project: {
        content: 1, // We only need the text to send to Gemini
        pageNumber: 1,
        chunkIndex: 1,
      },
    },
  ]);
};
