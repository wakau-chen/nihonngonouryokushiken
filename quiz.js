// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section'); 

// 這些將從 config.json 動態載入
let QUESTION_FIELD = '';
let ANSWER_FIELD = '';
let BACK_CARD_FIELDS = [];

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; 
let touchStartX = 0;
let touchStartY = 0;

// 輔助函式：正規化字串 (移除 ・. 和空白)
function normalizeString(str) {
    if (typeof str !== 'string') str = String(str);
    if (!str) return "";
    return str
        .replace(/・/g, '') // 移除 日文中間點
        .replace(/\./g, '') // 移除 英文句點
        .replace(/\s/g, ''); // 移除 所有空白
}

// --- 2. ⭐️ 非同步讀取 (已重寫) ⭐️ ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        currentMode = params.get('mode') || 'review'; 

        if (!listName) {
            cardFront.textContent = '錯誤：未指定單字庫';
            return;
        }

        // 1. 抓取 config.json
        const configResponse = await fetch('config.json?v=' + new Date().getTime());
        if (!configResponse.ok) {
            throw new Error('無法讀取 config.json');
        }
        const config = await configResponse.json();

        // 2. 找到這個單字庫的「專屬設定」
        const listConfig = config.lists.find(list => list.id === listName);
        if (!listConfig) {
            throw new Error(`在 config.json 中找不到 ID 為 ${listName} 的設定`);
        }

        // 3. ⭐️ 根據 currentMode 載入「獨立」的設定
        if (currentMode === 'review') {
            if (!listConfig.review || !listConfig.review.enabled) {
                throw new Error('此單字庫的「翻卡複習」模式未啟用');
            }
            // 載入 "review" 專用的設定
            QUESTION_FIELD = listConfig.review.q_field || 'kanji';
            ANSWER_FIELD = ''; // 複習模式沒有 "主要答案"
            BACK_CARD_FIELDS = listConfig.review.back_fields || [];

        } else if (currentMode === 'quiz') {
            if (!listConfig.quiz || !listConfig.quiz.enabled) {
                throw new Error('此單字庫的「輸入測驗」模式未啟用');
            }
            // 載入 "quiz" 專用的設定
            QUESTION_FIELD = listConfig.quiz.q_field || 'kanji';
            ANSWER_FIELD = listConfig.quiz.a_field || 'hiragana';
            BACK_CARD_FIELDS = listConfig.quiz.back_fields || [];
        }

        // 4. 抓取對應的單字庫檔案
        const filePath = `words/${listName}.json?v=${new Date().getTime()}`;
        const response = await fetch(filePath); 
        if (!response.ok) {
            throw new Error(`無法讀取 ${listName}.json 檔案`);
        }
        vocabulary = await response.json(); 
        
        // 5. 啟動 App
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
// (這個函式以下的 *所有* 程式碼都不需要修改，
// 因為它們都依賴我們在上面第 3 步動態設定好的
// QUESTION_FIELD, ANSWER_FIELD, BACK_CARD_FIELDS)

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
        
        // (更新 placeholder)
        const answerLabelData = BACK_CARD_FIELDS.find(f => f.key === ANSWER_FIELD);
        const answerLabel = answerLabelData ? answerLabelData.label : "答案";
        answerInput.placeholder = `請輸入 ${answerLabel}`;
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    loadNextCard();
}

// --- 4. 顯示新卡片 (不變) ---
async function loadNextCard() {
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) {
        currentCardIndex = 0;
    } else {
        do {
            currentCardIndex = Math.floor(Math.random() * vocabulary.length);
        } while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    if (!card) return; 

    cardFront.textContent = card[QUESTION_FIELD] || "";
    currentCorrectAnswer = card[ANSWER_FIELD] || "";

    let backHtml = '';
    for (const field of BACK_CARD_FIELDS) {
        const value = card[field.key];
        
        if (value !== undefined && value !== null && value !== "") {
            // 在 "quiz" 模式下，才需要突顯答案
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

// --- 5. 檢查答案 (不變) ---
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
        nextButton.textContent = "下一張"; 
        answerInput.value = currentCorrectAnswer; 
        flipCard(); 
    } else {
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
