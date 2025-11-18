// 獲取 HTML 元素 (卡片、輸入框)
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section');
const mcqOptionsArea = document.getElementById('mcq-options-section');
const examProgress = document.getElementById('exam-progress-bar');

// ⭐️ 獲取「區域」元素
const modeChoiceArea = document.getElementById('mode-choice-area');
const practiceExamChoiceArea = document.getElementById('practice-exam-choice-area');
const examSetupArea = document.getElementById('exam-setup-area');
const mainArea = document.getElementById('quiz-main-area');
const resultsArea = document.getElementById('exam-results-area');

// ⭐️ 獲取「按鈕」和「標題」
const modeChoiceTitle = document.getElementById('mode-choice-title');
const modeButtonContainer = document.getElementById('mode-button-container');
const practiceExamTitle = document.getElementById('practice-exam-title');
const startPracticeBtn = document.getElementById('start-practice-btn');
const startExamSetupBtn = document.getElementById('start-exam-setup-btn');
const startExamFinalBtn = document.getElementById('start-exam-final-btn');

// 考試模式變數
let isExamMode = false;
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
let listConfig = null; // 儲存單字庫設定
let modeConfig = null; // 儲存模式設定

// 輔助函式：正規化字串
function normalizeString(str) {
    if (typeof str !== 'string') str = String(str);
    if (!str) return "";
    return str.replace(/・/g, '').replace(/\./g, '').replace(/\s/g, '');
}

// --- 2. ⭐️ 非同步讀取 (已重寫為「流程 1：選擇模式」) ⭐️ ---
async function loadConfigAndShowModes() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 

        if (!listName) {
            modeChoiceTitle.textContent = '錯誤：未指定單字庫';
            modeChoiceArea.style.display = 'block';
            return;
        }

        const configResponse = await fetch('config.json?v=' + new Date().getTime());
        if (!configResponse.ok) { throw new Error('無法讀取 config.json'); }
        const config = await configResponse.json();

        listConfig = config.lists.find(list => list.id === listName);
        if (!listConfig) { throw new Error(`在 config.json 中找不到 ID 為 ${listName} 的設定`); }
        
        // ⭐️ 載入成功，顯示「模式選擇」
        modeChoiceTitle.textContent = `${listConfig.name} - 選擇模式`;
        
        // ⭐️ 動態產生模式按鈕
        let buttonHtml = '';
        if (listConfig.modes && Array.isArray(listConfig.modes)) {
            for (const mode of listConfig.modes) {
                if (mode.enabled) {
                    buttonHtml += `
                        <button class="option-button ${mode.type}-mode" data-mode-id="${mode.id}">
                            ${mode.name}
                        </button>
                    `;
                }
            }
        }
        modeButtonContainer.innerHTML = buttonHtml;
        modeButtonContainer.addEventListener('click', handleModeChoice);
        
        // 顯示「模式選擇」區域
        modeChoiceArea.style.display = 'block';

    } catch (error) {
        console.error('加載單字庫失敗:', error);
        modeChoiceTitle.textContent = `加載失敗 (${error.message})`;
        modeChoiceArea.style.display = 'block';
    }
}
// ---------------------------------

// --- 3. ⭐️ 流程 2：選擇「練習」或「考試」 ⭐️ ---
function handleModeChoice(event) {
    const button = event.target.closest('.option-button');
    if (!button) return;

    const modeId = button.dataset.modeId;
    modeConfig = listConfig.modes.find(m => m.id === modeId);
    if (!modeConfig) return;

    currentMode = modeConfig.type; // 儲存模式類型 (review, quiz, mcq)

    // ⭐️ 您的要求：翻卡練習 (review) 維持沒有考試模式
    if (currentMode === 'review') {
        // --- 直接開始練習 ---
        isExamMode = false;
        loadVocabularyAndStart(); // 跳過所有設定
    } else {
        // --- 顯示「練習/考試」選擇畫面 ---
        practiceExamTitle.textContent = `${modeConfig.name}`;
        modeChoiceArea.style.display = 'none';
        practiceExamChoiceArea.style.display = 'block';

        // 綁定按鈕
        startPracticeBtn.addEventListener('click', () => {
            isExamMode = false;
            loadVocabularyAndStart(); // 開始練習
        });
        startExamSetupBtn.addEventListener('click', () => {
            isExamMode = true;
            showExamSetup(); // 進入下一步(設定題數)
        });
    }
}

