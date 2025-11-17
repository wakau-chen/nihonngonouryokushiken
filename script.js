// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');

let vocabulary = []; // 宣告一個空的單字庫
let currentCardIndex = 0; // 目前顯示的卡片索引 (會被隨機數覆蓋)

// --- 非同步讀取 JSON 檔案 ---
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
    // --- 修改：不再從 0 開始，而是隨機選一張作為開始 ---
    currentCardIndex = Math.floor(Math.random() * vocabulary.length);
    
    showCard(); // 顯示第一張(隨機的)卡片
    
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

// --- 修改：顯示下一張隨機卡片 ---
function nextCard() {
    // 如果單字總數小於等於1，無法隨機，直接返回
    if (vocabulary.length <= 1) {
        showCard();
        return;
    }

    const oldIndex = currentCardIndex;
    let newIndex;

    // 使用 do...while 迴圈確保新抽到的 newIndex
    // 絕對不會等於舊的 oldIndex
    do {
        newIndex = Math.floor(Math.random() * vocabulary.length);
    } while (newIndex === oldIndex);

    currentCardIndex = newIndex;
    showCard();
}
// ---------------------------------

// --- 啟動程式 ---
// 頁面載入時，自動開始讀取單字庫
loadVocabulary();
