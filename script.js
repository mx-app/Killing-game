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
};

// متغيرات اللعبة
let score = 0;
let timeLeft = 60;
let gameOver = false;
let freezeUses = 2; // عدد مرات استخدام التجميد
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
    uiElements.scoreDisplay.innerText = `${gameState.balance}`;
    uiElements.timerDisplay.innerText = `00 : ${timeLeft}`;
}

// تحديث بيانات المستخدم في قاعدة البيانات
async function updateGameState() {
    try {
        const { error } = await supabase
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

//تحديث القاعده في الوقت الفعلي 
async function updateGameStateInDatabase(updatedData, supabase, uiElements) {
    const userId = uiElements.userTelegramIdDisplay.innerText;

    try {
        const { data, error } = await supabase
            .from('users')
            .update(updatedData) // البيانات الجديدة
            .eq('telegram_id', userId); // شرط التحديث

        if (error) {
            console.error('Error updating game state in Supabase:', error);
            return false;
        }

        console.log('Game state updated successfully in Supabase:', data);
        return true;
    } catch (err) {
        console.error('Unexpected error while updating game state:', err);
        return false;
    }
}



// بدء اللعبة
function startGame() {
    gameOver = false;
    score = 0;
    timeLeft = 60;
    freezeUses = 2;
    updateUI();

    // عداد الوقت
    gameInterval = setInterval(() => {
        if (!gameOver) {
            timeLeft--;
            uiElements.timerDisplay.innerText = `00 : ${timeLeft}`;
            if (timeLeft <= 0) {
                endGame(true); // فوز
            }
        }
    }, 1000);

    // العناصر المتساقطة
    fallingInterval = setInterval(() => {
        if (!gameOver) {
            createRandomItem();
        }
    }, 100000);
}

// إنهاء اللعبة
function endGame(isWin) {
    gameOver = true;
    clearInterval(gameInterval);
    clearInterval(fallingInterval);

    if (isWin) {
        gameState.balance += score;
        updateGameState();
        alert('Congratulations! You won!');
    } else {
        alert('Game Over! Try again.');
    }

    uiElements.retryButton.style.display = 'block';
}

// إنشاء عنصر عشوائي
function createRandomItem() {
    const type = Math.random();
    if (type < 0.1 && freezeUses > 0) createFreezeItem();
    else if (type < 0.2) createBombItem();
    else createFallingItem();
}

// إنشاء عنصر تجميد
function createFreezeItem() {
    createItem('freezeItem', () => {
        freezeUses--;
        isFrozen = true;
        setTimeout(() => (isFrozen = false), 3000);
    });
}

// إنشاء عنصر قنبلة
function createBombItem() {
    createItem('bombItem', () => {
        endGame(false);
    });
}

// إنشاء عنصر عادي
function createFallingItem() {
    createItem('fallingItem', () => {
        if (!isFrozen) score++;
        updateUI();
    });
}

// إنشاء عنصر في الواجهة
function createItem(className, onClick) {
    const item = document.createElement('div');
    item.classList.add(className);
    item.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    item.style.top = '-50px';
    document.body.appendChild(item);

    let falling = setInterval(() => {
        if (!gameOver && !isFrozen) {
            item.style.top = `${item.offsetTop + 5}px`;

            if (item.offsetTop > window.innerHeight - 50) {
                document.body.removeChild(item);
                clearInterval(falling);
                updateUI();
             }
        }
    }, 30);

    item.addEventListener('click', () => {
        if (!gameOver) {
            onClick();
            document.body.removeChild(item);
            clearInterval(falling);
        }
    });
}

// إعادة تشغيل اللعبة
uiElements.retryButton.addEventListener('click', () => {
    uiElements.retryButton.style.display = 'none';
    startGame();
});

// بدء اللعبة عند التحميل
window.onload = async function () {
    uiElements.retryButton.style.display = 'none';
    await fetchUserDataFromTelegram();
    startGame();
};

