// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section');
const mcqOptionsArea = document.getElementById('mcq-options-section');
const examProgress = document.getElementById('exam-progress-bar');

// 獲取「區域」元素
const modeChoiceArea = document.getElementById('mode-choice-area');
const practiceExamChoiceArea = document.getElementById('practice-exam-choice-area');
const examSetupArea = document.getElementById('exam-setup-area'); // ⭐️ 變數名稱是 "examSetupArea"
const mainArea = document.getElementById('quiz-main-area');
const resultsArea = document.getElementById('exam-results-area');

// 獲取「按鈕」和「標題」
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

// 輔助函式：正規化字串
function normalizeString(str) {
    if (typeof str !== 'string') str = String(str);
    if (!str) return "";
    return str.replace(/・/g, '').replace(/\./g, '').replace(/\s/g, '');
}

// --- 2. ⭐️ 非同步讀取 (已重寫) ⭐️ ---
async function initializeQuiz() {
    try {
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); 
        const modeId = params.get('mode_id'); 
        
        if (!listName) {
            modeChoiceTitle.textContent = '錯誤：未指定單字庫';
            modeChoiceArea.style.display = 'block'; 
            return;
        }

        // ⭐️ 關鍵：設定所有「返回」按鈕的連結
        // (返回到 "模式選擇" 畫面)
        const baseUrl = `quiz.html?list=${listName}`;
        const returnButtons = document.querySelectorAll('.button-return');
        returnButtons.forEach(btn => btn.href = baseUrl);
        
        const configResponse = await fetch('config.json?v=' + new Date().getTime());
        if (!configResponse.ok) { throw new Error('無法讀取 config.json'); }
        const config = await configResponse.json();

        function findListById(items, id) { /* (遞迴尋找函式 - 不變) */
            if (!items) return null;
            for (const item of items) {
                if (item.type === 'list' && item.id === id) return item;
                if (item.type === 'category') {
                    const found = findListById(item.items, id);
                    if (found) return found;
                }
            }
            return null;
        }
        
        const listConfig = findListById(config.catalog, listName);
        if (!listConfig) { throw new Error(`在 config.json 中找不到 ID 為 ${listName} 的設定`); }

        // ⭐️ 關鍵：如果 URL "沒有" mode_id，顯示「模式選擇」畫面
        if (!modeId) {
            modeChoiceTitle.textContent = `${listConfig.name} - 選擇模式`;
            let buttonHtml = '';
            if (listConfig.modes && Array.isArray(listConfig.modes)) {
                for (const mode of listConfig.modes) {
                    if (mode.enabled) {
                        buttonHtml += `
                            <button class="option-button ${mode.type}-mode" data-mode-id="${mode.id}" data-mode-type="${mode.type}">
                                ${mode.name}
                            </button>
                        `;
                    }
                }
            }
            modeButtonContainer.innerHTML = buttonHtml;
            modeButtonContainer.addEventListener('click', (event) => {
                const button = event.target.closest('.option-button');
                if (!button) return;
                
                const chosenModeId = button.dataset.modeId;
                // ⭐️ 重新載入頁面，這次 "附帶" mode_id
                const url = `${baseUrl}&mode_id=${chosenModeId}`;
                window.location.href = url;
            });
            
            modeChoiceArea.style.display = 'block'; // 顯示「模式選擇」
            return; // ⭐️ 停止執行
        }

        // --- 走到這裡，代表 URL 已經有 listName 和 modeId ---
        const modeConfig = listConfig.modes.find(m => m.id === modeId);
        if (!modeConfig) {
            throw new Error(`在 ${listName} 中找不到 ID 為 ${modeId} 的模式設定`);
        }

        currentMode = modeConfig.type;
        QUESTION_FIELD = modeConfig.q_field;
        ANSWER_FIELD = modeConfig.a_field || '';
        BACK_CARD_FIELDS = modeConfig.back_fields || [];
        
        const filePath = `words/${listName}.json?v=${new Date().getTime()}`;
        const response = await fetch(filePath); 
        if (!response.ok) { throw new Error(`無法讀取 ${listName}.json 檔案`); }
        vocabulary = await response.json(); 
        
        if (vocabulary.length > 0) {
            // ⭐️ 關鍵：我們還需要 "exam" 參數
            isExamMode = params.get('exam') === 'true'; 

            if (isExamMode && currentMode !== 'review') {
                // --- 進入考試設定流程 ---
                setupTitle.textContent = `${modeConfig.name} - 考試設定`;
                practiceExamChoiceArea.style.display = 'none'; 
                modeChoiceArea.style.display = 'none'; 
                examSetupArea.style.display = 'block'; // ⭐️ 變數是 "examSetupArea"
                startExamFinalBtn.addEventListener('click', startGame);
            } else if (!isExamMode && currentMode !== 'review') {
                // ⭐️ 顯示「練習/考試」選擇
                practiceExamTitle.textContent = modeConfig.name;
                modeChoiceArea.style.display = 'none';
                practiceExamChoiceArea.style.display = 'block';

                startPracticeBtn.addEventListener('click', () => {
                    isExamMode = false;
                    practiceExamChoiceArea.style.display = 'none';
                    mainArea.style.display = 'flex';
                    setupApp();
                });
                startExamSetupBtn.addEventListener('click', () => {
                    isExamMode = true;
                    practiceExamChoiceArea.style.display = 'none';
                    examSetupArea.style.display = 'block'; // ⭐️ 變數是 "examSetupArea"
                    examSetupTitle.textContent = `${modeConfig.name} - 考試設定`;
                    startExamFinalBtn.addEventListener('click', startGame);
                });
            } else {
                // --- 進入練習流程 (Review 模式，或 "exam=false") ---
                isExamMode = false;
                examSetupArea.style.display = 'none'; // ⭐️ 變數是 "examSetupArea"
                practiceExamChoiceArea.style.display = 'none';
                modeChoiceArea.style.display = 'none'; 
                mainArea.style.display = 'flex'; 
                setupApp(); // 直接開始練習
            }
        } else {
            setupTitle.textContent = '單字庫為空！';
            examSetupArea.style.display = 'block'; // ⭐️ 變數是 "examSetupArea"
        }
    } catch (error) {
        console.error('加載單字庫失敗:', error);
        mainArea.innerHTML = `<h1>加載失敗 (${error.message})</h1>`;
        mainArea.style.display = 'flex';
    }
}
// ---------------------------------

// --- 3. ⭐️ 啟動遊戲 (原 "startGame") ⭐️ ---
function startGame() {
    examSetupArea.style.display = 'none'; // ⭐️ 變數是 "examSetupArea"
    mainArea.style.display = 'flex'; 

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
    
    setupApp();
}


// --- 4. 設置主要功能 (原 "setupApp") ---
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

// --- 5. ⭐️ 顯示新卡片 (已升級考試邏輯) ⭐️ ---
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
