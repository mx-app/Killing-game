import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './i/Scripts/config.js';

// إنشاء عميل Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// تعريف عناصر واجهة المستخدم
const uiElements = {
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    scoreDisplay: document.getElementById('score'),
    timerDisplay: document.getElementById('timer'),
    retryButton: document.getElementById('retryButton'),
    loadingScreen: document.getElementById('loadingScreen'),
};

// متغيرات اللعبة
let score = 0;
let timeLeft = 10;
let gameOver = false;
let freezeUses = 2; // عدد مرات استخدام التجميد
let isFrozen = false; // حالة التجميد
let gameInterval;
let fallingInterval;
let itemSpacing = 50; // المسافة بين العناصر المتساقطة
let fallingItems = []; // العناصر المتساقطة

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

// تحديث واجهة المستخدم
function updateUI() {
    uiElements.scoreDisplay.innerText = `Score: ${gameState.balance}`;
}

// إعداد القنابل والتجميد
function setupGameItems() {
    // إعداد العناصر المتساقطة
    fallingInterval = setInterval(() => {
        if (!isFrozen) {
            const fallingItem = createFallingItem();
            document.getElementById('gameArea').appendChild(fallingItem);
            fallingItems.push(fallingItem);
        }
    }, 1500); // كل 1.5 ثانية يظهر عنصر جديد

    // إعداد القنابل
    const bombItems = document.querySelectorAll('.bombItem');
    bombItems.forEach(item => {
        item.addEventListener('click', () => {
            triggerBomb();
        });
    });

    // إعداد التجميد
    const freezeItems = document.querySelectorAll('.FreezeItem');
    freezeItems.forEach(item => {
        item.addEventListener('click', () => {
            triggerFreeze();
        });
    });
}

// إنشاء العناصر المتساقطة
function createFallingItem() {
    const fallingItem = document.createElement('div');
    fallingItem.classList.add('fallingItem');
    fallingItem.style.left = `${Math.random() * 100}%`;
    fallingItem.style.top = `-50px`; // يبدأ فوق الشاشة

    fallingItem.addEventListener('click', () => {
        collectItem(fallingItem);
    });

    return fallingItem;
}

// جمع العنصر المتساقط
function collectItem(item) {
    score += 10; // إضافة نقاط عند جمع العنصر
    gameState.balance += 10; // إضافة النقاط لرصيد اللعبة
    item.classList.add('dead'); // إضافة تأثير الموت للعنصر
    updateUI();
    setTimeout(() => {
        item.remove(); // إزالة العنصر بعد تأثير الموت
    }, 500);
}

// تفعيل القنبلة
function triggerBomb() {
    if (confirm('Are you sure you want to trigger the bomb? This will reset your game!')) {
        score = 0;
        gameState.balance = 0;
        updateUI();
        resetGame();
        displayEffect('lose');
    }
}

// تفعيل التجميد
function triggerFreeze() {
    if (freezeUses > 0 && !isFrozen) {
        isFrozen = true;
        freezeUses -= 1;
        displayEffect('freeze');
        setTimeout(() => {
            isFrozen = false; // إلغاء التجميد بعد 5 ثوانٍ
            removeFreezeEffect();
        }, 5000);
    }
}

// عرض تأثيرات (Win, Lose, Freeze)
function displayEffect(type) {
    const effect = document.createElement('div');
    effect.classList.add('effect', type);
    document.body.appendChild(effect);
    setTimeout(() => {
        effect.remove();
    }, 1500); // بعد 1.5 ثانية يختفي التأثير
}

// إزالة تأثير التجميد
function removeFreezeEffect() {
    const freezeItems = document.querySelectorAll('.FreezeItem');
    freezeItems.forEach(item => {
        item.style.opacity = '1'; // إعادة ظهور العناصر المجمدة
    });
}

// إعادة تعيين اللعبة
function resetGame() {
    gameOver = true;
    clearInterval(fallingInterval);
    document.querySelectorAll('.fallingItem').forEach(item => {
        item.remove();
    });
    setTimeout(() => {
        gameOver = false;
        score = 0;
        gameState.balance = 0;
        updateUI();
        setupGameItems(); // إعادة تشغيل اللعبة
    }, 2000); // إعادة تشغيل اللعبة بعد تأخير بسيط
}

// التحديث المستمر للعداد
function updateTimer() {
    if (!gameOver && !isFrozen) {
        timeLeft -= 1;
        uiElements.timerDisplay.innerText = `Time Left: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(gameInterval);
            displayEffect('lose');
            resetGame();
        }
    }
}

// بدء اللعبة
function startGame() {
    gameInterval = setInterval(updateTimer, 1000); // تحديث العداد كل ثانية
    setupGameItems();
}

// بدء اللعبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    fetchUserDataFromTelegram();
    startGame();
});
