
import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import quizService from "../../services/quizService";
import aiService from "../../services/aiService";
import Spinner from "../common/Spinner";
import Button from "../common/Button";
import Modal from "../common/Modal";
import QuizCard from "./QuizCard";
import EmptyState from "../common/EmptyState";

const QuizManager = ({ documentId }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const data = await quizService.getQuizzesForDocument(documentId);
      setQuizzes(data.data);
    } catch (error) {
      toast.error("Failed to fetch quizzes.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchQuizzes();
    }
  }, [documentId]);

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await aiService.generateQuiz(documentId, { numQuestions });
      toast.success("Quiz generated successfully!");
      setIsGenerateModalOpen(false);
      fetchQuizzes();
    } catch (error) {
      toast.error(error.message || "Failed to generate quiz.");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteRequest = (quiz) => {
    setSelectedQuiz(quiz);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedQuiz) return;
    setDeleting(true);
    try {
      await quizService.deleteQuiz(selectedQuiz._id);
      toast.success(`'${selectedQuiz.title || "Quiz"}' deleted!`);
      setIsDeleteModalOpen(false);
      setSelectedQuiz(null);
      setQuizzes(quizzes.filter((q) => q._id !== selectedQuiz._id));
    } catch (error) {
      toast.error(error.message || "Failed to delete quiz.");
    } finally {
      setDeleting(false);
    }
  };

  const renderQuizContent = () => {
    if (loading) {
      return <Spinner />;
    }

    if (quizzes.length === 0) {
      return (
        <EmptyState
          title="No Quizzes Yet"
          description="Generate a quiz from your document to test your knowledge."
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz._id} quiz={quiz} onDelete={handleDeleteRequest} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex justify-end gap-2 mb-4 ">
        <Button onClick={() => setIsGenerateModalOpen(true)}>
          <Plus size={16} />
          Generate Quiz
        </Button>
      </div>

      {renderQuizContent()}

      {/* Generate Quiz */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate New Quiz"
      >
        <form onSubmit={handleGenerateQuiz} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Number of Questions
            </label>
            <input
              type="number"
              value={numQuestions}
              onChange={(e) =>
                setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              required
              className="w-full h-9 px-3 border border-neutral-200 rounded-lg bg-white text-sm text-neutral-900 placeholder-neutral-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#00d492] focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGenerateModalOpen(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete Quiz"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to delete the quiz:{" "}
            <span className="font-semibold text-neutral-900">
              {selectedQuiz?.title || "this quiz"}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 focus:ring-red-500"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuizManager;



// ======================= QUIZ MANAGER =======================

// Purpose:
// Manages everything related to quizzes for a particular document.
// Responsibilities:
// 1. Fetch quizzes
// 2. Generate new quiz using AI
// 3. Delete quiz
// 4. Display quizzes
// 5. Handle Generate/Delete modals

// ============================================================
// STATES
// ============================================================

// quizzes
// Stores all quizzes belonging to the current document.

// loading
// Shows spinner while quizzes are being fetched.

// generating
// True while Gemini is generating a new quiz.
// Used to disable buttons and show "Generating...".

// isGenerateModalOpen
// Controls visibility of the Generate Quiz modal.

// numQuestions
// Stores how many questions the user wants Gemini to generate.

// isDeleteModalOpen
// Controls Delete Confirmation modal.

// deleting
// True while deleting a quiz.

// selectedQuiz
// Stores the quiz selected for deletion.

// ============================================================
// fetchQuizzes()
// ============================================================

// Fetches all quizzes for the current document
// using quizService and stores them inside quizzes state.

// ============================================================
// useEffect()
// ============================================================

// Whenever documentId changes,
// automatically fetch quizzes for that document.

// ============================================================
// handleGenerateQuiz()
// ============================================================

// Runs when Generate Quiz form is submitted.
//
// Flow:
//
// User opens Generate Modal
// ↓
// Enters number of questions
// ↓
// Clicks Generate
// ↓
// aiService.generateQuiz(documentId, { numQuestions })
// ↓
// Backend calls Gemini
// ↓
// Quiz saved in MongoDB
// ↓
// Close Generate Modal
// ↓
// Fetch quizzes again to refresh UI.

// ============================================================
// handleDeleteRequest()
// ============================================================

// Runs when user clicks Delete on a QuizCard.
//
// Saves the selected quiz
// Opens Delete Confirmation modal.

// ============================================================
// handleConfirmDelete()
// ============================================================

// Runs after user confirms deletion.
//
// Calls backend to delete quiz.
//
// After success:
// - closes modal
// - clears selectedQuiz
// - removes deleted quiz from React state using filter()
// (No need to fetch again.)

// ============================================================
// renderQuizContent()
// ============================================================

// Decides what to display:
//
// loading
// ↓
// Spinner
//
// No quizzes
// ↓
// EmptyState
//
// Quizzes available
// ↓
// Grid of QuizCards

// ============================================================
// GENERATE MODAL
// ============================================================

// Opened by:
//
// setIsGenerateModalOpen(true)
//
// Contains:
// - Number of Questions input
// - Generate button
// - Cancel button
//
// Form submission calls handleGenerateQuiz().

// ============================================================
// Number Input
// ============================================================

// Math.max(1, parseInt(value) || 1)
//
// Ensures number of questions
// never becomes less than 1.

// ============================================================
// DELETE MODAL
// ============================================================

// Opened by:
//
// handleDeleteRequest()
//
// Shows selected quiz title.
//
// Clicking Delete
// ↓
// handleConfirmDelete()

// ============================================================
// OVERALL FLOW
// ============================================================

/*

Document Opens
      │
      ▼
fetchQuizzes()
      │
      ▼
Display Quiz Cards
      │
      ├──────────────┐
      │              │
      ▼              ▼
Generate Quiz     Delete Quiz
      │              │
Gemini API      Delete API
      │              │
MongoDB         MongoDB
      │              │
      └──────┬───────┘
             ▼
      Update React State
             ▼
      UI Re-renders

*/