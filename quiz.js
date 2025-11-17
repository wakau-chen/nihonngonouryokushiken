// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');

// ⭐️ 獲取輸入框的 "區塊"
const quizInputArea = document.getElementById('quiz-input-section'); 

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; // 預設為翻卡模式

// --- 1. 非同步讀取 JSON 檔案 ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        
        // ⭐️ 讀取 mode 參數
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

// --- 2. 設置主要功能 ---
function setupApp() {
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    // ⭐️ 根據模式決定 UI
    if (currentMode === 'quiz') {
        // --- 測驗模式 ---
        if(quizInputArea) quizInputArea.style.display = 'block'; // 顯示輸入框
        answerInput.addEventListener('keypress', handleEnterKey);
    } else {
        // --- 複習模式 ---
        if(quizInputArea) quizInputArea.style.display = 'none'; // 隱藏輸入框
    }
    
    loadNextCard();
}

// --- 3. 顯示新卡片 ---
function loadNextCard() {
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
    
    // ⭐️ 根據模式重設 UI
    flashcard.classList.remove('is-flipped'); 
    
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        answerInput.focus(); 
    } else {
        nextButton.textContent = "下一張"; 
    }
}

// --- 4. 檢查答案 ---
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

// --- 5. 處理按鈕點擊 ---
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

// --- 6. 處理 Enter 鍵 ---
function handleEnterKey(event) {
    if (currentMode === 'quiz' && event.key === 'Enter') {
        event.preventDefault();
        handleButtonPress();
    }
}

// --- 7. 翻轉卡片 ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 啟動程式 ---
loadVocabulary();
