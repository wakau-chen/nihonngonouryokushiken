// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');

let vocabulary = []; // 宣告一個空的單字庫
let currentCardIndex = 0; 

// --- 非同步讀取 JSON 檔案 ---
async function loadVocabulary() {
    try {
        const response = await fetch('words.json'); 
        if (!response.ok) {
            throw new Error('無法讀取 words.json 檔案');
        }
        vocabulary = await response.json(); 
        
        if (vocabulary.length > 0) {
            setupApp();
        } else {
            cardFront.textContent = '單字庫為空！';
        }
    } catch (error) {
        console.error('加載單字庫失敗:', error);
        cardFront.textContent = '加載失敗';
    }
}
// ---------------------------------

// 設置主要功能
function setupApp() {
    currentCardIndex = Math.floor(Math.random() * vocabulary.length);
    showCard(); // 顯示第一張(隨機的)卡片
    
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', nextCard);
}

// 顯示卡片內容
// --- ⭐️ 這是修改的重點：使用 | 分割 ⭐️ ---
function showCard() {
    if (vocabulary.length === 0) return; 
    
    const card = vocabulary[currentCardIndex];
    
    // 1. 處理卡片正面 (不變)
    cardFront.textContent = card.front;
    
    // 2. 處理卡片背面 (全新邏輯)
    // 取得 back 字串，如果不存在則給一個空字串
    const backString = card.back || ""; 
    let backHtml = ''; 

    // --- 使用 | 符號來分割字串 ---
    const parts = backString.split('|');
    // 範例： "蘋果|n. (名詞)|N5"
    // parts 會變成 ['蘋果', 'n. (名詞)', 'N5']
    
    // 範例： "信號、標誌|n."
    // parts 會變成 ['信號、標誌', 'n.']

    // 根據 parts 陣列的內容建立 HTML
    // (CSS class 名稱您可以自訂)
    if (parts[0]) {
        // parts[0] 永遠是主要意思
        backHtml += `<div class="back-definition">${parts[0]}</div>`;
    }
    if (parts[1]) {
        // parts[1] 是詞性
        backHtml += `<div class="back-type">${parts[1]}</div>`;
    }
    if (parts[2]) {
        // parts[2] 是等級
        backHtml += `<div class="back-level">${parts[2]}</div>`;
    }
    // 如果您有第四個、第五個...
    // if (parts[3]) {
    //     backHtml += `<div class="back-example">${parts[3]}</div>`;
    // }

    // 3. 把組合好的 HTML 放入卡片背面
    cardBack.innerHTML = backHtml;
    
    // 確保卡片是正面朝上
    flashcard.classList.remove('is-flipped');
}
// ---------------------------------

// 翻轉卡片
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// 顯示下一張隨機卡片
function nextCard() {
    if (vocabulary.length <= 1) {
        showCard();
        return;
    }
    const oldIndex = currentCardIndex;
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * vocabulary.length);
    } while (newIndex === oldIndex);

    currentCardIndex = newIndex;
    showCard();
}

// --- 啟動程式 ---
loadVocabulary();
