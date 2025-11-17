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
        const response = await fetch('words.json?v=' + new Date().getTime()); 
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

// 設置主要功能 (讀取到資料後才執行)
function setupApp() {
    currentCardIndex = Math.floor(Math.random() * vocabulary.length);
    showCard(); // 顯示第一張(隨機的)卡片
    
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', nextCard);
}

// 顯示卡片內容
// --- ⭐️ 這是修改的重點：組合發音(parts[1])和音調(parts[2]) ---
function showCard() {
    if (vocabulary.length === 0) return; 
    
    const card = vocabulary[currentCardIndex];
    
    // 1. 處理卡片正面 (不變)
    cardFront.textContent = card.front;
    
    // 2. 處理卡片背面
    const backString = card.back || ""; 
    let backHtml = ''; 
    const parts = backString.split('|');
    
    // parts[0] = 愛 (主要意思)
    // parts[1] = あい (發音)
    // parts[2] = 1 (音調)
    // parts[3] = 名詞 (詞性)

    // 組合發音和音調
    let pronunciationHtml = '';
    if (parts[1]) { // 發音 (あい)
        pronunciationHtml += parts[1];
    }
    if (parts[2] || parts[2] === 0) { // 音調 (例如 1 或 0)
        // 在音調數字外包一個 <span> 方便 CSS 上色
        pronunciationHtml += ` <span class="pitch-accent-number">(${parts[2]})</span>`;
    }
    
    // --- 按照 (發音+音調) -> 主要意思 -> 詞性 的順序顯示 ---
    if (pronunciationHtml) {
        backHtml += `<div class="back-pronunciation">${pronunciationHtml}</div>`;
    }
    if (parts[0]) { // 主要意思 (愛)
        backHtml += `<div class="back-definition">${parts[0]}</div>`;
    }
    if (parts[3]) { // 詞性 (名詞)
        backHtml += `<div class="back-type">${parts[3]}</div>`;
    }

    // 3. 把組合好的 HTML 放入卡片背面
    cardBack.innerHTML = backHtml;
    
    // 確保每次換新卡時，卡片都是正面朝上
    flashcard.classList.remove('is-flipped');
}
// ---------------------------------

// 執行翻轉的函式
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// 顯示下一張隨機卡片
function nextCard(event) {
    // 阻止事件冒泡 (避免點按鈕時也翻卡)
    event.stopPropagation();

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
