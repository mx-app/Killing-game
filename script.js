const scoreDisplay = document.getElementById('score');
const missedCountDisplay = document.getElementById('missedCount');
const timerDisplay = document.getElementById('timer');
const retryButton = document.getElementById('retryButton');
const loadingScreen = document.getElementById('loadingScreen');

let score = 0;
let missedCount = 0;
let timeLeft = 60;
let gameOver = false;
let gameInterval;
let fallingInterval;

function startGame() {
    // إخفاء شاشة التحميل
    loadingScreen.style.display = 'none';

    gameOver = false;
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    updateScore();
    updateMissedCount();

    gameInterval = setInterval(() => {
        if (!gameOver) {
            timeLeft--;
            timerDisplay.textContent = `Time : ${timeLeft}`;
            if (timeLeft <= 0) {
                gameOver = true;
                clearInterval(gameInterval);
                clearInterval(fallingInterval);
                showRetryButton();
            }
        }
    }, 1000);

    fallingInterval = setInterval(() => {
        if (!gameOver) {
            createFallingItem();
        }
    }, 1000);
}

function createFallingItem() {
    const fallingItem = document.createElement('div');
    fallingItem.classList.add('fallingItem');
    fallingItem.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    fallingItem.style.top = `-50px`;
    document.body.appendChild(fallingItem);

    let fallingSpeed = 2;
    let fallingInterval = setInterval(() => {
        if (!gameOver) {
            fallingItem.style.top = `${fallingItem.offsetTop + fallingSpeed}px`;

            if (fallingItem.offsetTop > window.innerHeight - 60) {
                missedCount++;
                updateMissedCount();
                document.body.removeChild(fallingItem);

                if (missedCount >= 10) {
                    gameOver = true;
                    clearInterval(fallingInterval);
                    showRetryButton();
                }
            }
        }
    }, 10);

    fallingItem.addEventListener('click', () => {
        if (!gameOver) {
            fallingItem.classList.add('dead');
            setTimeout(() => {
                document.body.removeChild(fallingItem);
            }, 500);
            score++;
            updateScore();
        }
    });
}

function updateScore() {
    scoreDisplay.textContent = `Balance : ${score} SP`;
}

function updateMissedCount() {
    missedCountDisplay.textContent = `Attempts: ${missedCount}/10`;
}

function showRetryButton() {
    retryButton.style.display = 'block';
    document.querySelectorAll('.fallingItem').forEach(item => item.remove()); // مسح العناصر المتبقية
}

retryButton.addEventListener('click', () => {
    resetGame();
});

function resetGame() {
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    updateScore();
    updateMissedCount();
    retryButton.style.display = 'none';
    startGame();
}

// بدء اللعبة مع إضافة شاشة التحميل
setTimeout(() => {
    startGame();
}, 3000);
