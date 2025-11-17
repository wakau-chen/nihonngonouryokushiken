// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section'); 

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; 

// 滑動偵測變數
let touchStartX = 0;
let touchStartY = 0;

// --- 1. 非同步讀取 JSON 檔案 (不變) ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        currentMode = params.get('mode') || 'review'; 

        if (!listName) {
            cardFront.textContent = '錯誤：未指定單字庫';
            return;
        }

        const filePath = `words/${listName}.json?v=${new Date().getTime()}`;
        const response = await fetch(filePath); 
        if (!response.ok) {
            throw new Error(`無法讀取 ${listName}.json 檔案`);
        }
        vocabulary = await response.json(); 
        
        if (vocabulary.length > 0) {
            setupApp();
        } else {
            cardFront.textContent = '單字庫為空！';
        }
    } catch (error) {
        console.error('加載單字庫失敗:', error);
        cardFront.textContent = `加載失敗 (${error.message})`;
    }
}
// ---------------------------------

// --- 2. 設置主要功能 (修改) ---
function setupApp() {
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    // 綁定滑動手勢
    const cardContainer = document.querySelector('.flashcard-container');
    if (cardContainer) {
        cardContainer.addEventListener('touchstart', handleTouchStart, false);
        cardContainer.addEventListener('touchmove', handleTouchMove, false);
        cardContainer.addEventListener('touchend', handleTouchEnd, false);
    }
    
    // 根據模式決定 UI
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block'; 
        answerInput.addEventListener('keypress', handleEnterKey);
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    // ⭐️ 注意： loadNextCard() 現在是 async，但 setupApp 
    // 不需要 'await' 它，讓它在背景載入即可。
    loadNextCard();
}

// --- 3. 顯示新卡片 (⭐️ 這是修改的重點 ⭐️) ---
// 1. 函式必須宣告為 "async"
async function loadNextCard() {
    
    // 2. 檢查卡片是否已經是翻開的
    if (flashcard.classList.contains('is-flipped')) {
        // 如果是，先命令它翻回去
        flashcard.classList.remove('is-flipped');
        
        // 3. 關鍵：等待 0.6 秒 (600ms) 讓動畫跑完
        // (我們用 610ms 確保動畫 100% 結束)
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    // 4. 到了這裡，卡片 100% 是在正面，
    //    現在我們可以"安全地"更新內容了。
    
    // (原有的抽卡邏輯)
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) {
        currentCardIndex = 0;
    } else {
        do {
            currentCardIndex = Math.floor(Math.random() * vocabulary.length);
        } while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    
    // (原有的更新內容邏輯)
    cardFront.textContent = card.front;
    
    const backString = card.back || ""; 
    const parts = backString.split('|');
    currentCorrectAnswer = parts[1] ? parts[1].trim() : (parts[0] ? parts[0].trim() : "");
    
    let pronunciationHtml = '';
    if (parts[1]) { 
        pronunciationHtml += parts[1];
    }
    if (parts[2] || parts[2] === 0) { 
        pronunciationHtml += ` <span class="pitch-accent-number">(${parts[2]})</span>`;
    }
    
    let backHtml = '';
    if (pronunciationHtml) {
        backHtml += `<div class="back-pronunciation">${pronunciationHtml}</div>`;
    }
    if (parts[0]) { 
        backHtml += `<div class="back-definition">${parts[0]}</div>`;
    }
    if (parts[3]) { 
        backHtml += `<div class="back-type">${parts[3]}</div>`;
    }
    cardBack.innerHTML = backHtml;
    
    // 5. 重設 UI (注意：.remove('is-flipped') 已在函式最上方)
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        if (answerInput) answerInput.focus(); 
    } else {
        nextButton.textContent = "下一張"; 
    }
}

// --- 4. 檢查答案 (不變) ---
function checkAnswer() {
    const userInput = answerInput.value.trim();
    if (!userInput) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
        return;
    }

    if (userInput === currentCorrectAnswer) {
        answerInput.classList.add('correct');
        answerInput.classList.remove('incorrect');
        answerInput.disabled = true; 
        nextButton.textContent = "下一張"; 
        flipCard(); 
    } else {
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 5. 處理按鈕點擊 (不變) ---
function handleButtonPress() {
    // JS 會自動處理 async 函式，
    // 這裡不需要做任何改變
    if (currentMode === 'quiz') {
        const buttonState = nextButton.textContent;
        if (buttonState === "檢查答案") {
            checkAnswer();
        } else { 
            loadNextCard();
        }
    } else {
        loadNextCard();
    }
}

// --- 6. 處理 Enter 鍵 (不變) ---
function handleEnterKey(event) {
    if (currentMode === 'quiz' && event.key === 'Enter') {
        event.preventDefault();
        handleButtonPress();
    }
}

// --- 7. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 8. 滑動手勢處理 (不變) ---

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}

function handleTouchMove(event) {
    let diffX = Math.abs(event.changedTouches[0].screenX - touchStartX);
    let diffY = Math.abs(event.changedTouches[0].screenY - touchStartY);

    if (diffX > diffY) {
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    let touchEndX = event.changedTouches[0].screenX;
    let touchEndY = event.changedTouches[0].screenY;

    let swipeDistanceX = touchStartX - touchEndX; 
    let swipeDistanceY = touchStartY - touchEndY; 
    
    const minSwipeThreshold = 50; 

    if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY) && Math.abs(swipeDistanceX) > minSwipeThreshold) {
        if (swipeDistanceX > 0) {
            triggerNextCardAction(); // 向左滑
        } else {
            // (向右滑)
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
}

// (滑動的安全檢查)
function triggerNextCardAction() {
    if (currentMode === 'review' || (currentMode === 'quiz' && nextButton.textContent === "下一張")) {
        // 這裡也不需要 'await'，
        // 讓 loadNextCard 自己去執行異步操作
        loadNextCard();
    }
}

// --- 啟動程式 ---
loadVocabulary();
