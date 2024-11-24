// استيراد مكتبة Supabase لإنشاء الاتصال بقاعدة البيانات
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './i/Scripts/config.js';

// إنشاء عميل Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تعريف عناصر واجهة المستخدم
const uiElements = {
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    scoreDisplay: document.getElementById('score'),
    missedCountDisplay: document.getElementById('missedCount'),
    timerDisplay: document.getElementById('timer'),
    retryButton: document.getElementById('retryButton'),
    loadingScreen: document.getElementById('loadingScreen'),
    freezeButton: document.getElementById('freezeButton'),
};

let score = 0;
let missedCount = 0;
let timeLeft = 60;
let freezeUses = 2;
let isFrozen = false;
let gameOver = false;
let gameInterval;
let fallingInterval;

// تعريف حالة اللعبة
let gameState = {
    balance: 0, // رصيد المستخدم
};

// جلب بيانات المستخدم من Telegram والتحقق في قاعدة البيانات
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
            gameState = { ...gameState, ...data }; // تحديث حالة اللعبة
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

        gameState = { telegram_id: userTelegramId, username: userTelegramName, balance: 0 }; // تحديث حالة اللعبة
        updateUI();
    } catch (err) {
        console.error('Unexpected error while registering new user:', err);
    }
}

// تحديث واجهة المستخدم
function updateUI() {
    uiElements.scoreDisplay.innerText = `Balance : ${gameState.balance}`;
    uiElements.freezeButton.innerText = `Freeze (${freezeUses})`;
}

// بدء اللعبة
function startGame() {
    uiElements.loadingScreen.style.display = 'none';

    gameOver = false;
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    freezeUses = 2;
    updateUI();
    uiElements.retryButton.style.display = 'none';

    gameInterval = setInterval(() => {
        if (!gameOver) {
            timeLeft--;
            uiElements.timerDisplay.innerText = `Time : ${timeLeft}`;
            if (timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);

    fallingInterval = setInterval(() => {
        if (!gameOver) {
            createRandomItem();
        }
    }, 1000);
}

// إنشاء عنصر عشوائي
function createRandomItem() {
    const type = Math.random();
    if (type < 0.1) createFreezeItem();
    else if (type < 0.2) createBombItem();
    else createFallingItem();
}

// إنشاء عنصر عادي
function createFallingItem() {
    createItem('fallingItem', () => {
        score++;
        updateScore();
    });
}

// إنشاء عنصر التجميد
function createFreezeItem() {
    createItem('freezeItem', () => {
        freezeUses++;
        updateUI();
    });
}

// إنشاء عنصر القنبلة
function createBombItem() {
    createItem('bombItem', () => {
        missedCount++;
        updateMissedCount();
        if (missedCount >= 10) endGame();
    });
}

// إنشاء عنصر وتحريكه
function createItem(className, onCatch) {
    const item = document.createElement('div');
    item.classList.add(className);
    item.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    item.style.top = `-50px`;
    document.body.appendChild(item);

    const interval = setInterval(() => {
        if (isFrozen || gameOver) return;

        item.style.top = `${parseInt(item.style.top) + 5}px`;

        if (parseInt(item.style.top) > window.innerHeight) {
            clearInterval(interval);
            document.body.removeChild(item);
            return;
        }

        item.addEventListener('click', () => {
            clearInterval(interval);
            document.body.removeChild(item);
            onCatch();
        });
    }, 50);
}

// استخدام خاصية التجميد
function useFreeze() {
    if (freezeUses > 0 && !isFrozen) {
        isFrozen = true;
        freezeUses--;
        updateUI();

        setTimeout(() => {
            isFrozen = false;
        }, 3000);
    }
}

// إنهاء اللعبة
function endGame() {
    clearInterval(gameInterval);
    clearInterval(fallingInterval);
    gameOver = true;
    updateGameState();
    alert("Game Over!");
    showRetryButton();
}

// تحديث بيانات المستخدم في قاعدة البيانات
async function updateGameState() {
    try {
        const userId = uiElements.userTelegramIdDisplay.innerText.split(":")[1].trim();

        const { error } = await supabase
            .from('users')
            .update({ balance: gameState.balance })
            .eq('telegram_id', userId);

        if (error) console.error('Error updating game state:', error);
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
    }
}

// تحديث الرصيد
function updateScore() {
    gameState.balance = score;
    updateUI();
}

// تحديث محاولات الخسارة
function updateMissedCount() {
    uiElements.missedCountDisplay.innerText = `Loss : ${missedCount}/10`;
}

// إظهار زر إعادة المحاولة
function showRetryButton() {
    uiElements.retryButton.style.display = 'block';
}

// إعداد الأحداث
uiElements.retryButton.addEventListener('click', resetGame);
uiElements.freezeButton.addEventListener('click', useFreeze);

// إعادة تعيين اللعبة
function resetGame() {
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    freezeUses = 2;
    isFrozen = false;
    updateUI();
    startGame();
}

// بدء اللعبة عند التحميل
window.onload = async function () {
    await fetchUserDataFromTelegram();
    startGame();
};

