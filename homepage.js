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

        // 2. 找到 HTML 中要放置按鈕的容器
        const container = document.getElementById('list-options-container');
        if (!container) {
            console.error('找不到 #list-options-container');
            return;
        }

        // (選用) 更新網頁標題
        document.title = config.siteTitle || '單字卡練習';
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = config.siteTitle;
        }

        let allHtml = ''; // 準備一個空字串來組合所有 HTML

        // 3. 遍歷 config.json 中的 "lists"
        for (const list of config.lists) {
            
            // 如果 "enabled": false，就跳過這個單字庫
            if (!list.enabled) {
                continue;
            }

            let buttonHtml = ''; // 這個單字庫的按鈕

            // 檢查 "review" 模式是否開啟
            if (list.modes.review) {
                buttonHtml += `
                    <a href="quiz.html?list=${list.id}&mode=review" class="option-button review-mode">
                        翻卡複習
                    </a>
                `;
            }

            // 檢查 "quiz" 模式是否開啟
            if (list.modes.quiz) {
                buttonHtml += `
                    <a href="quiz.html?list=${list.id}&mode=quiz" class="option-button quiz-mode">
                        輸入測驗
                    </a>
                `;
            }

            // 如果兩個按鈕都關閉，也不要顯示
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

        // 4. 將組合好的 HTML 放入頁面
        if (allHtml === '') {
            container.innerHTML = '<p>目前沒有可用的單字庫。</p>';
        } else {
            container.innerHTML = allHtml;
        }

    } catch (error) {
        console.error('載入首頁設定失敗:', error);
        const container = document.getElementById('list-options-container');
        if (container) {
            container.innerHTML = '<p>載入設定檔失敗。</p>';
        }
    }
}
