import { STATUS_CODES } from "http";
import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import Chunk from "../models/Chunk.js";

import { extractTextFromPDF } from "../utils/pdfParser.js";
import { chunkText } from "../utils/textChunker.js";
import fs from "fs/promises";
import mongoose from "mongoose";
import { json } from "stream/consumers";
import { generateEmbedding } from "../utils/embeddingHelper.js";
import { error } from "console";
import path from "path";

//desc upload PDF document
//route POST /api/documents/upload
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      //delete uploaded file if no title provided
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Please provide a document title",
        statusCode: 400,
      });
    }

    //construct the url for the uploaded file
    const baseUrl = `http://localhost:${process.env.PORT || 8000}`;
    const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

    //create document record
    //yaha hamne sirf document ki initial details daali hai... for text i.e present in document we need to parse it first wo hamne processPDF function ke andar krke and uske chunks banake daale hai fir Document mai.
    const document = await Document.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileUrl, //store the URL instead of the local path.
      fileSize: req.file.size,
      status: "processing",
    });

    //process PDF in background (in production, use a queue like Bull)
    processPDF(document._id, req.file.path, req.user._id).catch((err) => {
      console.error("PDF processing error: ", err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message: "Document uploaded successfully! Processing in progress...",
    });
  } catch (error) {
    //clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

//helper function to process pdf
const processPDF = async (documentId, filePath, userId) => {
  try {
    let { text, numPages } = await extractTextFromPDF(filePath);

    // 2. Calculate document density
    const totalWords = text.trim().split(/\s+/).length;
    const averageWordsPerPage = totalWords / numPages;
    //coz we dont wanna give a hardcoded chunksize as it should depend upon the size of the pdf.... a very big pdf with a comparitively smaaller chunk size will be poor as it will result in repeated RAG
    //and a small pdf with big chunk size will be muddy as due to vector RAG multiple concepts might mix making it a little muddy.

    console.log(`Document Density: ${averageWordsPerPage} words per page`);

    // 3. Dynamically set chunk parameters
    let targetChunkSize;
    let targetOverlap;

    if (averageWordsPerPage < 150) {
      // It's likely a presentation slide deck (Sparse)
      targetChunkSize = 150;
      targetOverlap = 20;
    } else {
      // It's likely a textbook, article, or research paper (Dense)
      targetChunkSize = 500;
      targetOverlap = 50;
    }

    //create chunks
    const rawChunks = await chunkText(text, targetChunkSize, targetOverlap);

    console.log(`Generating vectors for ${rawChunks.length} chunks...`);

    // 3. Generate Embeddings for each chunk
    const chunksWithEmbeddings = [];
    for (const chunk of rawChunks) {
      const trimmedContent = chunk.content ? chunk.content.trim() : "";
      if (!trimmedContent) {
        console.log(
          `Skipping empty/whitespace chunk at index ${chunk.chunkIndex} (Page ${chunk.pageNumber})`,
        );
        continue; // Instantly skips this chunk and moves to the next one
      }
      const vector = await generateEmbedding(chunk.content);
      if (vector) {
        chunksWithEmbeddings.push({
          documentId: documentId, // Tying it to the parent PDF
          userId: userId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          embedding: vector,
        });
      }
    }

    // 4. Bulk insert all chunks into the new collection
    await Chunk.insertMany(chunksWithEmbeddings);

    // 5. Save the extracted text to the parent Document
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      status: "ready",
      totalChunks: chunksWithEmbeddings.length,
    });
    console.log(
      `Document ${documentId} processed and vectorized successfully!`,
    );
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, { status: "failed" });
  } finally {
    // THIS IS THE MAGIC CLEANUP!
    // It runs no matter what happens above.
    try {
      // await fs.unlink(filePath);
      // console.log(`Cleaned up local file: ${filePath}`);
    } catch (cleanupError) {
      console.error(`Failed to delete local file ${filePath}:`, cleanupError);
    }
  }
};

//desc GET all user documents
// route GET /api/documents
//access private

// Very important controller. We use MongoDB Aggregation Pipeline instead of a simple Document.find()
// because we need additional information such as flashcard and quiz counts.
//
// First, $match filters all documents and keeps only those belonging to the currently logged-in user
// (using req.user._id from the JWT authentication middleware).
//
// Then, $lookup performs a MongoDB join. For each document, it compares Document._id (localField)
// with Flashcard.documentId (foreignField). All matching flashcard documents are collected into a
// new array called flashcardSets. The same process is repeated for quizzes.
//
// Next, $addFields uses $size to calculate flashcardCount and quizCount from those arrays and adds
// these counts to the document.
//
// Finally, $project removes large or unnecessary fields such as extractedText, chunks,
// flashcardSets, and quizzes before sending the response to the frontend.
//
// Result: The frontend receives a clean list of user documents along with the number of flashcards
// and quizzes generated for each document
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user._id) },
      },
      {
        $lookup: {
          from: "flashcards",
          localField: "_id",
          foreignField: "documentId",
          as: "flashcardSets",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "documentId",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          flashcardCount: { $size: "$flashcardSets" },
          quizCount: { $size: "$quizzes" },
        },
      },
      {
        $project: {
          extractedText: 0,
          flashcardSets: 0,
          quizzes: 0,
        },
      },
      {
        $sort: { uploadDate: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

//desc get single document with chunks
//route GET /api/documents/:id
//access private

export const getDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found!",
        statusCode: 404,
      });
    }

    //get chunks
    const chunks = await Chunk.find({
      documentId: document._id,
      userId: req.user._id,
    })
      .select("-embedding")
      .sort({ chunkIndex: 1 });

    //get count of associated flashcards and quizzes
    const flashcardCount = await Flashcard.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });
    const quizCount = await Quiz.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    //update last accessed
    document.lastAccessed = Date.now();
    await document.save();

    //combine document data with counts;
    const documentData = document.toObject();
    documentData.flashcardCount = flashcardCount;
    documentData.quizCount = quizCount;
    documentData.chunks = chunks;

    res.status(200).json({
      success: true,
      data: documentData,
    });
  } catch (error) {
    next(error);
  }
};

//desc delete document
//route DELETE /api/document/:id
//access private

export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found!",
        statusCode: 404,
      });
    }

    //delete file from filesystem
    try {
      const fileName = document.filePath.split("/").pop();
      // 2. Build the local path: C:\Users\Shikhar\... \backend\uploads\documents\filename.pdf
      const localFilePath = path.join(
        process.cwd(),
        "uploads",
        "documents",
        fileName,
      );
      // 3. Delete it!
      await fs.access(localFilePath);

      // 2. If access is successful, delete it
      await fs.unlink(localFilePath);
      console.log(`Successfully deleted local file: ${fileName}`);
    } catch (err) {
      console.error("Could not delete file from your system: ", err.message);
    }
    //delete all associated vector chunks
    await Chunk.deleteMany({ documentId: document._id, userId: req.user._id });

    //delete all flashcards and quizzes
    await Flashcard.deleteMany({
      documentId: document._id,
      userId: req.user._id,
    });
    await Quiz.deleteMany({ documentId: document._id, userId: req.user._id });

    //delete document
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: "Document Deleted Successfully!",
    });
  } catch (error) {
    next(error);
  }
};
