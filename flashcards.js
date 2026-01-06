// ==========================================
// FLASHCARD DATA (Hardcoded - No Database)
// ==========================================
const flashcardsData = [
    {
        question: "What does HTML stand for?",
        answer: "HyperText Markup Language"
    },
    {
        question: "What is the purpose of CSS?",
        answer: "CSS (Cascading Style Sheets) is used to style and layout web pages."
    },
    {
        question: "What is a Variable?",
        answer: "A container for storing data values."
    },
    {
        question: "What is an Array?",
        answer: "A special variable, which can hold more than one value at a time."
    },
    {
        question: "What is the DOM?",
        answer: "The Document Object Model. It represents the page so programs can change the document structure, style, and content."
    }
];

// ==========================================
// GAME STATE
// ==========================================
let currentIndex = 0;
let isFlipped = false;

// ==========================================
// LOGIC FUNCTIONS
// ==========================================

function updateCardUI() {
    const cardFront = document.getElementById('cardFront');
    const cardBack = document.getElementById('cardBack');
    const currentCard = flashcardsData[currentIndex];

    // Update text
    cardFront.textContent = currentCard.question;
    cardBack.textContent = currentCard.answer;

    // Update counter
    document.getElementById('counter').textContent = `Card ${currentIndex + 1} of ${flashcardsData.length}`;

    // Reset flip state visually
    const cardInner = document.querySelector('.flashcard-inner');
    if (isFlipped) {
        cardInner.style.transform = 'rotateY(180deg)';
    } else {
        cardInner.style.transform = 'rotateY(0deg)';
    }
}

// Global functions for HTML buttons
window.flipCard = () => {
    isFlipped = !isFlipped;
    const cardInner = document.querySelector('.flashcard-inner');
    cardInner.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
};

window.nextCard = () => {
    if (currentIndex < flashcardsData.length - 1) {
        currentIndex++;
        isFlipped = false; // Reset flip
        updateCardUI();
    } else {
        alert("You've reached the end!");
    }
};

window.prevCard = () => {
    if (currentIndex > 0) {
        currentIndex--;
        isFlipped = false; // Reset flip
        updateCardUI();
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateCardUI();
});
