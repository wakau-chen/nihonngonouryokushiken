// 頁面載入完成後，執行
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('hashchange', renderHomePage);
    renderHomePage();
});

let globalConfig = null; // 儲存 config.json

async function renderHomePage() {
    try {
        if (!globalConfig) {
            const response = await fetch('config.json?v=' + new Date().getTime());
            if (!response.ok) {
                throw new Error('無法讀取 config.json');
            }
            globalConfig = await response.json();
            document.title = globalConfig.siteTitle || '單字卡練習';
        }

        const container = document.getElementById('list-container');
        const mainTitle = document.getElementById('main-title');
        const breadcrumbs = document.getElementById('breadcrumbs');
        
        if (!container || !mainTitle || !breadcrumbs) return;

        const path = window.location.hash.substring(1).split('/');
        
        let currentLevelItems = globalConfig.catalog;
        let currentCategory = null;
        let pathSegments = []; 
        let currentHash = '#';

        for (const segment of path) {
            if (segment === "") continue;
            const found = currentLevelItems.find(item => item.id === segment);
            if (found && found.type === 'category') {
                currentLevelItems = found.items;
                currentCategory = found;
                currentHash += segment + '/';
                pathSegments.push({ name: found.name, hash: currentHash.slice(0, -1) });
            }
        }

        mainTitle.textContent = currentCategory ? currentCategory.name : globalConfig.siteTitle;

        breadcrumbs.innerHTML = '<li><a href="#">首頁</a></li>';
        pathSegments.forEach(segment => {
            breadcrumbs.innerHTML += `<li><a href="${segment.hash}">${segment.name}</a></li>`;
        });

        // ⭐️ 6. 關鍵：產生「返回」按鈕 (如果不在首頁)
        let allHtml = ''; 
        if (currentCategory) { // "currentCategory" 只有在 "非首頁" 時才會有值
            let parentHash = '#'; // 預設返回 "首頁"
            if (pathSegments.length > 1) {
                // 如果層級大於 1，返回「倒數第二個」麵包屑
                parentHash = pathSegments[pathSegments.length - 2].hash;
            }
            
            // ⭐️ 新增「返回上一層」按鈕
            allHtml += `
                <a href="${parentHash}" class="option-button back-button">
                    &larr; 返回上一層
                </a>
            `;
        }

        // 7. 產生按鈕
        let hasModes = false; 
        for (const item of currentLevelItems) {
            
            if (item.enabled === false) continue;

            if (item.type === 'category') {
                // --- 這是一個「資料夾」 ---
                allHtml += `
                    <a href="#${pathSegments.map(p => p.hash.substring(1)).join('/')}${pathSegments.length > 0 ? '/' : ''}${item.id}" class="option-button list-button">
                        ${item.name}
                    </a>
                `;
            } else if (item.type === 'list') {
                // --- 這是一個「單字庫」 ---
                hasModes = true; 
                allHtml += `
                    <div class="list-item">
                        <h4>${item.name}</h4>
                        <div class="button-group">
                `;

                if (item.modes && Array.isArray(item.modes)) {
                    for (const mode of item.modes) {
                        if (mode.enabled) {
                            allHtml += `
                                <button class="option-button ${mode.type}-mode" data-list-id="${item.id}" data-mode-id="${mode.id}" data-mode-type="${mode.type}">
                                    ${mode.name}
                                </button>
                            `;
                        }
                    }
                }
                allHtml += `</div></div>`;
            }
        }
        
        container.innerHTML = allHtml;
        
        container.removeEventListener('click', handleHomePageClick); 
        container.addEventListener('click', handleHomePageClick); 

    } catch (error) {
        console.error('載入首頁設定失敗:', error);
        const container = document.getElementById('list-container');
        if (container) {
            container.innerHTML = '<p>載入設定檔失敗。</p>';
        }
    }
}

// ⭐️ 9. 處理所有首頁點擊
function handleHomePageClick(event) {
    const button = event.target.closest('.option-button');
    if (!button) return;

    // ⭐️ 檢查是否點擊了「模式」按鈕 (最終按鈕)
    const listId = button.dataset.listId;
    const modeId = button.dataset.modeId;

    if (listId && modeId) {
        event.preventDefault(); 
        
        // (我們移除了 "考試模式" 勾選框，所以 exam=false)
        const isExam = false; 

        const url = `quiz.html?list=${listId}&mode_id=${modeId}&exam=${isExam}`;
        window.location.href = url;
    }
    
    // 如果點的不是「模式」按鈕 (而是 "list-button" 或 "back-button")
    // 它就是一個 <a> 標籤，我們會讓它
    // 自動跳轉 (例如 href="#reader" 或 href="#") 並觸發 'hashchange' 事件
}
