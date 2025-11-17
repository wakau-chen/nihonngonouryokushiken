// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section');
const mcqOptionsArea = document.getElementById('mcq-options-section');

// 全局變數
let QUESTION_FIELD = '';
let ANSWER_FIELD = '';
let BACK_CARD_FIELDS = [];
let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; 
let touchStartX = 0;
let touchStartY = 0;

// 輔助函式：正規化字串
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

        let modeConfig = {};
        if (currentMode === 'review' && listConfig.review) {
            modeConfig = listConfig.review;
            ANSWER_FIELD = ''; 
        } else if (currentMode === 'quiz' && listConfig.quiz) {
            modeConfig = listConfig.quiz;
            ANSWER_FIELD = modeConfig.a_field;
        } else if (currentMode === 'mcq' && listConfig.mcq) { 
            modeConfig = listConfig.mcq;
            ANSWER_FIELD = modeConfig.a_field;
        } else {
            throw new Error(`在 config.json 中找不到 ${listName} 的 ${currentMode} 設定`);
        }

        QUESTION_FIELD = modeConfig.q_field;
        BACK_CARD_FIELDS = modeConfig.back_fields || [];
        
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
    
    document.addEventListener('keydown', handleGlobalKey);
    
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'none';
        
        const answerLabelData = BACK_CARD_FIELDS.find(f => f.key === ANSWER_FIELD);
        const answerLabel = answerLabelData ? answerLabelData.label : "答案";
        answerInput.placeholder = `請輸入 ${answerLabel}`;
        
    } else if (currentMode === 'mcq') {
        if(quizInputArea) quizInputArea.style.display = 'none';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'grid'; 
        
    } else { // review 模式
        if(quizInputArea) quizInputArea.style.display = 'none';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'none';
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
    
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        if (answerInput) answerInput.focus(); 
        
    } else if (currentMode === 'mcq') {
        generateMcqOptions();
        nextButton.textContent = "下一張"; 
        nextButton.disabled = true; 
        
    } else { // review 模式
        nextButton.textContent = "顯示答案"; 
    }
}

// --- 5. 檢查答案 (輸入測驗) (不變) ---
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
        nextButton.disabled = false; 
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
    const buttonState = nextButton.textContent;

    if (currentMode === 'quiz') {
        if (buttonState === "檢查答案") {
            checkAnswer();
        } else { 
            loadNextCard();
        }
    } else if (currentMode === 'review') {
        if (buttonState === "顯示答案") {
            flipCard();
            nextButton.textContent = "下一張"; 
        } else { 
            loadNextCard(); 
        }
    } else if (currentMode === 'mcq') {
        loadNextCard();
    }
}

// --- 7. 處理 Enter / Shift 鍵 (不變) ---
function handleGlobalKey(event) {
    const isTyping = (currentMode === 'quiz' && document.activeElement === answerInput);

    if (event.key === 'Enter') {
        event.preventDefault();
        if (nextButton.textContent === "下一張" || nextButton.textContent === "檢查答案") {
             handleButtonPress();
        }
        return; 
    }

    if (event.key === 'Shift') {
        if (isTyping) return;
        event.preventDefault();
        flipCard();
        return; 
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
    if (nextButton.textContent === "下一張") {
        handleButtonPress();
    }
}

// --- ⭐️ 10. MCQ 相關函式 (已改回「正式版」) ⭐️ ---

// 產生 4 個選項 (1 正確, 3 錯誤)
function generateMcqOptions() {
    const correctAnswer = currentCorrectAnswer;
    let distractors = [];
    let options = [];

    // 1. 決定我們要抽幾個錯誤答案
    // (最多 3 個，但也不能超過 "總字數 - 1")
    const numDistractorsToFind = Math.min(3, vocabulary.length - 1);
    
    // 2. 抽 3 個錯誤答案
    let retries = 0;
    const maxRetries = 20; // 防止無限迴圈

    while (distractors.length < numDistractorsToFind && retries < maxRetries) {
        retries++; 
        
        const randomIndex = Math.floor(Math.random() * vocabulary.length);
        const randomWord = vocabulary[randomIndex];
        
        if (!randomWord[ANSWER_FIELD]) continue; 
        const distractor = randomWord[ANSWER_FIELD];
        
        if (distractor === correctAnswer) continue; 
        if (distractors.includes(distractor)) continue; 
        
        distractors.push(distractor);
    }

    // 3. 組合並隨機排序
    options = [correctAnswer, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // 4. 產生 HTML 按鈕
    mcqOptionsArea.innerHTML = ''; // 清空舊按鈕
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'mcq-option';
        button.textContent = option;
        button.dataset.answer = option; 
        button.addEventListener('click', handleMcqAnswer);
        mcqOptionsArea.appendChild(button);
    });
}

// 處理 MCQ 選項的點擊
function handleMcqAnswer(event) {
    const selectedButton = event.target;
    const selectedAnswer = selectedButton.dataset.answer;
    
    // 1. 禁用所有選項按鈕
    const allButtons = mcqOptionsArea.querySelectorAll('button');
    allButtons.forEach(button => button.disabled = true);

    // 2. 檢查答案
    if (normalizeString(selectedAnswer) === normalizeString(currentCorrectAnswer)) {
        // --- 答對了 ---
        selectedButton.classList.add('correct');
    } else {
        // --- 答錯了 ---
        selectedButton.classList.add('incorrect');
        // 找出並標示正確答案
        allButtons.forEach(button => {
            if (normalizeString(button.dataset.answer) === normalizeString(currentCorrectAnswer)) {
                button.classList.add('correct');
            }
        });
    }
    
    // 3. 啟用「下一張」按鈕
    nextButton.disabled = false;
    
    // 4. 自動翻面
    flipCard();
}


// --- 啟動程式 ---
loadVocabulary();