// --- 4. ⭐️ 流程 3：(僅限考試) 設定題數 ⭐️ ---
function showExamSetup() {
    practiceExamChoiceArea.style.display = 'none';
    examSetupArea.style.display = 'block';

    // 綁定「最終開始」按鈕
    startExamFinalBtn.addEventListener('click', () => {
        loadVocabularyAndStart();
    });
}

// --- 5. ⭐️ 流程 4：載入單字庫並啟動測驗 ⭐️ ---
async function loadVocabularyAndStart() {
    try {
        // 1. 隱藏所有設定畫面，顯示主測驗區
        modeChoiceArea.style.display = 'none';
        practiceExamChoiceArea.style.display = 'none';
        examSetupArea.style.display = 'none';
        mainArea.style.display = 'flex'; // ⭐️ 顯示主測驗區

        // 2. 載入單字庫
        const filePath = `words/${listConfig.id}.json?v=${new Date().getTime()}`;
        const response = await fetch(filePath); 
        if (!response.ok) { throw new Error(`無法讀取 ${listConfig.id}.json 檔案`); }
        vocabulary = await response.json(); 
        
        if (vocabulary.length === 0) {
            mainArea.innerHTML = '<h1>錯誤：單字庫為空！</h1>';
            return;
        }

        // 3. 儲存設定
        QUESTION_FIELD = modeConfig.q_field;
        ANSWER_FIELD = modeConfig.a_field || ''; 
        BACK_CARD_FIELDS = modeConfig.back_fields || [];

        // 4. (僅限考試) 處理考試設定
        if (isExamMode) {
            const selectedLength = document.querySelector('input[name="exam-length"]:checked').value;
            if (selectedLength === 'all') {
                examTotalQuestions = vocabulary.length;
            } else {
                examTotalQuestions = parseInt(selectedLength);
            }
            if (examTotalQuestions > vocabulary.length) {
                examTotalQuestions = vocabulary.length;
            }
            examCurrentQuestion = 0;
            examIncorrectCount = 0;
            testedIndices.clear();
            updateExamProgress(); 
        }

        // 5. 綁定主程式事件 (原 "setupApp")
        setupApp();

    } catch (error) {
        console.error('啟動測驗失敗:', error);
        mainArea.innerHTML = `<h1>啟動測驗失敗</h1><p>${error.message}</p>`;
    }
}


// --- 6. 設置主要功能 (原 "setupApp") ---
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

// --- 7. 顯示新卡片 (不變) ---
async function loadNextCard() {
    if (isExamMode && examCurrentQuestion >= examTotalQuestions) {
        showExamResults();
        return; 
    }
    
    if (flashcard.classList.contains('is-flipped')) {
        flashcard.classList.remove('is-flipped');
        await new Promise(resolve => setTimeout(resolve, 610));
    }
    
    let card;
    if (isExamMode) {
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
        const oldIndex = currentCardIndex;
        if (vocabulary.length <= 1) { currentCardIndex = 0; }
        else {
            do { currentCardIndex = Math.floor(Math.random() * vocabulary.length); }
            while (currentCardIndex === oldIndex);
        }
        card = vocabulary[currentCardIndex];
    }
    
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
        nextButton.disabled = false;
        if (answerInput) answerInput.focus(); 
        
    } else if (currentMode === 'mcq') {
        generateMcqOptions();
        nextButton.textContent = "下一張"; 
        nextButton.disabled = true; 
        
    } else { // review 模式
        nextButton.textContent = "顯示答案"; 
        nextButton.disabled = false;
    }
}

// --- 8. 檢查答案 (不變) ---
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

// --- 9. 處理按鈕點擊 (不變) ---
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

// --- 10. 處理 Enter / Shift 鍵 (不變) ---
function handleGlobalKey(event) {
    const isTyping = (currentMode === 'quiz' && document.activeElement === answerInput);

    if (event.key === 'Enter') {
        event.preventDefault();
        if (!nextButton.disabled) {
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

// --- 11. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- 12. 滑動手勢處理 (不變) ---
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
    if (!nextButton.disabled) {
        handleButtonPress();
    }
}

// --- 13. MCQ 相關函式 (不變) ---
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

// --- 14. 考試專用函式 (不變) ---
function updateExamProgress() {
    if (!isExamMode) {
        if(examProgress) examProgress.style.display = 'none';
        return;
    }
    
    if(examProgress) examProgress.style.display = 'flex';
    let score = 'N/A';
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
    if(mainArea) mainArea.style.display = 'none';
    if(resultsArea) resultsArea.style.display = 'block';

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

// --- ⭐️ 啟動程式 ⭐️ ---
// (不再是 loadVocabulary, 而是新的啟動函式)
loadConfigAndShowModes();
