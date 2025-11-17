// 頁面載入完成後，執行 loadConfig
document.addEventListener('DOMContentLoaded', loadConfig);

async function loadConfig() {
    try {
        const response = await fetch('config.json?v=' + new Date().getTime());
        if (!response.ok) {
            throw new Error('無法讀取 config.json');
        }
        const config = await response.json();

        const container = document.getElementById('list-options-container');
        if (!container) return;

        document.title = config.siteTitle || '單字卡練習';
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = config.siteTitle;
        }

        let allHtml = ''; 

        // 3. 遍歷 config.json 中的 "lists"
        for (const list of config.lists) {
            
            if (!list.enabled) {
                continue;
            }

            // ⭐️ 關鍵：按鈕不再是 <a> 連結，而是 <button>
            // 我們把 "mode" 和 "list.id" 存在 "data-" 屬性中
            let buttonHtml = ''; 

            if (list.review && list.review.enabled) {
                buttonHtml += `
                    <button class="option-button review-mode" data-list="${list.id}" data-mode="review">
                        翻卡複習
                    </button>
                `;
            }

            if (list.quiz && list.quiz.enabled) {
                buttonHtml += `
                    <button class="option-button quiz-mode" data-list="${list.id}" data-mode="quiz">
                        輸入測驗
                    </button>
                `;
            }

            if (list.mcq && list.mcq.enabled) {
                buttonHtml += `
                    <button class="option-button mcq-mode" data-list="${list.id}" data-mode="mcq">
                        選擇測驗
                    </button>
                `;
            }

            if (buttonHtml === '') {
                continue;
            }

            allHtml += `
                <div class="list-item">
                    <h4>${list.name}</h4>
                    <div class="button-group">
                        ${buttonHtml}
                    </div>
                </div>
            `;
        }

        container.innerHTML = allHtml;

        // ⭐️ 4. 新增：為所有按鈕綁定一個「中央監聽事件」
        container.addEventListener('click', handleModeClick);

    } catch (error) {
        console.error('載入首頁設定失敗:', error);
        const container = document.getElementById('list-options-container');
        if (container) {
            container.innerHTML = '<p>載入設定檔失敗。</p>';
        }
    }
}

// ⭐️ 5. 新增：處理按鈕點擊的函式
function handleModeClick(event) {
    // 檢查點擊的是否是一個 "option-button"
    const button = event.target.closest('.option-button');
    if (!button) return;

    // 獲取按鈕上的資料
    const listId = button.dataset.list;
    const mode = button.dataset.mode;
    
    // 獲取勾選框的狀態
    const isExamChecked = document.getElementById('exam-mode-toggle').checked;

    // ⭐️ 核心邏輯：
    // 只有在 "quiz" 或 "mcq" 模式下，"考試模式" 勾選框才有效
    let isExam = false;
    if (isExamChecked && (mode === 'quiz' || mode === 'mcq')) {
        isExam = true;
    }
    // ( 'review' 模式永遠 isExam = false )

    // 產生最終的 URL 並跳轉
    const url = `quiz.html?list=${listId}&mode=${mode}&exam=${isExam}`;
    window.location.href = url;
}
