import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './i/Scripts/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// عناصر واجهة المستخدم
const uiElements = {
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    scoreDisplay: document.getElementById('score'),
    missedCountDisplay: document.getElementById('missedCount'),
    timerDisplay: document.getElementById('timer'),
    retryButton: document.getElementById('retryButton'),
    loadingScreen: document.getElementById('loadingScreen'),
};

let score = 0;
let missedCount = 0;
let timeLeft = 60;
let gameOver = false;
let gameInterval;
let fallingInterval;
let gameState = {};

// جلب بيانات المستخدم من Telegram والتحقق في قاعدة البيانات
async function fetchUserDataFromTelegram() {
    const telegramApp = window.Telegram.WebApp;
    telegramApp.ready();

    const userTelegramId = telegramApp.initDataUnsafe.user?.id;
    const userTelegramName = telegramApp.initDataUnsafe.user?.username;

    if (!userTelegramId || !userTelegramName) {
        throw new Error("Failed to fetch Telegram user data.");
    }

    // عرض بيانات المستخدم في واجهة المستخدم
    uiElements.userTelegramIdDisplay.innerText = `ID: ${userTelegramId}`;
    uiElements.userTelegramNameDisplay.innerText = `Username: ${userTelegramName}`;

    // تحقق من المستخدم في قاعدة البيانات، سجل إذا لم يكن موجودًا
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userTelegramId)
        .maybeSingle(); 

    if (error) {
        console.error('Error fetching user data:', error);
        throw new Error('Failed to fetch user data');
    }

    if (data) {
        // المستخدم مسجل مسبقاً
        gameState = { ...gameState, ...data };
        updateUI();
    } else {
        // تسجيل مستخدم جديد
        await registerNewUser(userTelegramId, userTelegramName);
    }
}


// تحديث واجهة المستخدم
function updateUI() {
    uiElements.scoreDisplay.innerText = `رصيدك: ${gameState.balance} SP`;
}


// تحديث بيانات المستخدم في قاعدة البيانات بعد الفوز
async function updateGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText.split(":")[1].trim();

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: gameState.balance }) // تحديث الرصيد في قاعدة البيانات
            .eq('telegram_id', userId);

        if (error) {
            console.error('Error updating game state in Supabase:', error.message);
            return;
        }

        console.log('Game state updated successfully:', data);
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
    }
}

// بدء اللعبة
function startGame() {
    // إخفاء شاشة التحميل
    uiElements.loadingScreen.style.display = 'none';

    gameOver = false;
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    updateUI();
    uiElements.retryButton.style.display = 'none';

    gameInterval = setInterval(() => {
        if (!gameOver) {
            timeLeft--;
            uiElements.timerDisplay.innerText = `الوقت المتبقي: ${timeLeft}`;
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

// إنشاء العناصر المتساقطة
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

// تحديث الرصيد
function updateScore() {
    gameState.balance = score;
    uiElements.scoreDisplay.innerText = `رصيدك: ${gameState.balance} SP`;
}

// تحديث محاولات الخسارة
function updateMissedCount() {
    uiElements.missedCountDisplay.innerText = `محاولات: ${missedCount}/10`;
}

// إظهار زر إعادة المحاولة
function showRetryButton() {
    uiElements.retryButton.style.display = 'block';
}

uiElements.retryButton.addEventListener('click', () => {
    resetGame();
});

// إعادة تعيين اللعبة
function resetGame() {
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    updateScore();
    updateMissedCount();
    uiElements.retryButton.style.display = 'none';
    startGame();
}

// بدء اللعبة بعد 3 ثواني
window.onload = async function () {
    try {
        await fetchUserDataFromTelegram();
        startGame();
    } catch (err) {
        console.error(err.message);
    }
};
