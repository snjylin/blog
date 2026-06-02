(function () {
    // 注入样式（保持之前主题色，已修复底部横线）
    if (!document.getElementById('search-inline-styles')) {
        var style = document.createElement('style');
        style.id = 'search-inline-styles';
        style.textContent = `
      .search-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(139,90,43,0.3); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
      }
      .search-modal-container {
        background: #f6f0e8; width: 85%; max-width: 800px; max-height: 85%;
        border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        display: flex; flex-direction: column; border: 1px solid #d2b48c;
      }
      .search-modal-header {
        padding: 12px 20px; background: #f1e8dc; border-bottom: 1px solid #d2b48c;
        display: flex; justify-content: space-between; align-items: center;
      }
      .search-modal-header h3 {
        margin: 0; font-size: 18px; color: #8b5a2b;
      }
      .search-modal-close {
        cursor: pointer; font-size: 24px; line-height: 1; color: #8b5a2b; opacity: 0.7;
      }
      .search-modal-close:hover { opacity: 1; }
      .search-modal-body {
        padding: 20px 20px 10px 20px;
        overflow-y: auto;
        flex: 1;
        color: #4a3b2c;
      }
      .search-result-item {
        margin-bottom: 24px;
        border-bottom: 1px solid #d2b48c;
        padding-bottom: 12px;
      }
      .search-result-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .search-result-title {
        font-size: 18px; font-weight: bold; color: #8b5a2b; text-decoration: none;
      }
      .search-result-title:hover {
        text-decoration: underline; color: #6b421e;
      }
      .search-result-excerpt {
        margin-top: 8px; font-size: 14px; color: #5a4a38; line-height: 1.5;
      }
      .search-highlight {
        background: #e6c8a0; font-weight: bold; color: #8b5a2b; padding: 0 2px; border-radius: 2px;
      }
    `;
        document.head.appendChild(style);
    }

    function createModal() {
        if (document.getElementById('search-modal')) return;
        var modalHTML = `
      <div id="search-modal" class="search-modal-overlay" style="display:none;">
        <div class="search-modal-container">
          <div class="search-modal-header">
            <h3>搜索结果</h3>
            <span id="search-modal-close" class="search-modal-close">&times;</span>
          </div>
          <div id="search-modal-body" class="search-modal-body"></div>
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

    // 高亮关键词（纯文本）
    function highlight(text, keyword) {
        if (!text) return '';
        var safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('(' + safeKeyword + ')', 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    // 将 HTML 转换为纯文本（去掉所有标签）
    function htmlToPlainText(html) {
        if (!html) return '';
        var div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // 截取摘要（纯文本，不包含任何 HTML 标签）
    function getExcerpt(plainText, keyword, maxLen) {
        maxLen = maxLen || 180;
        if (!plainText) return '';
        var lower = plainText.toLowerCase();
        var kwLower = keyword.toLowerCase();
        var idx = lower.indexOf(kwLower);
        if (idx === -1) {
            var short = plainText.substring(0, maxLen);
            return highlight(short, keyword) + (plainText.length > maxLen ? '…' : '');
        }
        var start = Math.max(0, idx - 70);
        var end = Math.min(plainText.length, idx + keyword.length + 110);
        var excerpt = plainText.substring(start, end);
        if (start > 0) excerpt = '…' + excerpt;
        if (end < plainText.length) excerpt = excerpt + '…';
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
                    var entries = xml.getElementsByTagName('entry');
                    var results = [];

                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var titleElem = entry.getElementsByTagName('title')[0];
                        var title = titleElem ? titleElem.textContent : '';
                        var linkElem = entry.getElementsByTagName('link')[0];
                        var link = linkElem ? linkElem.getAttribute('href') : '#';
                        var contentElem = entry.getElementsByTagName('content')[0];
                        var rawHtml = contentElem ? contentElem.textContent : '';
                        // 转换为纯文本（禁用超链接）
                        var plainContent = rawHtml ? htmlToPlainText(rawHtml) : '';
                        if (!plainContent) {
                            var descElem = entry.getElementsByTagName('description')[0];
                            if (descElem) plainContent = htmlToPlainText(descElem.textContent);
                        }

                        if (title.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 ||
                            plainContent.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
                            results.push({ title: title, link: link, plainContent: plainContent });
                        }
                    }

                    if (results.length === 0) {
                        showModal('<p>未找到与 "' + keyword + '" 相关的内容。</p>');
                        return;
                    }

                    var html = '<div style="margin-bottom:16px; font-weight:bold; color:#8b5a2b;">共找到 ' + results.length + ' 条结果：</div>';
                    for (var j = 0; j < results.length; j++) {
                        var r = results[j];
                        html += '<div class="search-result-item">';
                        html += '<a href="' + r.link + '" class="search-result-title">' + highlight(r.title, keyword) + '</a>';
                        html += '<div class="search-result-excerpt">' + getExcerpt(r.plainContent, keyword) + '</div>';
                        html += '</div>';
                    }
                    showModal(html);
                })
                .catch(function (err) {
                    console.error(err);
                    showModal('<p style="color:#8b5a2b;">加载搜索数据失败，请刷新页面重试。</p>');
                });
        }
    });
})();