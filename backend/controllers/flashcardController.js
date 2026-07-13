// getFlashcards()
// Fetch all flashcard sets belonging to the current user for a specific document.
// populate() is used to replace documentId with actual document details
// such as title and fileName.

// getAllFlashcardSets()
// Fetch all flashcard sets created by the current user across all documents.

// reviewFlashcard()
// Find the flashcard set containing the given cardId,
// update lastReviewed timestamp and increment reviewCount.

// toggleStarFlashcard()
// Toggle isStarred between true and false for a specific flashcard.

// deleteFlashcardSet()
// Delete an entire flashcard set belonging to the current user.
// User ownership is checked before deletion.

import Flashcard from "../models/Flashcard.js";

//@desc  GET all flashcards for a document
//route  GET /api/flashcards/:documentId
//access private

export const getFlashcards = async (req, res, next) => {
  try {
    const flashcards = await Flashcard.find({
      userId: req.user._id,
      documentId: req.params.documentId,
    })
      .populate("documentId", "title fileName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: flashcards.length,
      data: flashcards,
    });
  } catch (error) {
    next(error);
  }
};

//@desc GET all flashcards of all documents for a user.
//route GET /api/flashcards
//access private

export const getAllFlashcardSets = async (req, res, next) => {
  try {
    const flashcards = await Flashcard.find({
      userId: req.user._id,
    })
      // populate("documentId", "title fileName")
      // Replaces the stored documentId with actual document data from the
      // Document collection and only returns title and fileName fields.
      .populate("documentId", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: flashcards.length,
      data: flashcards,
    });
  } catch (error) {
    next(error);
  }
};

//@desc  Mark flashcard as reviewed
//route  POST /api/flashcards/:cardId/review
//access private

export const reviewFlashcard = async (req, res, next) => {
  try {
    const flashcardSet = await Flashcard.findOne({
      userId: req.user._id,
      //we used'cards._id' as cards is an array inside the database and inside that array there is a field _id so to acces inside the array we use ''
      "cards._id": req.params.cardId,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        error: "Flashcard set or card not found",
        statusCode: 404,
      });
    }

    const cardIndex = flashcardSet.cards.findIndex(
      (card) => card._id.toString() === req.params.cardId,
    );
    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Card not found in set.",
        statusCode: 404,
      });
    }

    //update review info
    flashcardSet.cards[cardIndex].lastReviewed = new Date();
    flashcardSet.cards[cardIndex].reviewCount += 1;

    await flashcardSet.save();

    res.status(200).json({
      success: true,
      data: flashcardSet,
      message: "Flashcard reviewed successfully!",
    });
  } catch (error) {
    next(error);
  }
};

//@desc  Toggle star/favourite on flashcard
//route  PUT /api/flashcards/:cardId/star
//access private

export const toggleStarFlashcard = async (req, res, next) => {
  try {
    const flashcardSet = await Flashcard.findOne({
      "cards._id": req.params.cardId,
      userId: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        error: "Flashcard set or card not found!",
        statusCode: 404,
      });
    }

    const cardIndex = flashcardSet.cards.findIndex(
      (card) => card._id.toString() === req.params.cardId,
    );
    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Card not found in set",
        statusCode: 404,
      });
    }

    //toggle star

    flashcardSet.cards[cardIndex].isStarred =
      !flashcardSet.cards[cardIndex].isStarred;
    await flashcardSet.save();

    res.status(200).json({
      success: true,
      data: flashcardSet,
      message: `Flashcard ${flashcardSet.cards[cardIndex].isStarred ? "starred" : "unstarred"}`,
    });
  } catch (error) {
    next(error);
  }
};

//@desc  DELETE a flashcard set
//route DELETE /api/flashcards/:id
//access private

export const deleteFlashcardSet = async (req, res, next) => {
  try {
    const flashcardSet = await Flashcard.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        error: "Flashcard set or card not found!",
        statusCode: 404,
      });
    }

    await flashcardSet.deleteOne();

    res.status(200).json({
      success: true,
      message: "Flashcard set deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
};
