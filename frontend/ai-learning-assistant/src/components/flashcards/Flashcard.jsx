// Two divs are stacked exactly on top of each other.

// Front Card (Question)
// transform: rotateY(0deg)

// Back Card (Answer)
// transform: rotateY(180deg)

// Clicking changes isFlipped.

// isFlipped = false
// Parent rotation = rotateY(0deg)
// Question visible.

// isFlipped = true
// Parent rotation = rotateY(180deg)
// Answer visible.

// The parent rotates, not the individual cards.

// backfaceVisibility: hidden
// Ensures the reverse side of each card is never shown.

// Result:
// Looks exactly like flipping a real flashcard.

import { useState } from "react";
import { Star, RotateCcw } from "lucide-react";

const Flashcard = ({ flashcard, onToggleStar }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };
  return (
    <div className="relative w-full h-72" style={{ perspective: "1000px" }}>
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-gpu cursor-pointer`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        onClick={handleFlip}
      >
        {/* Front of the card(Question)*/}
        <div
          className="absolute inset-0 w-full h-full bg-white/80 backdrop-blur-xl border-2 border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 p-8 flex flex-col justify-between"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Start Button */}
          <div className="flex items-start justify-between ">
            <div className="bg-slate-100 text-[10px] text-slate-600 rounded px-4 py-1 uppercase">
              {flashcard?.difficulty}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(flashcard._id);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                flashcard.isStarred
                  ? "bg-linear-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/25"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-amber-500"
              }`}
            >
              <Star
                className="w-4 h-4"
                strokeWidth={2}
                fill={flashcard.isStarred ? "currentColor" : "none"}
              />
            </button>
          </div>
          {/* Question Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <p className="text-lg font-semibold texts-slate-900 text-center leading-relaxed ">
              {flashcard.question}
            </p>
          </div>
          {/* Flip Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs texts-slate-400 font-medium">
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Click to reveal answer</span>
          </div>
        </div>

        {/* Back of the card(Answer) */}
        <div
          className="absolute inset-0 w-full h-full bg-linear-to-br bg-emerald-500 to-teal-500 border-2 border-emerald-400/60 rounded-2xl shadow-xl shadow-emerald-500/30 p-8 flex flex-col justify-between"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Star Button */}
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(flashcard._id);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                flashcard.isStarred
                  ? "bg-white/30 backdrop-blur-sm text-white border border-white/40"
                  : "bg-white/20 backdrop-blur-sm text-white/70 hover:bg-white/30 hover:text-white border border-white/20"
              }`}
            >
              <Star
                className="w-4 h-4"
                strokeWidth={2}
                fill={flashcard.isStarred ? "currentColor" : "none"}
              />
            </button>
          </div>
          {/* Answer Content */}
          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <p className="text-base text-white text-center leading-relaxed font-medium">
              {flashcard.answer}
            </p>
          </div>

          {/* Flip Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/70 font-medium">
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Click to see question</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;

// flashcard
// Contains question, answer, difficulty, and star status.

// onToggleStar
// Callback received from parent to update the starred status.

// isFlipped
// Local state controlling whether the question or answer is visible.

// handleFlip()
// Toggles isFlipped between true and false.

// perspective: 1000px
// Gives the browser a 3D viewing perspective so the flip looks realistic.

// transformStyle: "preserve-3d"
// Keeps child elements positioned in 3D space during rotation.

// transform: rotateY(...)
// Rotates the entire flashcard around the Y-axis.
// 0deg -> Question side
// 180deg -> Answer side

// transition-transform duration-500
// Animates the flip smoothly over 500ms.

// backfaceVisibility: hidden
// Hides the back side of each card when it faces away from the user.

// Front Card
// Displays the question.

// Back Card
// Displays the answer.
// Initially rotated by 180° so it appears after the parent flips.

// e.stopPropagation()
// Prevents clicking the star button from also triggering the card flip.

// transform-gpu
// Uses GPU acceleration for smoother animations.