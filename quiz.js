// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');

// ⭐️ 新增：獲取輸入框的 "區塊"
const quizInputArea = document.getElementById('quiz-input-section'); // HTML 裡要有這個 ID

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 

// ⭐️ 新增：儲存目前模式 ('review' 或 'quiz')
let currentMode = 'review'; // 預設為翻卡模式

// --- 1. 非同步讀取 JSON 檔案 (修改) ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        
        // ⭐️ 讀取 mode 參數
        currentMode = params.get('mode') || 'review'; // 如果沒有 mode 參數，預設為 'review'

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
    // 綁定通用事件
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    // ⭐️ 根據模式決定 UI
    if (currentMode === 'quiz') {
        // --- 測驗模式 ---
        // 顯示輸入框
        quizInputArea.style.display = 'block'; 
        // 綁定 Enter 鍵
        answerInput.addEventListener('keypress', handleEnterKey);
    } else {
        // --- 複習模式 ---
        // 隱藏輸入框
        quizInputArea.style.display = 'none'; 
    }
    
    // 載入第一張卡片
    loadNextCard();
}

// --- 3. 顯示新卡片 (修改) ---
function loadNextCard() {
    // 抽一張新卡 (邏輯不變)
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) {
        currentCardIndex = 0;
    } else {
        do {
            currentCardIndex = Math.floor(Math.random() * vocabulary.length);
        } while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    
    // 1. 處理卡片正面 (問題)
    cardFront.textContent = card.front;
    
    // 2. 處理卡片背面 (答案)
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
    
    // 3. ⭐️ 根據模式重設 UI
    flashcard.classList.remove('is-flipped'); // 共同：卡片蓋回正面
    
    if (currentMode === 'quiz') {
        // --- 測驗模式 UI 重設 ---
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        answerInput.focus(); 
    } else {
        // --- 複習模式 UI 重設 ---
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
        flipCard(); // 自動翻開卡片
    } else {
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 5. 處理按鈕點擊 (修改) ---
function handleButtonPress() {
    // ⭐️ 根據模式決定按鈕功能
    if (currentMode === 'quiz') {
        // --- 測驗模式 ---
        const buttonState = nextButton.textContent;
        if (buttonState === "檢查答案") {
            checkAnswer();
        } else { // (buttonState === "下一張")
            loadNextCard();
        }
    } else {
        // --- 複習模式 ---
        // 按鈕永遠是「下一張」
        loadNextCard();
    }
}

// --- 6. 處理 Enter 鍵 (修改) ---
function handleEnterKey(event) {
    // 只有在測驗模式下才監聽 Enter
    if (currentMode === 'quiz' && event.key === 'Enter') {
        event.preventDefault();
        handleButtonPress();
    }
}

// --- 7. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 啟動程式 ---
loadVocabulary();
