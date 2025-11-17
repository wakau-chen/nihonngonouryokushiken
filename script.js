// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');

let vocabulary = []; // 宣告一個空的單字庫
let currentCardIndex = 0; // 目前顯示的卡片索引

// --- 新增：非同步讀取 JSON 檔案 ---
async function loadVocabulary() {
    try {
        const response = await fetch('words.json'); // 讀取 'words.json'
        if (!response.ok) {
            throw new Error('無法讀取 words.json 檔案');
        }
        vocabulary = await response.json(); // 解析 JSON
        
        // 數據加載後，才執行後續動作
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

// 設置主要功能 (讀取到資料後才執行)
function setupApp() {
    showCard(); // 顯示第一張卡片
    // 綁定事件
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', nextCard);
}

// 顯示卡片內容
function showCard() {
    if (vocabulary.length === 0) return; // 安全檢查
    
    const card = vocabulary[currentCardIndex];
    cardFront.textContent = card.front;
    cardBack.textContent = card.back;
    
    // 確保卡片是正面朝上
    flashcard.classList.remove('is-flipped');
}

// 翻轉卡片
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// 顯示下一張卡片
function nextCard() {
    // 索引加 1，如果到底了就從 0 開始
    currentCardIndex = (currentCardIndex + 1) % vocabulary.length;
    showCard();
}

// --- 啟動程式 ---
// 頁面載入時，自動開始讀取單字庫
loadVocabulary();
