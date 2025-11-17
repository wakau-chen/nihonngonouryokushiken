// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section');
const mcqOptionsArea = document.getElementById('mcq-options-section');

// 獲取「區域」元素
const setupArea = document.getElementById('quiz-setup-area');
const mainArea = document.getElementById('quiz-main-area');
const resultsArea = document.getElementById('exam-results-area');

// 獲取「設定」元素
const setupTitle = document.getElementById('setup-title');
const startExamBtn = document.getElementById('start-exam-btn');
const examProgress = document.getElementById('exam-progress-bar');

// 考試模式變數
let isExamMode = false; // ⭐️ 關鍵！由 URL 決定
let examTotalQuestions = 0;
let examCurrentQuestion = 0;
let examIncorrectCount = 0;
let testedIndices = new Set(); 
let currentCardMarkedWrong = false; 

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

// --- 2. ⭐️ 非同步讀取 (已重寫) ⭐️ ---
async function loadVocabulary() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        currentMode = params.get('mode') || 'review'; 
        isExamMode = params.get('exam') === 'true'; // ⭐️ 讀取 "考試" 參數

        if (!listName) {
            setupTitle.textContent = '錯誤：未指定單字庫';
            setupArea.style.display = 'block'; // 顯示錯誤
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
            // ⭐️ 關鍵：決定要顯示「設定區」還是「主體區」
            if (isExamMode) {
                // --- 進入考試設定流程 ---
                setupTitle.textContent = `${listConfig.name} - 考試設定`;
                setupArea.style.display = 'block';
                startExamBtn.addEventListener('click', startGame);
            } else {
                // --- 進入練習流程 ---
                setupArea.style.display = 'none';
                mainArea.style.display = 'flex'; // ⭐️ 注意：設為 'flex'
                setupApp(); // 直接開始練習
            }
        } else {
            setupTitle.textContent = '單字庫為空！';
            setupArea.style.display = 'block';
        }
    } catch (error) {
        console.error('加載單字庫失敗:', error);
        setupTitle.textContent = `加載失敗 (${error.message})`;
        setupArea.style.display = 'block';
    }
}
// ---------------------------------

// --- 3. ⭐️ 啟動遊戲 (原 "startGame") ⭐️ ---
function startGame() {
    // 1. 切換顯示區域
    setupArea.style.display = 'none';
    mainArea.style.display = 'flex'; // ⭐️ 注意：設為 'flex'

    // 2. 讀取考試設定
    const selectedLength = document.querySelector('input[name="exam-length"]:checked').value;
    if (selectedLength === 'all') {
        examTotalQuestions = vocabulary.length;
    } else {
        examTotalQuestions = parseInt(selectedLength);
    }
    
    if (examTotalQuestions > vocabulary.length) {
        examTotalQuestions = vocabulary.length;
    }

    // 3. 重設計數器
    examCurrentQuestion = 0;
    examIncorrectCount = 0;
    testedIndices.clear();
    updateExamProgress(); 
    
    // 4. 綁定主程式事件 (原 "setupApp")
    setupApp();
}


// --- 4. 設置主要功能 (原 "setupApp") ---
function setupApp() {
    // (移除了 loadVocabulary)
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    const cardContainer = document.querySelector('.flashcard-container');
    if (cardContainer) {
        cardContainer.addEventListener('touchstart', handleTouchStart, false);
        cardContainer.addEventListener('touchmove', handleTouchMove, false);
        cardContainer.addEventListener('touchend', handleTouchEnd, false);
    }
    
    document.addEventListener('keydown', handleGlobalKey);
    
    // 根據模式顯示/隱藏 UI
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

// --- 5. ⭐️ 顯示新卡片 (已升級考試邏輯) ⭐️ ---
async function loadNextCard() {
    // 1. 檢查考試是否結束
    if (isExamMode && examCurrentQuestion >= examTotalQuestions) {
        showExamResults();
        return; 
    }
    
    // 2. (修復閃爍 - 不變)
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    // 3. 抽卡邏輯
    let card;
    if (isExamMode) {
        // --- 考試模式：抽不重複的卡 ---
        examCurrentQuestion++;
        updateExamProgress();
        currentCardMarkedWrong = false; 

        let newIndex;
        if (examTotalQuestions === vocabulary.length) {
            newIndex = examCurrentQuestion - 1; 
        } else {
            do { 
                newIndex = Math.floor(Math.random() * vocabulary.length); 
            } while (testedIndices.has(newIndex));
        }
        testedIndices.add(newIndex);
        card = vocabulary[newIndex];

    } else {
        // --- 練習模式：隨機抽卡 (可重複) ---
        const oldIndex = currentCardIndex;
        if (vocabulary.length <= 1) { currentCardIndex = 0; }
        else {
            do { currentCardIndex = Math.floor(Math.random() * vocabulary.length); }
            while (currentCardIndex === oldIndex);
        }
        card = vocabulary[currentCardIndex];
    }
    
    if (!card) return; 

    // 4. 填入卡片內容
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
    
    // 5. 重設 UI
    if (currentMode === 'quiz') {
        answerInput.value = ""; 
        answerInput.disabled = false; 
        answerInput.classList.remove('correct', 'incorrect');
        nextButton.textContent = "檢查答案"; 
        if (answerInput) answerInput.focus(); 
        
    } else if (currentMode === 'mcq') {
        generateMcqOptions();
        nextButton.textContent = "下一張"; 
        nextButton.disabled = true; // 答對前禁用
        
    } else { // review 模式
        nextButton.textContent = "顯示答案"; 
    }
}

// --- 6. ⭐️ 檢查答案 (已升級考試邏輯) ⭐️ ---
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
        
        if (isExamMode && !currentCardMarkedWrong) {
            examIncorrectCount++;
            currentCardMarkedWrong = true;
            updateExamProgress();
        }
    }
}

