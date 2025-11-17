// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section'); 

// 全局變數 (不變)
let QUESTION_FIELD = '';
let ANSWER_FIELD = '';
let BACK_CARD_FIELDS = [];
let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; 
let touchStartX = 0;
let touchStartY = 0;

// 輔助函式：正規化字串 (不變)
function normalizeString(str) {
    if (typeof str !== 'string') str = String(str);
    if (!str) return "";
    return str.replace(/・/g, '').replace(/\./g, '').replace(/\s/g, '');
}

// --- 2. 非同步讀取 (不變) ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        currentMode = params.get('mode') || 'review'; 

        if (!listName) {
            cardFront.textContent = '錯誤：未指定單字庫';
            return;
        }

        const configResponse = await fetch('config.json?v=' + new Date().getTime());
        if (!configResponse.ok) { throw new Error('無法讀取 config.json'); }
        const config = await configResponse.json();

        const listConfig = config.lists.find(list => list.id === listName);
        if (!listConfig) { throw new Error(`在 config.json 中找不到 ID 為 ${listName} 的設定`); }

        if (currentMode === 'review') {
            if (!listConfig.review || !listConfig.review.enabled) { throw new Error('此單字庫的「翻卡複習」模式未啟用'); }
            QUESTION_FIELD = listConfig.review.q_field || 'kanji';
            ANSWER_FIELD = ''; 
            BACK_CARD_FIELDS = listConfig.review.back_fields || [];
        } else if (currentMode === 'quiz') {
            if (!listConfig.quiz || !listConfig.quiz.enabled) { throw new Error('此單字庫的「輸入測驗」模式未啟用'); }
            QUESTION_FIELD = listConfig.quiz.q_field || 'kanji';
            ANSWER_FIELD = listConfig.quiz.a_field || 'hiragana';
            BACK_CARD_FIELDS = listConfig.quiz.back_fields || [];
        }

        const filePath = `words/${listName}.json?v=${new Date().getTime()}`;
        const response = await fetch(filePath); 
        if (!response.ok) { throw new Error(`無法讀取 ${listName}.json 檔案`); }
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

// --- 3. ⭐️ 設置主要功能 (已修改) ⭐️ ---
function setupApp() {
    // 綁定點擊事件
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    // 綁定滑動手勢 (不變)
    const cardContainer = document.querySelector('.flashcard-container');
    if (cardContainer) {
        cardContainer.addEventListener('touchstart', handleTouchStart, false);
        cardContainer.addEventListener('touchmove', handleTouchMove, false);
        cardContainer.addEventListener('touchend', handleTouchEnd, false);
    }
    
    // ⭐️ 關鍵：新增「全局 Enter 鍵」監聽
    // 我們不再只監聽 input，而是監聽整個頁面
    document.addEventListener('keydown', handleGlobalKey);
    
    // 根據模式決定 UI (不變)
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block'; 
        // ⭐️ (移除 answerInput.addEventListener)
        const answerLabelData = BACK_CARD_FIELDS.find(f => f.key === ANSWER_FIELD);
        const answerLabel = answerLabelData ? answerLabelData.label : "答案";
        answerInput.placeholder = `請輸入 ${answerLabel}`;
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    loadNextCard();
}

// --- 4. ⭐️ 顯示新卡片 (已修改) ⭐️ ---
async function loadNextCard() {
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) { currentCardIndex = 0; }
    else {
        do { currentCardIndex = Math.floor(Math.random() * vocabulary.length); }
        while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    if (!card) return; 

    cardFront.textContent = card[QUESTION_FIELD] || "";
    currentCorrectAnswer = card[ANSWER_FIELD] || "";

    let backHtml = '';
    for (const field of BACK_CARD_FIELDS) {
        const value = card[field.key];
        
        if (value !== undefined && value !== null && value !== "") {
            const isAnswer = (currentMode === 'quiz' && field.key === ANSWER_FIELD);
            const valueClass = isAnswer ? "back-value answer" : "back-value";
            
            backHtml += `
                <div class="back-item">
                    <span class="back-label">${field.label}:</span>
                    <span class="${valueClass}">${value}</span>
                </div>
            `;
        }
    }
    cardBack.innerHTML = backHtml;
    
    // ⭐️ 關鍵：重設兩種模式的按鈕文字
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; // 測驗模式永遠從「檢查答案」開始
        if (answerInput) answerInput.focus(); 
    } else {
        nextButton.textContent = "顯示答案"; // ⭐️ 複習模式永遠從「顯示答案」開始
    }
}

// --- 5. 檢查答案 (不變) ---
// (此函式在答對時會自動將按鈕設為 "下一張")
function checkAnswer() {
    const userInputRaw = answerInput.value.trim();
    if (!userInputRaw) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
        return;
    }

    const normalizedInput = normalizeString(userInputRaw);
    const normalizedAnswer = normalizeString(currentCorrectAnswer);

    if (normalizedInput === normalizedAnswer) {
        answerInput.classList.add('correct');
        answerInput.classList.remove('incorrect');
        answerInput.disabled = true; 
        nextButton.textContent = "下一張"; // ⭐️ 答對時變 "下一張"
        answerInput.value = currentCorrectAnswer; 
        flipCard(); 
    } else {
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 6. ⭐️ 處理按鈕點擊 (已重寫) ⭐️ ---
function handleButtonPress() {
    const buttonState = nextButton.textContent;

    if (currentMode === 'quiz') {
        // --- 測驗模式 ---
        if (buttonState === "檢查答案") {
            checkAnswer();
        } else { // (buttonState === "下一張")
            loadNextCard();
        }
    } else {
        // --- 複習模式 ---
        if (buttonState === "顯示答案") {
            flipCard();
            nextButton.textContent = "下一張"; // ⭐️ 翻面後，按鈕變 "下一張"
        } else { // (buttonState === "下一張")
            loadNextCard(); // ⭐️ 載入新卡 (loadNextCard 會自動把按鈕改回 "顯示答案")
        }
    }
}

// --- 7. ⭐️ 處理 Enter 鍵 (已重寫) ⭐️ ---
// (舊的 handleEnterKey 已被刪除)
function handleGlobalKey(event) {
    // 1. 只有 "Enter" 鍵才觸發
    if (event.key !== 'Enter') return;
    
    // 2. 阻止 Enter 鍵的預設行為 (例如點擊到按鈕造成重複觸發)
    event.preventDefault();
    
    // 3. ⭐️ 統一呼叫 handleButtonPress()
    // handleButtonPress() 函式會根據 "currentMode" 和 "按鈕文字" 
    // 來決定該做什麼事，完美符合您的需求。
    handleButtonPress();
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
