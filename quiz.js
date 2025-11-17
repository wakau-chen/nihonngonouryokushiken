/* --- ⭐️ 1. 全局設定 (您要的「在程式中選擇」) ⭐️ --- */

// 選擇「題目」欄位 (會顯示在正面)
// (可選： 'kanji', 'hiragana', 'definition')
const QUESTION_FIELD = 'kanji';

// 選擇「主要答案」欄位 (用於 "輸入測驗" 模式的比對)
// (可選： 'kanji', 'hiragana', 'definition')
const ANSWER_FIELD = 'hiragana';

// 選擇「背面」要顯示哪些資訊 (答案 + 補充資訊)
// (您可以自由排序、新增、刪除。 label 是顯示的標籤, key 是 JSON 的欄位)
const BACK_CARD_FIELDS = [
    { label: "平假名", key: "hiragana" },
    { label: "音調", key: "pitch" },
    { label: "意思", key: "definition" },
    { label: "詞性", key: "type" },
    { label: "漢字", key: "kanji" }
];
/* --------------------------------------------------- */

// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section'); 

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; // 儲存 "主要答案" 
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
        // (更新 placeholder)
        const answerLabel = BACK_CARD_FIELDS.find(f => f.key === ANSWER_FIELD)?.label || "答案";
        answerInput.placeholder = `請輸入 ${answerLabel}`;
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    loadNextCard();
}

// --- 4. ⭐️ 顯示新卡片 (已重寫) ⭐️ ---
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
    if (!card) return; // 安全檢查

    // 1. ⭐️ 根據全局設定，設置「正面 (題目)」
    cardFront.textContent = card[QUESTION_FIELD] || "";
    
    // 2. ⭐️ 根據全局設定，設置「主要答案」
    currentCorrectAnswer = card[ANSWER_FIELD] || "";

    // 3. ⭐️ 根據全局設定，產生「背面 (答案+補充)」的 HTML
    let backHtml = '';
    for (const field of BACK_CARD_FIELDS) {
        const value = card[field.key];
        
        // 如果值存在 (且不為空)
        if (value !== undefined && value !== null && value !== "") {
            // 判斷這個欄位是不是「主要答案」，是的話給它一個特殊樣式
            const isAnswer = (field.key === ANSWER_FIELD);
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

// --- 5. ⭐️ 檢查答案 (已重寫) ⭐️ ---
function checkAnswer() {
    const userInputRaw = answerInput.value.trim();
    if (!userInputRaw) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
        return;
    }

    // 比較「正規化」後的答案
    const normalizedInput = normalizeString(userInputRaw);
    const normalizedAnswer = normalizeString(currentCorrectAnswer);

    if (normalizedInput === normalizedAnswer) {
        // --- 答對了 ---
        answerInput.classList.add('correct');
        answerInput.classList.remove('incorrect');
        answerInput.disabled = true; 
        nextButton.textContent = "下一張"; 
        
        // 答對時，在輸入框顯示「正確」的原始答案
        answerInput.value = currentCorrectAnswer; 
        
        flipCard(); // 自動翻開卡片
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
