// 頁面載入完成後，執行 loadConfig
document.addEventListener('DOMContentLoaded', loadConfig);

async function loadConfig() {
    try {
        // 1. 抓取 config.json
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

        // 3. ⭐️ 遍歷 config.json 中的 "lists"
        for (const list of config.lists) {
            
            if (!list.enabled) {
                continue;
            }

            let buttonHtml = ''; 

            // ⭐️ 關鍵：遍歷 "modes" 陣列
            if (list.modes && Array.isArray(list.modes)) {
                for (const mode of list.modes) {
                    if (mode.enabled) {
                        buttonHtml += `
                            <button class="option-button ${mode.type}-mode" data-list="${list.id}" data-mode-id="${mode.id}" data-mode-type="${mode.type}">
                                ${mode.name}
                            </button>
                        `;
                    }
                }
            }

            if (buttonHtml === '') {
                continue;
            }

            // 組合出完整的 "list-item" 區塊
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

        // 4. 綁定「中央監聽事件」
        container.addEventListener('click', handleModeClick);

    } catch (error) {
        console.error('載入首頁設定失敗:', error);
        const container = document.getElementById('list-options-container');
        if (container) {
            container.innerHTML = '<p>載入設定檔失敗。</p>';
        }
    }
}

// ⭐️ 5. 處理按鈕點擊的函式
function handleModeClick(event) {
    const button = event.target.closest('.option-button');
    if (!button) return;

    // 獲取按鈕上的所有資料
    const listId = button.dataset.list;
    const modeId = button.dataset.modeId; // ⭐️ "n3_review_kanji"
    const modeType = button.dataset.modeType; // ⭐️ "review"
    
    const isExamChecked = document.getElementById('exam-mode-toggle').checked;

    let isExam = false;
    // ⭐️ "review" 模式永遠不是考試
    if (isExamChecked && (modeType === 'quiz' || modeType === 'mcq')) {
        isExam = true;
    }

    // ⭐️ 產生最終的 URL 並跳轉 (包含 modeId)
    const url = `quiz.html?list=${listId}&mode_type=${modeType}&mode_id=${modeId}&exam=${isExam}`;
    window.location.href = url;
}
