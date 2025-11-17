// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section');
// ⭐️ 獲取 MCQ 元素
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

// --- 2. ⭐️ 非同步讀取 (已升級) ⭐️ ---
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

        // ⭐️ 根據 mode 決定要用哪一套設定
        let modeConfig = {};
        if (currentMode === 'review' && listConfig.review) {
            modeConfig = listConfig.review;
            ANSWER_FIELD = ''; // 複習模式沒有 "主要答案"
        } else if (currentMode === 'quiz' && listConfig.quiz) {
            modeConfig = listConfig.quiz;
            ANSWER_FIELD = modeConfig.a_field;
        } else if (currentMode === 'mcq' && listConfig.mcq) { // ⭐️ 新增 MCQ 模式
            modeConfig = listConfig.mcq;
            ANSWER_FIELD = modeConfig.a_field;
        } else {
            throw new Error(`在 config.json 中找不到 ${listName} 的 ${currentMode} 設定`);
        }

        // 儲存全局設定
        QUESTION_FIELD = modeConfig.q_field;
        BACK_CARD_FIELDS = modeConfig.back_fields || [];
        
        // 抓取單字庫檔案
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

// --- 3. ⭐️ 設置主要功能 (已升級) ⭐️ ---
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
    
    // ⭐️ 根據模式顯示/隱藏正確的 UI
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'none';
        
        const answerLabelData = BACK_CARD_FIELDS.find(f => f.key === ANSWER_FIELD);
        const answerLabel = answerLabelData ? answerLabelData.label : "答案";
        answerInput.placeholder = `請輸入 ${answerLabel}`;
        
    } else if (currentMode === 'mcq') {
        if(quizInputArea) quizInputArea.style.display = 'none';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'grid'; // ⭐️ 顯示 MCQ 區塊
        
    } else { // review 模式
        if(quizInputArea) quizInputArea.style.display = 'none';
        if(mcqOptionsArea) mcqOptionsArea.style.display = 'none';
    }
    
    loadNextCard();
}

// --- 4. ⭐️ 顯示新卡片 (已升級) ⭐️ ---
async function loadNextCard() {
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    // (抽卡邏輯 - 不變)
    const oldIndex = currentCardIndex;
    if (vocabulary.length <= 1) { currentCardIndex = 0; }
    else {
        do { currentCardIndex = Math.floor(Math.random() * vocabulary.length); }
        while (currentCardIndex === oldIndex);
    }
    
    const card = vocabulary[currentCardIndex];
    if (!card) return; 

    // 1. 設置正面 (題目)
    cardFront.textContent = card[QUESTION_FIELD] || "";
    
    // 2. 設置主要答案
    currentCorrectAnswer = card[ANSWER_FIELD] || "";

    // 3. 設置背面 (補充資訊)
    let backHtml = '';
    for (const field of BACK_CARD_FIELDS) {
        const value = card[field.key];
        
        if (value !== undefined && value !== null && value !== "") {
            const isAnswer = (field.key === ANSWER_FIELD); // 突顯答案
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
    
    // 4. ⭐️ 根據模式重設 UI
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        if (answerInput) answerInput.focus(); 
        
    } else if (currentMode === 'mcq') {
        // ⭐️ 產生並顯示選擇題選項
        generateMcqOptions();
        nextButton.textContent = "下一張"; // ⭐️ MCQ 模式按鈕一開始就是 "下一張"
        nextButton.disabled = true; // ⭐️ 先禁用，答對後才啟用
        
    } else { // review 模式
        nextButton.textContent = "顯示答案"; 
    }
}

// --- 5. ⭐️ 檢查答案 (輸入測驗) (不變) ⭐️ ---
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
        nextButton.disabled = false; // ⭐️ 啟用下一張
        answerInput.value = currentCorrectAnswer; 
        flipCard(); 
    } else {
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 6. ⭐️ 處理按鈕點擊 (已升級) ⭐️ ---
function handleButtonPress() {
    const buttonState = nextButton.textContent;

    if (currentMode === 'quiz') {
        if (buttonState === "檢查答案") {
            checkAnswer();
        } else { // (buttonState === "下一張")
            loadNextCard();
        }
    } else if (currentMode === 'review') {
        if (buttonState === "顯示答案") {
            flipCard();
            nextButton.textContent = "下一張"; 
        } else { // (buttonState === "下一張")
            loadNextCard(); 
        }
    } else if (currentMode === 'mcq') {
        // ⭐️ 在 MCQ 模式，按鈕永遠是 "下一張"
        loadNextCard();
    }
}

// --- 7. ⭐️ 處理 Enter / Shift 鍵 (已升級) ⭐️ ---
function handleGlobalKey(event) {
    const isTyping = (currentMode === 'quiz' && document.activeElement === answerInput);

    // 1. "Enter" 鍵
    if (event.key === 'Enter') {
        event.preventDefault();
        // ⭐️ 只有在按鈕是 "下一張" 或是 "檢查答案" 時才觸發
        // (防止在 MCQ 答題前按 Enter 跳過)
        if (nextButton.textContent === "下一張" || nextButton.textContent === "檢查答案") {
             handleButtonPress();
        }
        return; 
    }

    // 2. "Shift" 鍵
    if (event.key === 'Shift') {
        if (isTyping) return; // 打字時禁用
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
    // ⭐️ 只有在按鈕是 "下一張" 時才能滑動
    if (nextButton.textContent === "下一張") {
        handleButtonPress();
    }
}

// --- ⭐️ 10. 新增：MCQ 相關函式 ⭐️ ---

// 產生 4 個選項 (1 正確, 3 錯誤)
function generateMcqOptions() {
    const correctAnswer = currentCorrectAnswer;
    let distractors = [];
    let options = [];

    // 1. 獲取 3 個不重複的錯誤答案
    while (distractors.length < 3 && vocabulary.length > 4) {
        const randomIndex = Math.floor(Math.random() * vocabulary.length);
        const randomWord = vocabulary[randomIndex];
        
        // 確保錯誤答案的 "a_field" (例如 'hiragana') 不是空的
        if (!randomWord[ANSWER_FIELD]) continue;
        
        const distractor = randomWord[ANSWER_FIELD];
        
        if (distractor === correctAnswer) continue; // 略過正確答案
        if (distractors.includes(distractor)) continue; // 略過已選過的
        
        distractors.push(distractor);
    }

    // 2. 組合並隨機排序
    options = [correctAnswer, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // 3. 產生 HTML 按鈕
    mcqOptionsArea.innerHTML = ''; // 清空舊按鈕
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'mcq-option';
        button.textContent = option;
        button.dataset.answer = option; // 將答案存在 data- 屬性中
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
