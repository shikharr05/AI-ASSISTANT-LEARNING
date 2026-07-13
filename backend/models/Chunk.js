
//instead of sending whole document to gemini we are creating small chunks and then sending it to gemini. makes AI processing easier.
import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema({
  // This ties the chunk back to the original PDF
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true,
    index: true,
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  pageNumber: {
    type: Number,
    default: 0,
  },
  chunkIndex: {
    type: Number,
    required: true,
  },
  //NEW: Stroing a 768-dimensional vector from gemini for vector RAG
  embedding: {
    type: [Number],
    required: true,
  },
});

const Chunk = mongoose.model("Chunk", chunkSchema);
export default Chunk;
