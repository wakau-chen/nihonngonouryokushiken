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
let touchStartX = 0;
let touchStartY = 0;

// --- ⭐️ 1. 新增：正規化字串的輔助函式 ⭐️ ---
// 這個函式會移除所有用於比較的干擾字元
function normalizeString(str) {
    if (!str) return "";
    return str
        .replace(/・/g, '') // 移除 日文中間點 (・)
        .replace(/\./g, '') // 移除 英文句點 (.)
        .replace(/\s/g, ''); // 移除 所有空白 (包含全形/半形)
}
// ---------------------------------

// --- 2. 非同步讀取 JSON 檔案 (不變) ---
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

// --- 3. 設置主要功能 (不變) ---
function setupApp() {
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    const cardContainer = document.querySelector('.flashcard-container');
    if (cardContainer) {
        cardContainer.addEventListener('touchstart', handleTouchStart, false);
        cardContainer.addEventListener('touchmove', handleTouchMove, false);
        cardContainer.addEventListener('touchend', handleTouchEnd, false);
    }
    
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block'; 
        answerInput.addEventListener('keypress', handleEnterKey);
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    loadNextCard();
}

// --- 4. 顯示新卡片 (⭐️ 修改 ⭐️) ---
async function loadNextCard() {
    // (修復閃爍的邏輯 - 不變)
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    // (抽卡邏輯 - 不變)
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) {
        currentCardIndex = 0;
    } else {
        do {
            currentCardIndex = Math.floor(Math.random() * vocabulary.length);
        } while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    cardFront.textContent = card.front;
    
    const backString = card.back || ""; 
    const parts = backString.split('|');
    
    // ⭐️ 關鍵：儲存正確答案時，只 trim()，不正規化
    // 我們保留原始答案，正規化只在 "比較" 時才做
    currentCorrectAnswer = parts[1] ? parts[1].trim() : (parts[0] ? parts[0].trim() : "");
    
    // (組合 HTML 邏輯 - 不變)
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
    
    // (重設 UI 邏輯 - 不變)
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

// --- 5. 檢查答案 (⭐️ 這是修改的重點 ⭐️) ---
function checkAnswer() {
    // 1. 取得使用者輸入
    const userInputRaw = answerInput.value.trim();

    if (!userInputRaw) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
        return;
    }

    // 2. ⭐️ 比較「正規化」後的答案 ⭐️
    // "あいて" 會變成 "あいて"
    const normalizedInput = normalizeString(userInputRaw);
    // "あい・て" 也會變成 "あいて"
    const normalizedAnswer = normalizeString(currentCorrectAnswer);

    // 3. 比較
    if (normalizedInput === normalizedAnswer) {
        // --- 答對了 ---
        answerInput.classList.add('correct');
        answerInput.classList.remove('incorrect');
        answerInput.disabled = true; 
        nextButton.textContent = "下一張"; 
        
        // ⭐️ 答對時，在輸入框顯示「正確」的原始答案 (包含・)
        // 這樣使用者就知道這個字原來是有點的
        answerInput.value = currentCorrectAnswer; 
        
        flipCard(); 
    } else {
        // --- 答錯了 ---
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 6. 處理按鈕點擊 (不變) ---
function handleButtonPress() {
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

// --- 7. 處理 Enter 鍵 (不變) ---
function handleEnterKey(event) {
    if (currentMode === 'quiz' && event.key === 'Enter') {
        event.preventDefault();
        handleButtonPress();
    }
}

// --- 8. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 9. 滑動手勢處理 (不變) ---
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
            triggerNextCardAction(); 
        }
    }
    touchStartX = 0;
    touchStartY = 0;
}
function triggerNextCardAction() {
    if (currentMode === 'review' || (currentMode === 'quiz' && nextButton.textContent === "下一張")) {
        loadNextCard();
    }
}

// --- 啟動程式 ---
loadVocabulary();
