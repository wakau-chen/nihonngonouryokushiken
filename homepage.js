// 頁面載入完成後，執行
document.addEventListener('DOMContentLoaded', () => {
    // 監聽 URL Hash 的變化 (例如 #reader)
    window.addEventListener('hashchange', renderHomePage);
    // 第一次載入
    renderHomePage();
});

let globalConfig = null; // 儲存 config.json

async function renderHomePage() {
    try {
        // 1. 抓取 config.json (如果還沒抓過)
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
        const examToggle = document.getElementById('exam-toggle-container'); // 獲取考試勾選框
        
        if (!container || !mainTitle || !breadcrumbs || !examToggle) return;

        // 2. ⭐️ 解析 URL Hash (路徑)
        const path = window.location.hash.substring(1).split('/'); // #reader/lesson17
        
        let currentLevelItems = globalConfig.catalog;
        let currentCategory = null;
        let pathSegments = []; // 用於麵包屑
        let currentHash = '#';

        // 3. ⭐️ 根據路徑，深入 "catalog"
        for (const segment of path) {
            if (segment === "") continue;
            const found = currentLevelItems.find(item => item.id === segment);
            if (found && found.type === 'category') {
                currentLevelItems = found.items;
                currentCategory = found;
                currentHash += segment + '/';
                pathSegments.push({ name: found.name, hash: currentHash.slice(0, -1) }); // 移除結尾的 /
            }
        }

        // 4. 設定標題
        mainTitle.textContent = currentCategory ? currentCategory.name : globalConfig.siteTitle;

        // 5. 產生麵包屑
        breadcrumbs.innerHTML = '<li><a href="#">首頁</a></li>';
        pathSegments.forEach(segment => {
            breadcrumbs.innerHTML += `<li><a href="${segment.hash}">${segment.name}</a></li>`;
        });

        // 6. 產生按鈕
        let allHtml = ''; 
        let hasModes = false; // 偵測是否已到「模式選擇」

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
                // 我們不再直接連結，而是顯示它內部的 "modes"
                hasModes = true; // 告訴 UI 這是最後一層了
                allHtml += `
                    <div class="list-item">
                        <h4>${item.name}</h4>
                        <div class="button-group">
                `;

                if (item.modes && Array.isArray(item.modes)) {
                    for (const mode of item.modes) {
                        if (mode.enabled) {
                            // ⭐️ 關鍵：按鈕現在是 <button>，不是 <a>
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
        
        // 7. ⭐️ 顯示/隱藏「考試模式」勾選框
        // 只有在「模式選擇」畫面才顯示
        if (hasModes) {
            examToggle.style.display = 'block';
        } else {
            examToggle.style.display = 'none';
        }

        container.innerHTML = allHtml;
        
        // 8. ⭐️ 移除舊的監聽，綁定新的
        container.removeEventListener('click', handleHomePageClick); // 移除舊的
        container.addEventListener('click', handleHomePageClick); // 綁定新的

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

    // 檢查這是否是一個「模式」按鈕 (最終按鈕)
    const listId = button.dataset.listId;
    const modeId = button.dataset.modeId;
    const modeType = button.dataset.modeType;

    if (listId && modeId) {
        // --- 這是最終按鈕，我們要跳轉到 quiz.html ---
        event.preventDefault(); // 阻止 <a> (如果它是 <a>)
        
        const isExamChecked = document.getElementById('exam-mode-toggle').checked;
        let isExam = false;
        
        // 只有 "quiz" 或 "mcq" 才能是考試
        if (isExamChecked && (modeType === 'quiz' || modeType === 'mcq')) {
            isExam = true;
        }

        // 產生最終的 URL 並跳轉
        const url = `quiz.html?list=${listId}&mode_id=${modeId}&exam=${isExam}`;
        window.location.href = url;
    }
    
    // 如果不是「模式」按鈕 (而是 "list-button")，
    // 它就是一個 <a> 標籤，我們會讓它
    // 自動跳轉 (例如 href="#reader") 並觸發 'hashchange' 事件
}
