// 獲取 HTML 元素 (不變)
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');

let vocabulary = []; // 宣告一個空的單字庫
let currentCardIndex = 0; 

// --- ⭐️ 這是修改的重點：動態讀取 JSON 檔案 ---
async function loadVocabulary() {
    try {
        // 1. 讀取 URL 參數
        // 例如 "quiz.html?list=N3"
        const params = new URLSearchParams(window.location.search);
        const listName = params.get('list'); // 會得到 "N3"

        if (!listName) {
            // 如果 URL 沒有 ?list=... 參數，就顯示錯誤
            cardFront.textContent = '錯誤：未指定單字庫';
            return;
        }

        // 2. 根據參數組合 JSON 檔案的路徑
        const filePath = `words/${listName}.json?v=${new Date().getTime()}`;

        // 3. 讀取指定的檔案
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
        cardFront.textContent = '加載失敗';
    }
}
// ---------------------------------

// 設置主要功能 (不變)
function setupApp() {
    currentCardIndex = Math.floor(Math.random() * vocabulary.length);
    showCard(); 
    
    flashcard.addEventListener('click', flipCard);
    nextButton.addEventListener('click', nextCard);
}

// 顯示卡片內容 (不變)
// 格式："愛|あい|1|名詞"
function showCard() {
    if (vocabulary.length === 0) return; 
    
    const card = vocabulary[currentCardIndex];
    cardFront.textContent = card.front;
    
    const backString = card.back || ""; 
    let backHtml = ''; 
    const parts = backString.split('|');
    
    // parts[0] = 愛 (主要意思)
    // parts[1] = あい (發音)
    // parts[2] = 1 (音調)
    // parts[3] = 名詞 (詞性)

    let pronunciationHtml = '';
    if (parts[1]) { 
        pronunciationHtml += parts[1];
    }
    if (parts[2] || parts[2] === 0) { 
        pronunciationHtml += ` <span class="pitch-accent-number">(${parts[2]})</span>`;
    }
    
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
}

// 翻轉卡片 (不變)
function flipCard() {
    flashcard.classList.toggle('is-flipped');
}

// 下一張卡片 (不變)
function nextCard(event) {
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
