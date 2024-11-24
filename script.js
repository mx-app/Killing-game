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
    balanceDisplay: document.getElementById('balance'),
    missedCountDisplay: document.getElementById('missedCount'),
    timerDisplay: document.getElementById('timer'),
    retryButton: document.getElementById('retryButton'),
    gameArea: document.getElementById('gameArea'),
};

// متغيرات اللعبة
let score = 0;
let missedCount = 0;
let timeLeft = 60;
let gameOver = false;
let freezeUses = 0; // عدد مرات استخدام التجميد
let isFrozen = false; // حالة التجميد
let gameInterval;
let fallingInterval;

// تعريف حالة اللعبة
let gameState = {
    balance: 0, // رصيد المستخدم
};

// جلب بيانات المستخدم من Telegram
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
            gameState = { ...gameState, ...data }; // تحديث gameState
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
    uiElements.scoreDisplay.innerText = `Score: ${score}`;
    uiElements.balanceDisplay.innerText = `Balance: ${gameState.balance}`;
    uiElements.missedCountDisplay.innerText = `Missed: ${missedCount}/10`;
    uiElements.timerDisplay.innerText = `Time: ${timeLeft}`;
}

// بدء اللعبة
function startGame() {
    gameOver = false;
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    freezeUses = 2;
    isFrozen = false;
    updateUI();

    // عداد الوقت
    gameInterval = setInterval(() => {
        if (!gameOver) {
            timeLeft--;
            updateUI();
            if (timeLeft <= 0) endGame(true);
        }
    }, 1000);

    // إنشاء العناصر المتساقطة
    fallingInterval = setInterval(() => {
        if (!gameOver) createRandomItem();
    }, 1000);
}

// إنهاء اللعبة
function endGame(isWin) {
    gameOver = true;
    clearInterval(gameInterval);
    clearInterval(fallingInterval);

    if (isWin) {
        gameState.balance += score; // إضافة الرصيد المؤقت إلى الرصيد الحقيقي
        updateGameState();
        displayEffect('win');
    } else {
        displayEffect('lose');
    }

    uiElements.retryButton.style.display = 'block';
}

// تحديث بيانات المستخدم بعد الفوز
async function updateGameState() {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ balance: gameState.balance })
            .eq('telegram_id', gameState.telegram_id);

        if (error) {
            console.error('Error updating game state in Supabase:', error.message);
        }
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
    }
}

// إنشاء العناصر
function createRandomItem() {
    const type = Math.random();
    if (type < 0.1 && freezeUses > 0) createFreezeItem();
    else if (type < 0.2) createBombItem();
    else createFallingItem();
}

// إنشاء عنصر التجميد
function createFreezeItem() {
    createItem('freezeItem', () => {
        freezeUses--;
        isFrozen = true;
        displayEffect('freeze');
        setTimeout(() => (isFrozen = false), 5000);
    });
}

// إنشاء عنصر القنبلة
function createBombItem() {
    createItem('bombItem', () => {
        missedCount--; // تفادي القنبلة لا يحسب
        updateUI();
    });
}

// إنشاء عنصر العملة
function createFallingItem() {
    createItem('fallingItem', () => {
        if (!isFrozen) score++;
        updateUI();
    });
}

// إنشاء عنصر في اللعبة
function createItem(className, onClick) {
    const item = document.createElement('div');
    item.classList.add(className);
    item.style.left = `${Math.random() * (uiElements.gameArea.offsetWidth - 50)}px`;
    item.style.top = '0px';
    uiElements.gameArea.appendChild(item);

    let fallingInterval = setInterval(() => {
        if (!gameOver && !isFrozen) {
            item.style.top = `${item.offsetTop + 5}px`;

            if (item.offsetTop > uiElements.gameArea.offsetHeight - 50) {
                uiElements.gameArea.removeChild(item);
                clearInterval(fallingInterval);
                if (className === 'fallingItem') missedCount++;
                updateUI();
                if (missedCount >= 10) endGame(false);
            }
        }
    }, 30);

    item.addEventListener('click', () => {
        if (!gameOver) {
            onClick();
            uiElements.gameArea.removeChild(item);
            clearInterval(fallingInterval);
        }
    });
}

// عرض التأثيرات
function displayEffect(effectType) {
    const effect = document.createElement('div');
    effect.className = `effect-${effectType}`;
    uiElements.gameArea.appendChild(effect);

    setTimeout(() => {
        uiElements.gameArea.removeChild(effect);
    }, 1000);
}

// إعادة تشغيل اللعبة
uiElements.retryButton.addEventListener('click', () => {
    uiElements.retryButton.style.display = 'none';
    startGame();
});

// بدء اللعبة عند تحميل الصفحة
window.onload = async function () {
    await fetchUserDataFromTelegram();
    startGame();
};


