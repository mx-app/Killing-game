import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './i/Scripts/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const uiElements = {
    userTelegramIdDisplay: document.getElementById('userTelegramId'),
    userTelegramNameDisplay: document.getElementById('userTelegramName'),
    scoreDisplay: document.getElementById('score'),
    balanceDisplay: document.getElementById('balance'),
    missedCountDisplay: document.getElementById('missedCount'),
    timerDisplay: document.getElementById('timer'),
    retryButton: document.getElementById('retryButton'),
    effectsContainer: document.getElementById('effectsContainer'), // للتأثيرات
};

let score = 0;
let missedCount = 0;
let timeLeft = 60;
let freezeUses = 0;
let isFrozen = false;
let gameOver = false;
let gameInterval, fallingInterval;

let gameState = {
    balance: 0,
};

async function fetchUserDataFromTelegram() {
    const telegramApp = window.Telegram.WebApp;
    telegramApp.ready();

    const userTelegramId = telegramApp.initDataUnsafe.user?.id;
    const userTelegramName = telegramApp.initDataUnsafe.user?.username;

    uiElements.userTelegramIdDisplay.innerText = `ID: ${userTelegramId}`;
    uiElements.userTelegramNameDisplay.innerText = `Username: ${userTelegramName}`;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userTelegramId)
        .maybeSingle();

    if (data) {
        gameState = { ...gameState, ...data };
        updateUI();
    } else {
        await supabase.from('users').insert([{ telegram_id: userTelegramId, username: userTelegramName, balance: 0 }]);
        gameState = { telegram_id: userTelegramId, username: userTelegramName, balance: 0 };
        updateUI();
    }
}

function updateUI() {
    uiElements.scoreDisplay.innerText = `Score: ${score}`;
    uiElements.balanceDisplay.innerText = `Balance: ${gameState.balance}`;
    uiElements.missedCountDisplay.innerText = `Missed: ${missedCount}`;
    uiElements.timerDisplay.innerText = `Time: ${timeLeft}`;
}

function startGame() {
    gameOver = false;
    score = 0;
    missedCount = 0;
    timeLeft = 60;
    freezeUses = 4;
    updateUI();

    gameInterval = setInterval(() => {
        timeLeft--;
        updateUI();
        if (timeLeft <= 0) endGame(true);
    }, 1000);

    fallingInterval = setInterval(createRandomItem, 800);
}

function endGame(isWin) {
    gameOver = true;
    clearInterval(gameInterval);
    clearInterval(fallingInterval);

    if (isWin) {
        gameState.balance += score;
        supabase
            .from('users')
            .update({ balance: gameState.balance })
            .eq('telegram_id', gameState.telegram_id);
        showEffect('win');
    } else {
        showEffect('lose');
    }

    uiElements.retryButton.style.display = 'block';
}

function createRandomItem() {
    const type = Math.random();
    if (type < 0.1 && freezeUses > 0) createFreezeItem();
    else if (type < 0.2) createBombItem();
    else createCoinItem();
}

function createCoinItem() {
    createItem('coin', () => {
        score++;
        updateUI();
    });
}

function createBombItem() {
    createItem('bomb', () => {
        endGame(false);
    });
}

function createFreezeItem() {
    createItem('freeze', () => {
        freezeUses--;
        isFrozen = true;
        showEffect('freeze');
        setTimeout(() => (isFrozen = false), 5000);
    });
}

function createItem(type, onClick) {
    const item = document.createElement('div');
    item.classList.add(type);
    item.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    item.style.top = '-50px';
    document.body.appendChild(item);

    const falling = setInterval(() => {
        if (gameOver || isFrozen) return;

        item.style.top = `${item.offsetTop + 5}px`;

        if (item.offsetTop > window.innerHeight) {
            document.body.removeChild(item);
            clearInterval(falling);

            if (type !== 'bomb') missedCount++;
            updateUI();

            if (missedCount >= 10) endGame(false);
        }
    }, 30);

    item.addEventListener('click', () => {
        document.body.removeChild(item);
        clearInterval(falling);
        onClick();
    });
}

function showEffect(effectType) {
    const effect = document.createElement('div');
    effect.classList.add('effect', effectType);
    uiElements.effectsContainer.appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 1000);
}

uiElements.retryButton.addEventListener('click', () => {
    uiElements.retryButton.style.display = 'none';
    startGame();
});

window.onload = async function () {
    await fetchUserDataFromTelegram();
    startGame();
};

