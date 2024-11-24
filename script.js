// استيراد مكتبة Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let isFrozen = false; // حالة التجميد

// تعريف حالة اللعبة
let gameState = {
    balance: 0,
};

// صور العناصر
const freezeImage = 'i/Freeze.png'; // رابط صورة التجميد
const bombImage = 'i/bombb.png';    // رابط صورة القنبلة

// جلب بيانات المستخدم
async function fetchUserDataFromTelegram() {
    const telegramApp = window.Telegram.WebApp;
    telegramApp.ready();

    const userTelegramId = telegramApp.initDataUnsafe.user?.id;
    const userTelegramName = telegramApp.initDataUnsafe.user?.username;

    if (!userTelegramId || !userTelegramName) {
        console.error("Failed to fetch Telegram user data.");
        return;
    }

    uiElements.userTelegramIdDisplay.innerText = `ID: ${userTelegramId}`;
    uiElements.userTelegramNameDisplay.innerText = `Username: ${userTelegramName}`;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userTelegramId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user data from Supabase:', error);
            return;
        }

        if (data) {
            gameState = { ...gameState, ...data };
            updateUI();
        } else {
            await registerNewUser(userTelegramId, userTelegramName);
        }
    } catch (err) {
        console.error('Error while fetching user data:', err);
    }
}

// تسجيل مستخدم جديد
async function registerNewUser(userTelegramId, userTelegramName) {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{ telegram_id: userTelegramId, username: userTelegramName, balance: 0 }]);

        if (error) {
            console.error('Error registering new user:', error);
            return;
        }

        gameState = { telegram_id: userTelegramId, username: userTelegramName, balance: 0 };
        updateUI();
    } catch (err) {
        console.error('Unexpected error while registering new user:', err);
    }
}

// تحديث واجهة المستخدم
function updateUI() {
    uiElements.scoreDisplay.innerText = `Balance : ${gameState.balance}`;
}

// تحديث الرصيد
async function updateGameState() {
    const userId = uiElements.userTelegramIdDisplay.innerText.split(":")[1].trim();

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: gameState.balance })
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
            uiElements.timerDisplay.innerText = `Time : ${timeLeft}`;
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
    const randomType = Math.random();

    if (randomType < 0.8) {
        fallingItem.classList.add('fallingItem');
    } else if (randomType < 0.9) {
        fallingItem.classList.add('freezeItem');
        fallingItem.style.backgroundImage = `url(${freezeImage})`;
    } else {
        fallingItem.classList.add('bombItem');
        fallingItem.style.backgroundImage = `url(${bombImage})`;
    }

    fallingItem.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    fallingItem.style.top = `-50px`;
    document.body.appendChild(fallingItem);

    let fallingSpeed = 2;
    let fallingItemInterval = setInterval(() => {
        if (!gameOver && !isFrozen) {
            fallingItem.style.top = `${fallingItem.offsetTop + fallingSpeed}px`;

            if (fallingItem.offsetTop > window.innerHeight - 60) {
                if (!fallingItem.classList.contains('freezeItem') && !fallingItem.classList.contains('bombItem')) {
                    missedCount++;
                    updateMissedCount();
                }
                document.body.removeChild(fallingItem);

                if (missedCount >= 10) {
                    gameOver = true;
                    clearInterval(fallingItemInterval);
                    showRetryButton();
                }
            }
        }
    }, 10);

    fallingItem.addEventListener('click', () => {
        if (fallingItem.classList.contains('freezeItem')) {
            activateFreeze();
        } else if (fallingItem.classList.contains('bombItem')) {
            triggerBomb();
        } else {
            fallingItem.classList.add('dead');
            setTimeout(() => {
                document.body.removeChild(fallingItem);
            }, 500);
            score++;
            updateScore();
        }
    });
}

// تفعيل التجميد
function activateFreeze() {
    isFrozen = true;
    document.body.classList.add('frozen');
    setTimeout(() => {
        isFrozen = false;
        document.body.classList.remove('frozen');
    }, 5000);
}

// تفعيل القنبلة
function triggerBomb() {
    gameOver = true;
    alert('You clicked a bomb! Game Over.');
    resetGame();
}

// تحديث النقاط
function updateScore() {
    gameState.balance = score;
    updateUI();
}

// تحديث المحاولات الضائعة
function updateMissedCount() {
    uiElements.missedCountDisplay.innerText = `Loss : ${missedCount}/10`;
}

// إظهار زر المحاولة مجددًا
function showRetryButton() {
    uiElements.retryButton.style.display = 'block';
}

uiElements.retryButton.addEventListener('click', () => {
    resetGame();
});

// إعادة ضبط اللعبة
function resetGame() {
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    updateScore();
    updateMissedCount();
    uiElements.retryButton.style.display = 'none';
    startGame();
}

// بدء اللعبة
window.onload = async function () {
    await fetchUserDataFromTelegram();
    startGame();
};
