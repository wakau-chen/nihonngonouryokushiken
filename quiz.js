// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');
const answerInput = document.getElementById('answer-input');
const quizInputArea = document.getElementById('quiz-input-section'); 

let vocabulary = []; 
let currentCardIndex = 0; 
let currentCorrectAnswer = ""; 
let currentMode = 'review'; 

// ⭐️ 新增：滑動偵測變數
let touchStartX = 0;
let touchStartY = 0;

// --- 1. 非同步讀取 JSON 檔案 (不變) ---
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

// --- 2. 設置主要功能 (修改) ---
function setupApp() {
    // 綁定點擊事件
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', handleButtonPress);

    // ⭐️ 新增：綁定滑動手勢到「卡片容器」
    // (我們綁定到 .flashcard-container 而不是卡片本身，以獲得更好的體驗)
    const cardContainer = document.querySelector('.flashcard-container');
    if (cardContainer) {
        // 'false' 參數是為了確保 'passive' 事件監聽
        cardContainer.addEventListener('touchstart', handleTouchStart, false);
        cardContainer.addEventListener('touchmove', handleTouchMove, false);
        cardContainer.addEventListener('touchend', handleTouchEnd, false);
    }
    
    // 根據模式決定 UI
    if (currentMode === 'quiz') {
        if(quizInputArea) quizInputArea.style.display = 'block'; 
        answerInput.addEventListener('keypress', handleEnterKey);
    } else {
        if(quizInputArea) quizInputArea.style.display = 'none'; 
    }
    
    loadNextCard();
}

// --- 3. 顯示新卡片 (不變) ---
function loadNextCard() {
    // (這整個函式的內部邏輯都沒有改變)
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
    
    flashcard.classList.remove('is-flipped'); 
    
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
        flipCard(); 
    } else {
        answerInput.classList.add('incorrect');
        answerInput.classList.remove('correct');
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 500);
    }
}

// --- 5. 處理按鈕點擊 (不變) ---
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

// --- 6. 處理 Enter 鍵 (不變) ---
function handleEnterKey(event) {
    if (currentMode === 'quiz' && event.key === 'Enter') {
        event.preventDefault();
        handleButtonPress();
    }
}

// --- 7. 翻轉卡片 (不變) ---
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// --- ⭐️ 8. 新增：滑動手勢處理 ⭐️ ---

function handleTouchStart(event) {
    // 記錄滑動起始點的 X 和 Y 座標
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
}

function handleTouchMove(event) {
    // 偵測是否為水平滑動
    let diffX = Math.abs(event.changedTouches[0].screenX - touchStartX);
    let diffY = Math.abs(event.changedTouches[0].screenY - touchStartY);

    if (diffX > diffY) {
        // 如果是水平滑動，阻止瀏覽器預設的「左右滑動」行為 (例如返回上一頁)
        event.preventDefault();
    }
    // 如果是垂直滑動 (diffY > diffX)，則不阻止，允許頁面正常上下滾動
}

function handleTouchEnd(event) {
    let touchEndX = event.changedTouches[0].screenX;
    let touchEndY = event.changedTouches[0].screenY;

    let swipeDistanceX = touchStartX - touchEndX; // 水平滑動距離
    let swipeDistanceY = touchStartY - touchEndY; // 垂直滑動距離
    
    const minSwipeThreshold = 50; // 必須滑動超過 50px 才算數

    // 1. 必須是「水平」滑動 (X 距離 > Y 距離)
    // 2. 必須超過最小滑動距離
    if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY) && Math.abs(swipeDistanceX) > minSwipeThreshold) {
        
        // 判斷方向
        if (swipeDistanceX > 0) {
            // --- SWIPE LEFT (向左滑：R -> L) ---
            // 觸發「下一張」
            triggerNextCardAction();
        } else {
            // --- SWIPE RIGHT (向右滑：L -> R) ---
            // (目前無功能，未來可以做「上一張」)
        }
    }
    
    // 重設起始點
    touchStartX = 0;
    touchStartY = 0;
}

// ⭐️ 新增：滑動觸發的「下一張」安全檢查
function triggerNextCardAction() {
    // 只有在「複習模式」或「測驗模式且已答對」時，滑動才有效
    if (currentMode === 'review' || (currentMode === 'quiz' && nextButton.textContent === "下一張")) {
        loadNextCard();
    }
    // 如果是在測驗模式且尚未回答 (按鈕是"檢查答案")，滑動不會有任何反應
}


// --- 啟動程式 ---
loadVocabulary();
