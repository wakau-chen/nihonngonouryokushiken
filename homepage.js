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

        const container = document.getElementById('list-container');
        if (!container) return;

        document.title = config.siteTitle || '單字卡練習';
        const mainTitle = document.getElementById('main-title');
        if (mainTitle) {
            mainTitle.textContent = config.siteTitle;
        }

        let allHtml = ''; 

        // 2. ⭐️ 遍歷 "lists" (只產生單字庫)
        for (const list of config.lists) {
            
            if (!list.enabled) {
                continue;
            }

            // ⭐️ 關鍵：不再產生模式按鈕，
            // 只產生一個代表 "單字庫" 的連結 (用 <a> 標籤)
            allHtml += `
                <a href="quiz.html?list=${list.id}" class="option-button list-button">
                    ${list.name}
                </a>
            `;
        }

        container.innerHTML = allHtml;
        
        // (不再需要 'click' 監聽，因為 <a> 標籤會自動跳轉)

    } catch (error) {
        console.error('載入首頁設定失敗:', error);
        const container = document.getElementById('list-container');
        if (container) {
            container.innerHTML = '<p>載入設定檔失敗。</p>';
        }
    }
}
