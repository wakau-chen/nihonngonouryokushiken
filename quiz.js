// quiz.js (新增切換邏輯)

// ... 在 initializeQuiz 之前加入獲取元素 (如果需要) ...
// 獲取「切換」元素
const operationToggle = document.getElementById('operation-toggle');

// ... 在 setupApp 函式內部加入事件監聽器 ...
function setupApp() {
    // ... 既有的事件監聽器 ...

    // ⭐️ 新增：操作註解切換邏輯 ⭐️
    if (operationToggle) {
        operationToggle.addEventListener('click', toggleOperationNotes);
    }
    
    // ... 後續代碼 ...
}

// ⭐️ 新增：展開/收合函式 ⭐️
function toggleOperationNotes() {
    const notes = document.getElementById('operation-notes');
    const icon = document.getElementById('toggle-icon');
    
    if (notes.classList.contains('expanded')) {
        // 收合
        notes.classList.remove('expanded');
        // icon.textContent = '▼'; // 樣式已由 CSS 處理
    } else {
        // 展開
        notes.classList.add('expanded');
        // icon.textContent = '▲'; // 樣式已由 CSS 處理
    }
}

// ... 後續代碼 ...
