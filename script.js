// --- 您的單字庫 ---
// 在這裡新增您想要的單字
// 格式：{ front: '正面（問題）', back: '反面（答案）' }
const vocabulary = [
    { front: 'Apple', back: '蘋果' },
    { front: 'Banana', back: '香蕉' },
    { front: 'Cat', back: '貓' },
    { front: 'Dog', back: '狗' },
    { front: 'Hello', back: '你好' }
];
// --------------------

// 獲取 HTML 元素
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const nextButton = document.getElementById('next-button');

let currentCardIndex = 0; // 目前顯示的卡片索引

// 顯示卡片內容
function showCard() {
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

// 設定事件監聽器
flashcard.addEventListener('click', flipCard);
nextButton.addEventListener('click', nextCard);

// 頁面載入時，顯示第一張卡片
showCard();
