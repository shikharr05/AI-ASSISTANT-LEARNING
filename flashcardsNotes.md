Flashcard Routing Flow
There are two ways to study flashcards
Flow 1: From Document Details
DocumentDetailPage
        │
        ▼
FlashcardManager(inside renderFlashcardsTab())
        │
        ▼
Shows all flashcard sets
        │
User selects a set
        ▼
selectedSet = set
        │
        ▼
renderFlashcardViewer()
        │
        ▼
<Flashcard />



Purpose
User is already inside a document.
Can generate new flashcard sets.
Can delete sets.
Can choose which set to study.



Flow 2: From All Flashcard Sets
FlashcardsListPage
        │
        ▼
FlashcardSetCard
        │
Click "Study Now"
        ▼
navigate(`/documents/:id/flashcards`)
        │
        ▼
React Router(app.jsx)
        │
        ▼
FlashcardPage
        │
        ▼
fetchFlashcards()
        │
        ▼
<Flashcard />
Purpose
User starts from the list of all flashcard sets.
Directly opens study mode.
Skips the flashcard-set selection screen.




How navigate() works
navigate(`/documents/${id}/flashcards`);

navigate() does not import FlashcardPage.

It only changes the URL.

Example:

Current URL:
/flashcards

↓

navigate("/documents/123/flashcards")

↓

Browser URL changes

↓

React Router checks routes

↓

Matches:

<Route
path="/documents/:id/flashcards"
element={<FlashcardPage />}
/>

↓

FlashcardPage is rendered
Why FlashcardPage executes automatically

Because React Router contains:

<Route
    path="/documents/:id/flashcards"
    element={<FlashcardPage />}
/>

Whenever the URL matches,

React Router creates

<FlashcardPage />

You never import it manually.

Where Flashcard component is used
Inside FlashcardManager
<Flashcard
    flashcard={currentCard}
    onToggleStar={handleToggleStar}
/>

This happens after:

User selects a flashcard set
Inside FlashcardPage
<Flashcard
    flashcard={currentCard}
    onToggleStar={handleToggleStar}
/>

This happens immediately after:

Flashcards are fetched
Why two different pages?
FlashcardManager

Acts like a dashboard.

Responsibilities:

Fetch flashcard sets
Show all sets
Generate new sets
Delete sets
Let user choose a set
Open Flashcard component
FlashcardPage

Acts like a study screen.

Responsibilities:

Fetch flashcards
Show one flashcard
Previous/Next navigation
Star cards
Delete set
Open Flashcard component



Overall Architecture
                    User

          ┌───────────────┐
          │               │
          ▼               ▼

DocumentDetailPage   FlashcardsListPage
          │               │
          ▼               ▼

 FlashcardManager    FlashcardSetCard
          │               │
          │               ▼
          │        navigate(...)
          │               │
          │               ▼
          │         React Router
          │               │
          ▼               ▼

 renderFlashcardViewer()  FlashcardPage
          │               │
          └───────┬───────┘
                  ▼
             <Flashcard />
One-line summary (good for interviews/revision)

FlashcardManager is the document-level manager that lets users manage and select flashcard sets, while FlashcardPage is a dedicated study page opened via React Router. Both ultimately reuse the same reusable Flashcard component to display and interact with individual flashcards.