// --- 7. 處理按鈕點擊 (不變) ---
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

// --- 8. 處理 Enter / Shift 鍵 (不變) ---
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

// --- 9. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 10. 滑動手勢處理 (不變) ---
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

// --- 11. MCQ 相關函式 (已升級考試邏輯) ---
function generateMcqOptions() {
    const correctAnswer = currentCorrectAnswer;
    let distractors = [];
    let options = [];
    const numDistractorsToFind = Math.min(3, vocabulary.length - 1);
    let retries = 0;
    const maxRetries = 20; 

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
    options = [correctAnswer, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    mcqOptionsArea.innerHTML = ''; 
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'mcq-option';
        button.textContent = option;
        button.dataset.answer = option; 
        button.addEventListener('click', handleMcqAnswer);
        mcqOptionsArea.appendChild(button);
    });
}
function handleMcqAnswer(event) {
    const selectedButton = event.target;
    const selectedAnswer = selectedButton.dataset.answer;
    
    const allButtons = mcqOptionsArea.querySelectorAll('button');
    allButtons.forEach(button => button.disabled = true);

    if (normalizeString(selectedAnswer) === normalizeString(currentCorrectAnswer)) {
        selectedButton.classList.add('correct');
    } else {
        selectedButton.classList.add('incorrect');
        allButtons.forEach(button => {
            if (normalizeString(button.dataset.answer) === normalizeString(currentCorrectAnswer)) {
                button.classList.add('correct');
            }
        });
        
        if (isExamMode && !currentCardMarkedWrong) {
            examIncorrectCount++;
            currentCardMarkedWrong = true;
            updateExamProgress();
        }
    }
    
    nextButton.disabled = false;
    flipCard();
}

// --- ⭐️ 12. 考試專用函式 (不變) ⭐️ ---
function updateExamProgress() {
    if (!isExamMode) {
        examProgress.style.display = 'none';
        return;
    }
    
    examProgress.style.display = 'flex';
    let score = 'N/A';
    // ⭐️ 修正：在 "第 0 題" 時不要計算
    if (examCurrentQuestion > 0) {
        const correctCount = (examCurrentQuestion - examIncorrectCount);
        score = Math.round((correctCount / examCurrentQuestion) * 100);
    }
    
    examProgress.innerHTML = `
        <span>題數: ${examCurrentQuestion} / ${examTotalQuestions}</span>
        <span>答錯: ${examIncorrectCount}</span>
        <span>分數: ${score === 'N/A' ? 'N/A' : score + '%'}</span>
    `;
}
function showExamResults() {
    mainArea.style.display = 'none';
    resultsArea.style.display = 'block';

    const correctCount = examTotalQuestions - examIncorrectCount;
    const finalScore = Math.round((correctCount / examTotalQuestions) * 100);
    let message = '';
    if (finalScore == 100) message = '太完美了！ (Perfect!)';
    else if (finalScore >= 80) message = '非常厲害！ (Great Job!)';
    else if (finalScore >= 60) message = '不錯喔！ (Good!)';
    else message = '再加油！ (Keep Trying!)';
    
    resultsArea.innerHTML = `
        <h1>考試結束！</h1>
        <div class="results-summary">
            <h2>${message}</h2>
            <div class="final-score">${finalScore}%</div>
            <p>總題數: ${examTotalQuestions}</p>
            <p>答對: ${correctCount}</p>
            <p>答錯: ${examIncorrectCount}</p>
        </div>
        <a href="javascript:location.reload()" class="option-button review-mode">再考一次</a>
        <a href="index.html" class="home-button">返回主頁面</a>
    `;
}

// --- 啟動程式 ---
// (不再呼叫 setupApp 或 loadNextCard)
loadVocabulary();
