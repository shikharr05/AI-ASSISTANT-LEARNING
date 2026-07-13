import Document from "../models/Document.js";
import Flashcard from "../models/Flashcard.js";
import Quiz from "../models/Quiz.js";
import ChatHistory from "../models/ChatHistory.js";
import * as geminiService from "../utils/geminiService.js";
import e from "express";
import { findRelevantChunksVector } from "../utils/vectorSearch.js";
//import { findRelevantChunks } from "../utils/textChunker.js";

//@desc Generate flashcards from documents
//@route POST /api/ai/generate-flashcards
//access private

export const generateFlashcards = async (req, res, next) => {
  try {
    const { documentId, count = 10 } = req.body;

    if(!documentId){
        return res.status(400).json({
            success: false,
            error: 'Please provide documentId',
            statusCode: 400
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });

    if(!document){
        return res.status(404).json({
            success: false,
            error: 'Document not found or not ready',
            statusCode: 404,
        });
    }

    //generate flashcards using gemini
    const cards = await geminiService.generateFlashcards(
        document.extractedText,
        parseInt(count)
    );

    //save the flashcards in the database.
    const flashcardSet = await Flashcard.create({
        userId: req.user._id,
        documentId: document._id,
        cards: cards.map(card => ({
            question: card.question,
            answer: card.answer,
            difficulty: card.difficulty,
            reviewCount: 0,
            isStarred: false,
        }))
    });

    res.status(201).json({
        success: true,
        data: flashcardSet,
        message: 'Flashcards generated successfully!'
    });

  } catch (error) {
    next(error);
  }
};

//@desc Generate Quiz from documents
//@route POST /api/ai/generate-quiz
//access private

export const generateQuiz = async (req, res, next) => {
  try {
    const { documentId, numQuestions = 5, title } = req.body;
    if(!documentId){
        return res.status(400).json({
            success: false,
            error: 'Please provide documentId',
            statusCode: 400
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready',
    });

    if(!document){
        return res.status(404).json({
            success: false,
            error: 'Document not found or not ready',
            statusCode: 404,
        });
    }

    //generate Quiz using gemini model
    const questions = await geminiService.generateQuiz(
        document.extractedText,
        parseInt(numQuestions),
    );

    //save to database
    const quiz = await Quiz.create({
        userId: req.user._id,
        documentId: document._id,
        title: title || `${document.title} - Quiz`, 
        questions: questions,
        totalQuestions: questions.length,
        userAnswers: [],
        score: 0
    });

    res.status(201).json({
        success: true,
        data: quiz,
        message: 'Quiz generated successfull!',
    });
  } catch (error) {
    next(error);
  }
};

//@desc Generate document summary
//@route POST /api/ai/generate-summary
//access private

export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;
    if(!documentId){
        return res.status(400).json({
            success: false,
            error: 'Please provide documentId',
            statusCode: 400,
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready',
    });

    if(!document){
        return res.status(404).json({
            success: false,
            error: 'Document not found or not ready',
            statusbar: 404,
        });
    }

    //generate summary using gemini
    const summary = await geminiService.generateSummary(
        document.extractedText
    );

    return res.status(201).json({
        success: true, 
        data: {
            documentId: document._id,
            title: document.title,
            summary,
        },
        message: 'Summary generated successfully!',
    });

  } catch (error) {
    next(error);
  }
};

//@desc chat with ai for queires in document
//@route POST /api/ai/chat
//access private

export const chat = async (req, res, next) => {
  try {
    const { documentId, question } = req.body;
    if(!documentId || !question){
        return res.status(400).json({
            success:false,
            error: 'Please provide documentId and question',
            statusCode: 400
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready',
    });

    if(!document){
        return res.status(404).json({
            success: false,
            error: 'Document not found or not ready',
            statusCode: 404,
        });
    }

    //find relevant chunks
    const relevantChunks = await findRelevantChunksVector(documentId, question, 3);
    const chunkIndices = relevantChunks.map(c => c.chunkIndex);

    //get or create chat history
    let chatHistory = await ChatHistory.findOne({
        userId: req.user._id,
        documentId: document._id, 
    });

    if(!chatHistory){
        chatHistory = await ChatHistory.create({
            userId: req.user._id,
            documentId: document._id,
            messages: [],
        });
    }

    //generate response using gemini
    const answer = await geminiService.chatWithContext(question, relevantChunks);

    //save conversation
    chatHistory.messages.push(
        {
            role: 'user',
            content: question,
            timestamp: new Date(),
            relevantChunks: []
        },
        {
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
            relevantChunks: chunkIndices
        }
    );

    await chatHistory.save();

    return res.status(200).json({
        success: true,
        data: {
            question,
            answer,
            relevantChunks: chunkIndices,
            chatHistoryId: chatHistory._id
        },
        message: 'Response generated successfully!',
    });

  } catch (error) {
    next(error);
  }
};

//@desc explain concept from document
//@route POST /api/ai/explain-concept
//access private

export const explainConcept = async (req, res, next) => {
  try {
    const { documentId, concept } = req.body;
    if(!documentId || !concept){
        return res.status(400).json({
            success: false,
            error: 'Please provide documentId and concept',
            statusCode: 400,
        });
    }

    const document = await Document.findOne({
        _id: documentId,
        userId: req.user._id,
        status: 'ready'
    });

    if(!document){
        return res.status(404).json({
            success: false,
            error: 'Document not found or is not ready!',
            statusCode: 404,
        });
    }

    //find relevant chunks
    const relevantChunks = await findRelevantChunksVector(documentId, concept, 3);
    const context = relevantChunks.map(c => c.content).join('\n\n');

    //generate explanation using gemini
    const explanation = await geminiService.explainConcept(concept, context);

    res.status(200).json({
        success: true, 
        data: {
            concept,
            explanation,
            relevantChunks: relevantChunks.map(c => c.chunkIndex),
        },
        message: 'Explanation generated successfully!',  
    });

  } catch (error) {
    next(error);
  }
};

//@desc get chat history
//@route GET /api/ai/chat-history/:documentId
//access private

    export const getChatHistory = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        if(!documentId){
            return res.status(400).json({
                success: false,
                error: 'Please provide a documentId',
                statusCode: 400,
            });
        }

        const chatHistory = await ChatHistory.findOne({
            documentId: documentId,
            userId: req.user._id,
        }).select('messages') // only retrieve the message array.

        if(!chatHistory){
            return res.status(200).json({
                success: true,
                data: [], // return an empty array if no history found
                message: 'No chat history found for this document',
            });
        }

        res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrieved successfully!'
        });

    } catch (error) {
        next(error);
    }
    };



