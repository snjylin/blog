// ========== 弹框搜索 (基于 search.xml) - 修正 entry 解析 ==========
(function () {
    // ---------- 创建模态框 ----------
    function createModal() {
        if (document.getElementById('search-modal')) return;
        var modalHTML = `
            <div id="search-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(139,90,43,0.3); z-index:10000; align-items:center; justify-content:center;">
            <div style="background:#f6f0e8; width:85%; max-width:800px; max-height:85%; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.2); display:flex; flex-direction:column; border:1px solid #d2b48c;">
                <div style="padding:12px 20px; background:#f1e8dc; border-bottom:1px solid #d2b48c; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:18px; color:#8b5a2b;">搜索结果</h3>
                <span id="search-modal-close" style="cursor:pointer; font-size:24px; line-height:1; color:#8b5a2b; opacity:0.7;">&times;</span>
                </div>
                <div id="search-modal-body" style="padding:20px; overflow-y:auto; flex:1; color:#4a3b2c; font-family:inherit;">
                <!-- 结果动态填充 -->
                </div>
            </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        var modal = document.getElementById('search-modal');
        var closeBtn = document.getElementById('search-modal-close');
        closeBtn.onclick = function () { modal.style.display = 'none'; };
        modal.onclick = function (e) { if (e.target === modal) modal.style.display = 'none'; };
    }

    function showModal(contentHtml) {
        createModal();
        var modal = document.getElementById('search-modal');
        var bodyDiv = document.getElementById('search-modal-body');
        bodyDiv.innerHTML = contentHtml;
        modal.style.display = 'flex';
    }

    // function highlight(text, keyword) {
    //     if (!text) return '';
    //     var safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    //     var regex = new RegExp('(' + safeKeyword + ')', 'gi');
    //     return text.replace(regex, '<span style="background:#e6c8a0; font-weight:bold; color:#8b5a2b;">$1</span>');
    // }
    function highlight(text, keyword) {
        if (!text) return '';
        var safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('(' + safeKeyword + ')', 'gi');
        return text.replace(regex, '<span style="background:#e6c8a0; font-weight:bold; color:#8b5a2b; padding:0 2px; border-radius:2px;">$1</span>');
    }

    function getExcerpt(content, keyword, maxLen = 180) {
        if (!content) return '';
        var lower = content.toLowerCase();
        var kwLower = keyword.toLowerCase();
        var idx = lower.indexOf(kwLower);
        if (idx === -1) {
            var short = content.substring(0, maxLen);
            return highlight(short, keyword) + (content.length > maxLen ? '…' : '');
        }
        var start = Math.max(0, idx - 70);
        var end = Math.min(content.length, idx + keyword.length + 110);
        var excerpt = content.substring(start, end);
        if (start > 0) excerpt = '…' + excerpt;
        if (end < content.length) excerpt = excerpt + '…';
        return highlight(excerpt, keyword);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var searchForm = document.getElementById('search-form-wrap');
        if (!searchForm) return;
        var searchInput = searchForm.querySelector('input');
        if (!searchInput) return;

        searchForm.addEventListener('submit', function (e) { e.preventDefault(); performSearch(); });
        searchInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') { e.preventDefault(); performSearch(); } });

        function performSearch() {
            var keyword = searchInput.value.trim();
            if (keyword === '') return;
            showModal('<p>正在搜索...</p>');

            fetch('/search.xml')
                .then(function (res) { return res.text(); })
                .then(function (xmlString) {
                    var parser = new DOMParser();
                    var xml = parser.parseFromString(xmlString, 'text/xml');
                    // 关键修改: 使用 entry 而不是 item
                    var entries = xml.getElementsByTagName('entry');
                    console.log('总文章数(entry):', entries.length);

                    var results = [];
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        // 标题
                        var titleElem = entry.getElementsByTagName('title')[0];
                        var title = titleElem ? titleElem.textContent : '';
                        // 链接
                        var linkElem = entry.getElementsByTagName('link')[0];
                        var link = linkElem ? linkElem.getAttribute('href') : '#';
                        // 内容: <content type="html"> 下的 CDATA
                        var contentElem = entry.getElementsByTagName('content')[0];
                        var content = contentElem ? contentElem.textContent : '';
                        if (!content) {
                            // 降级尝试 description
                            var descElem = entry.getElementsByTagName('description')[0];
                            content = descElem ? descElem.textContent : '';
                        }

                        var lowerTitle = title.toLowerCase();
                        var lowerContent = content.toLowerCase();
                        var lowerKeyword = keyword.toLowerCase();
                        if (lowerTitle.indexOf(lowerKeyword) !== -1 || lowerContent.indexOf(lowerKeyword) !== -1) {
                            results.push({ title: title, link: link, content: content });
                        }
                    }

                    if (results.length === 0) {
                        showModal('<p>未找到与 "' + keyword + '" 相关的内容。</p>');
                        return;
                    }

                    var html = '<div style="margin-bottom:16px; font-weight:bold;">共找到 ' + results.length + ' 条结果：</div>';
                    for (var j = 0; j < results.length; j++) {
                        var r = results[j];
                        html += '<div style="margin-bottom:24px; border-bottom:1px solid #eee; padding-bottom:12px;">';
                        html += '<a href="' + r.link + '" style="font-size:18px; font-weight:bold; color:#8b5a2b; text-decoration:none; border-bottom:1px solid #d2b48c;">' + highlight(r.title, keyword) + '</a>';
                        html += '<div style="margin-top:8px; font-size:14px; color:#5a4a38; line-height:1.5;">' + getExcerpt(r.content, keyword) + '</div>';
                        html += '</div>';
                    }
                    showModal(html);
                })
                .catch(function (err) {
                    console.error('加载 search.xml 失败:', err);
                    showModal('<p style="color:red;">加载搜索数据失败，请检查 search.xml 是否存在。</p>');
                });
        }
    });
})();