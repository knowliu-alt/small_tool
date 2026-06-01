/**
 * SQL 格式化工具
 * 纯前端、零依赖。负责：格式化、压缩、关键字大小写、语法着色、拷贝
 */
$(document).ready(function () {

    $("#goback").click(function () { gobackPopup(); });

    // 粘贴时去掉富文本格式
    $("#sql-display").on("paste", function (e) { textInit(e); });

    // 括号配对高亮：点击括号 → 把配对的两个括号加上 .match；跨行还会画一条虚线引导
    $("#sql-display").on("click", ".sql-paren", function (e) {
        clearParenGuide();
        $("#sql-display .sql-paren.match").removeClass('match');
        var pair = $(this).attr('data-pair');
        if (pair === undefined || pair === null || pair === '') {
            // 未匹配的孤立括号
            $(this).addClass('match');
            e.stopPropagation();
            return;
        }
        var $pair = $("#sql-display .sql-paren[data-pair='" + pair + "']");
        $pair.addClass('match');
        // 跨行才画引导线
        if ($pair.length === 2) {
            drawParenGuide($pair.eq(0), $pair.eq(1));
        }
        e.stopPropagation();
    });

    // 点击非括号区域 → 清除配对高亮 + 引导线
    $("#sql-display").on("click", function (e) {
        if (!$(e.target).hasClass('sql-paren')) {
            $("#sql-display .sql-paren.match").removeClass('match');
            clearParenGuide();
        }
    });

    // 容器内容滚动 / 窗口大小变化时，刷新引导线位置
    $("#sql-display").on("scroll", function () { refreshParenGuide(); });
    $(window).on("resize", function () { refreshParenGuide(); });

    /** 清除引导线 */
    function clearParenGuide() {
        $("#sql-display .paren-guide").remove();
    }

    /** 根据当前 .match 的两个括号刷新引导线 */
    function refreshParenGuide() {
        var $matched = $("#sql-display .sql-paren.match");
        if ($matched.length !== 2) return;
        clearParenGuide();
        drawParenGuide($matched.eq(0), $matched.eq(1));
    }

    /** 在 #sql-display 内画一条从开括号到闭括号的纵向虚线 */
    function drawParenGuide($a, $b) {
        var $container = $("#sql-display");
        if ($a.length !== 1 || $b.length !== 1) return;

        // 让两个括号按出现顺序：top 是较上的，bot 是较下的
        var ra = $a[0].getBoundingClientRect();
        var rb = $b[0].getBoundingClientRect();
        var topRect, botRect;
        if (ra.top <= rb.top) { topRect = ra; botRect = rb; }
        else { topRect = rb; botRect = ra; }

        // 同一行不画
        if (Math.abs(botRect.top - topRect.top) < 2) return;

        var cRect = $container[0].getBoundingClientRect();
        // 引导线 x 位置：取开括号的左侧（视觉上沿着内容缩进列）
        var x = topRect.left - cRect.left + $container.scrollLeft();
        // y 起点：开括号下沿；y 终点：闭括号上沿
        var yTop = topRect.bottom - cRect.top + $container.scrollTop();
        var yBot = botRect.top    - cRect.top + $container.scrollTop();
        var height = yBot - yTop;
        if (height < 4) return;

        var $guide = $('<div class="paren-guide"></div>').css({
            position: 'absolute',
            left:   x + 'px',
            top:    yTop + 'px',
            height: height + 'px',
            width:  '0px'
        });
        $container.append($guide);
    }

    // 取出当前显示区里的纯文本 SQL（去除高亮 span 与错误提示）
    function getCurrentSql() {
        var $clone = $("#sql-display").clone(false);
        $clone.find("div.error").remove();
        return $clone.text();
    }

    function setLocal(v)  { setLocalStorage('sql.input.jv', v); }
    function getLocal()   { return getLocalStorage('sql.input.jv'); }

    function showError(sqlText, msg) {
        $("#sql-display").text(sqlText);
        $("#sql-display").append("<div class='error'>" + msg + "</div>");
    }

    // 读取格式化选项（方言 / 关键字大小写 / 行宽）
    function readOptions() {
        return {
            dialect:     ($("#dialect_select").val() || 'postgresql'),
            keywordCase: ($("#kwcase_select").val()  || 'preserve'),
            width:       parseInt($("#width_select").val(), 10) || 100
        };
    }

    function saveOptions() {
        var o = readOptions();
        setLocalStorage('sql.opt.dialect',     o.dialect);
        setLocalStorage('sql.opt.keywordCase', o.keywordCase);
        setLocalStorage('sql.opt.width',       String(o.width));
    }

    function restoreOptions() {
        var d = getLocalStorage('sql.opt.dialect');
        var k = getLocalStorage('sql.opt.keywordCase');
        var w = getLocalStorage('sql.opt.width');
        if (d) $("#dialect_select").val(d);
        if (k) $("#kwcase_select").val(k);
        if (w) $("#width_select").val(w);
    }
    restoreOptions();
    $("#dialect_select, #kwcase_select, #width_select").on('change', saveOptions);

    /**
     * 统一的格式化入口：
     * - 选择 "simple" 时走自研轻量实现 formatSql()
     * - 否则走 sql-formatter（按选定方言）
     */
    function smartFormat(sql) {
        var opt = readOptions();
        if (opt.dialect === 'simple' || typeof window.sqlFormatter === 'undefined') {
            // 自研引擎：先做关键字大小写
            var pre = sql;
            if (opt.keywordCase === 'upper') pre = changeKeywordCase(pre, true);
            else if (opt.keywordCase === 'lower') pre = changeKeywordCase(pre, false);
            return formatSql(pre);
        }
        // sql-formatter：原生支持 keywordCase / expressionWidth
        return window.sqlFormatter.format(sql, {
            language:        opt.dialect,
            keywordCase:     opt.keywordCase,         // 'preserve' | 'upper' | 'lower'
            tabWidth:        4,
            useTabs:         false,
            expressionWidth: opt.width,
            linesBetweenQueries: 1,
            denseOperators:  true
        });
    }

    $("#format_btn").click(function () {
        var sql = getCurrentSql();
        if (!sql.trim()) return;
        try {
            var formatted = smartFormat(sql);
            renderHighlighted(formatted);
            setLocal(formatted);
        } catch (err) {
            // sql-formatter 解析失败时回退到自研引擎
            try {
                var fallback = formatSql(sql);
                renderHighlighted(fallback);
                setLocal(fallback);
                $("#sql-display").append(
                    "<div class='error'>当前方言解析失败，已回退到轻量引擎。原因：" +
                    escapeHtml(err.message || String(err)) + "</div>"
                );
            } catch (e2) {
                showError(sql, err.message || String(err));
            }
        }
    });

    $("#compress_btn").click(function () {
        var sql = getCurrentSql();
        if (!sql.trim()) return;
        try {
            var compact = compressSql(sql);
            $("#sql-display").text(compact);
            setLocal(compact);
        } catch (err) {
            showError(sql, err.message);
        }
    });

    $("#upper_btn").click(function () {
        var sql = getCurrentSql();
        if (!sql.trim()) return;
        $("#kwcase_select").val('upper');
        saveOptions();
        try {
            var out = smartFormat(sql);
            renderHighlighted(out);
            setLocal(out);
        } catch (err) {
            var converted = changeKeywordCase(sql, true);
            renderHighlighted(formatSql(converted));
            setLocal(converted);
        }
    });

    $("#lower_btn").click(function () {
        var sql = getCurrentSql();
        if (!sql.trim()) return;
        $("#kwcase_select").val('lower');
        saveOptions();
        try {
            var out = smartFormat(sql);
            renderHighlighted(out);
            setLocal(out);
        } catch (err) {
            var converted = changeKeywordCase(sql, false);
            renderHighlighted(formatSql(converted));
            setLocal(converted);
        }
    });

    $("#clean_btn").click(function () {
        $("#sql-display").empty();
        setLocal("");
    });

    $("#title_btn").click(function () { location.reload(); });

    /** 拷贝：同时写入 text/html（保留高亮）和 text/plain（保留缩进） */
    $("#copy_btn").click(function () {
        var $display = $("#sql-display");
        var $clone = $display.clone(false);
        $clone.find("div.error").remove();
        var plainText = $clone.text();

        var $htmlClone = $display.clone(true);
        $htmlClone.find("div.error").remove();
        // 把 CSS 类的颜色内联进 style，确保粘贴到富文本编辑器里仍有高亮
        var styleMap = {
            'sql-keyword':  'color:#5dade2;font-weight:bold;',
            'sql-function': 'color:#f5b041;',
            'sql-string':   'color:#58d68d;',
            'sql-number':   'color:#f1948a;',
            'sql-comment':  'color:#95a5a6;font-style:italic;',
            'sql-operator': 'color:#ec7063;',
            'sql-punct':    'color:#ffffff;'
        };
        $.each(styleMap, function (cls, css) {
            $htmlClone.find('.' + cls).each(function () {
                var existing = $(this).attr('style') || '';
                $(this).attr('style', existing + css);
            });
        });
        var htmlContent = '<pre style="font-family:Menlo,Consolas,monospace;background:#1c2833;color:#f5f5f5;padding:10px;border-radius:4px;white-space:pre;">'
            + $htmlClone.html() + '</pre>';

        function fallbackCopy() {
            var tmp = document.createElement('div');
            tmp.contentEditable = 'true';
            tmp.style.position = 'fixed';
            tmp.style.left = '-9999px';
            tmp.innerHTML = htmlContent;
            document.body.appendChild(tmp);
            var range = document.createRange();
            range.selectNodeContents(tmp);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            try { document.execCommand('copy'); } catch (e) {}
            sel.removeAllRanges();
            document.body.removeChild(tmp);
        }

        if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            try {
                var item = new ClipboardItem({
                    'text/html':  new Blob([htmlContent], { type: 'text/html' }),
                    'text/plain': new Blob([plainText],   { type: 'text/plain' })
                });
                navigator.clipboard.write([item]).then(
                    function () { flashCopyBtn(true); },
                    function () { fallbackCopy(); flashCopyBtn(true); }
                );
            } catch (e) {
                fallbackCopy(); flashCopyBtn(true);
            }
        } else {
            fallbackCopy(); flashCopyBtn(true);
        }
    });

    function flashCopyBtn(ok) {
        var $btn = $("#copy_btn");
        var orig = $btn.data('origVal') || $btn.val();
        $btn.data('origVal', orig);
        $btn.val(ok ? '已拷贝' : '拷贝失败');
        setTimeout(function () { $btn.val(orig); }, 1200);
    }

    if ($("#sql_all").length <= 0) {
        setLocalStorage('page.current', "sql");
    }

    // 初始化：恢复上次内容（用智能格式化重新渲染高亮）
    var last = getLocal();
    if (last) {
        try { renderHighlighted(smartFormat(last)); }
        catch (e) {
            try { renderHighlighted(formatSql(last)); }
            catch (e2) { $("#sql-display").text(last); }
        }
    }
});

/* 防止粘贴时把外部样式带进来 */
function textInit(e) {
    e.preventDefault();
    var clp = (e.originalEvent || e).clipboardData;
    var text = clp ? (clp.getData('text/plain') || "") : (window.clipboardData ? window.clipboardData.getData("text") : "");
    if (text) document.execCommand('insertText', false, text);
}

/* ========================= SQL 处理核心 ========================= */

// 常见 SQL 关键字（用于格式化与大小写转换）
var SQL_KEYWORDS = [
    'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','LIKE','BETWEEN','EXISTS',
    'INSERT','INTO','VALUES','UPDATE','SET','DELETE',
    'CREATE','TABLE','DROP','ALTER','ADD','COLUMN','INDEX','VIEW','DATABASE','SCHEMA',
    'JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','ON','USING',
    'GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','UNION','ALL','DISTINCT','AS',
    'CASE','WHEN','THEN','ELSE','END',
    'IF','BEGIN','DECLARE','RETURN','WHILE','LOOP',
    'TRUE','FALSE','ASC','DESC','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','DEFAULT',
    'CONSTRAINT','AUTO_INCREMENT','UNSIGNED','ZEROFILL','CHARACTER','COLLATE',
    'WITH','RECURSIVE','OVER','PARTITION','ROW_NUMBER','RANK','DENSE_RANK',
    'GRANT','REVOKE','COMMIT','ROLLBACK','TRANSACTION','SAVEPOINT',
    'EXPLAIN','DESCRIBE','SHOW','USE','REPLACE','TRUNCATE'
];
// 触发独占一行 + 后续缩进的关键字（顶层）
var BREAK_TOP = [
    'SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','UNION','UNION ALL',
    'INSERT INTO','VALUES','UPDATE','SET','DELETE FROM','ON','CREATE TABLE','DROP TABLE',
    'ALTER TABLE','LEFT JOIN','RIGHT JOIN','INNER JOIN','FULL JOIN','CROSS JOIN','JOIN'
];
// 仅换行（不影响缩进层级）
var BREAK_INLINE = ['AND','OR'];

var KW_SET = (function () {
    var s = {};
    SQL_KEYWORDS.forEach(function (k) { s[k] = true; });
    return s;
})();

/** 词法分析：把 SQL 切成 token 流 */
function tokenizeSql(sql) {
    var tokens = [];
    var i = 0, n = sql.length;
    while (i < n) {
        var c = sql[i];

        // 空白
        if (/\s/.test(c)) {
            var j = i;
            while (j < n && /\s/.test(sql[j])) j++;
            tokens.push({ type: 'ws', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 行注释 --
        if (c === '-' && sql[i + 1] === '-') {
            var j = i;
            while (j < n && sql[j] !== '\n') j++;
            tokens.push({ type: 'comment', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 块注释 /* */
        if (c === '/' && sql[i + 1] === '*') {
            var j = i + 2;
            while (j < n && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
            j = Math.min(n, j + 2);
            tokens.push({ type: 'comment', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 字符串 ' ' 或 " "
        if (c === "'" || c === '"') {
            var quote = c, j = i + 1;
            while (j < n) {
                if (sql[j] === '\\') { j += 2; continue; }
                if (sql[j] === quote) { j++; break; }
                j++;
            }
            tokens.push({ type: 'string', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 反引号标识符 `xxx`
        if (c === '`') {
            var j = i + 1;
            while (j < n && sql[j] !== '`') j++;
            j = Math.min(n, j + 1);
            tokens.push({ type: 'ident', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 数字
        if (/[0-9]/.test(c)) {
            var j = i;
            while (j < n && /[0-9.]/.test(sql[j])) j++;
            tokens.push({ type: 'number', value: sql.slice(i, j) });
            i = j; continue;
        }
        // 标识符/关键字
        if (/[A-Za-z_@#]/.test(c)) {
            var j = i;
            while (j < n && /[A-Za-z0-9_@#$.]/.test(sql[j])) j++;
            var word = sql.slice(i, j);
            var upper = word.toUpperCase();
            if (KW_SET[upper]) tokens.push({ type: 'keyword', value: word, upper: upper });
            else tokens.push({ type: 'ident', value: word });
            i = j; continue;
        }
        // 标点
        if (c === '(' || c === ')' || c === ',' || c === ';') {
            tokens.push({ type: 'punct', value: c });
            i++; continue;
        }
        // 运算符（多字符优先）
        var two = sql.substr(i, 2);
        if (['<=', '>=', '<>', '!=', '||', '&&', ':='].indexOf(two) >= 0) {
            tokens.push({ type: 'op', value: two });
            i += 2; continue;
        }
        if ('+-*/%=<>!~^&|'.indexOf(c) >= 0) {
            tokens.push({ type: 'op', value: c });
            i++; continue;
        }
        // 其他字符兜底
        tokens.push({ type: 'other', value: c });
        i++;
    }
    return tokens;
}

/** 把所有 token 连接为可读字符串（不含格式化） */
function tokensToString(tokens) {
    return tokens.map(function (t) { return t.value; }).join('');
}

/** 关键字大小写转换 */
function changeKeywordCase(sql, toUpper) {
    var tokens = tokenizeSql(sql);
    return tokens.map(function (t) {
        if (t.type === 'keyword') return toUpper ? t.value.toUpperCase() : t.value.toLowerCase();
        return t.value;
    }).join('');
}

/** 压缩：去多余空白与换行 */
function compressSql(sql) {
    var tokens = tokenizeSql(sql).filter(function (t) { return t.type !== 'ws'; });
    var out = '';
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i], prev = tokens[i - 1];
        if (i === 0) { out += t.value; continue; }
        // ) 或 , 或 ; 紧贴前一个 token
        if (t.type === 'punct' && (t.value === ',' || t.value === ')' || t.value === ';')) {
            out += t.value; continue;
        }
        // ( 之后的 token 紧贴 (
        if (prev && prev.type === 'punct' && prev.value === '(') { out += t.value; continue; }
        // 函数调用：ident 或 keyword 后面紧跟 ( ，且这个 keyword 不是子句关键字
        if (t.type === 'punct' && t.value === '(' && prev) {
            if (prev.type === 'ident') { out += t.value; continue; }
            if (prev.type === 'keyword' && !isClauseKeyword(prev.upper)) { out += t.value; continue; }
        }
        out += ' ' + t.value;
    }
    return out.trim();
}

// 这些关键字后面如果跟 ( ，不应被视为函数调用（它们是子句/操作符）
var CLAUSE_KEYWORDS_BEFORE_PAREN = {
    'SELECT': true, 'FROM': true, 'WHERE': true, 'AND': true, 'OR': true, 'NOT': true,
    'IN': true, 'EXISTS': true, 'ON': true, 'USING': true, 'BY': true, 'HAVING': true,
    'VALUES': true, 'SET': true, 'WHEN': true, 'THEN': true, 'ELSE': true, 'CASE': true,
    'JOIN': true, 'UNION': true, 'ALL': true, 'AS': true, 'BETWEEN': true, 'LIKE': true,
    'IS': true, 'NULL': true, 'TRUE': true, 'FALSE': true, 'WITH': true, 'OVER': true,
    'PARTITION': true, 'GROUP': true, 'ORDER': true, 'LIMIT': true, 'OFFSET': true,
    'INTO': true, 'UPDATE': true, 'INSERT': true, 'DELETE': true, 'REPLACE': true,
    'LEFT': true, 'RIGHT': true, 'INNER': true, 'OUTER': true, 'FULL': true, 'CROSS': true
};
function isClauseKeyword(upper) {
    return CLAUSE_KEYWORDS_BEFORE_PAREN[upper] === true;
}

/**
 * 格式化：基于 token 流，按关键字断行并维护缩进
 * 关键改进：
 *   - 用括号栈区分"函数调用括号"和"子查询括号"
 *   - 函数调用括号内的逗号不换行
 *   - 简单分组括号（IN(...) 等）若内容短也保持单行
 */
function formatSql(sql) {
    var compact = compressSql(sql);
    var tokens = tokenizeSql(compact).filter(function (t) { return t.type !== 'ws'; });

    var INDENT_STR = '    ';
    var indent = 0;
    var out = '';
    var atLineStart = true;

    // 括号栈：每个元素 { kind: 'func'|'subquery'|'group', indent: 进入前缩进, multiline: 是否换行模式 }
    var parenStack = [];

    function currentParen() { return parenStack[parenStack.length - 1] || null; }

    // 是否在函数调用括号内（不换行）
    function inInlineParen() {
        for (var i = parenStack.length - 1; i >= 0; i--) {
            if (parenStack[i].multiline) return false;
            if (parenStack[i].kind === 'func' || parenStack[i].kind === 'group') return true;
        }
        return false;
    }

    function newline() {
        out = out.replace(/[ \t]+$/, '');
        out += '\n' + INDENT_STR.repeat(Math.max(0, indent));
        atLineStart = true;
    }

    function appendToken(text) {
        if (atLineStart) {
            out += text;
            atLineStart = false;
        } else {
            // 紧贴前一个 token 的情况：标点
            if (text === ',' || text === ')' || text === ';') {
                out += text;
            } else if (out.length > 0 && out.charAt(out.length - 1) === '(') {
                // 左括号后内容紧贴
                out += text;
            } else if (out.length > 0 && /[ \t]$/.test(out)) {
                // 已以空格结尾（例如逗号后手动追加的）：直接拼接
                out += text;
            } else {
                out += ' ' + text;
            }
        }
    }

    // 预扫描：判断从 i (指向 '(') 开始的括号块是子查询、函数调用还是简单分组
    function classifyParen(i) {
        var prev = tokens[i - 1];
        var prev2 = tokens[i - 2];
        // 找到匹配的 )，并扫描内部是否含顶级子句关键字
        var depth = 0;
        var hasTopClause = false;
        var contentLen = 0;
        for (var k = i; k < tokens.length; k++) {
            var tk = tokens[k];
            if (tk.type === 'punct' && tk.value === '(') depth++;
            else if (tk.type === 'punct' && tk.value === ')') {
                depth--;
                if (depth === 0) break;
            } else if (depth === 1) {
                contentLen += tk.value.length + 1;
                if (tk.type === 'keyword') {
                    var u = tk.upper;
                    if (u === 'SELECT' || u === 'FROM' || u === 'WHERE' ||
                        u === 'GROUP' || u === 'ORDER' || u === 'HAVING' ||
                        u === 'UNION' || u === 'WITH' || u === 'LIMIT') {
                        hasTopClause = true;
                    }
                }
            }
        }
        // 是函数调用：前一个是 ident 或非子句关键字（如 COUNT、SUM），且内部不含顶级子句
        var isFunc = false;
        if (prev) {
            if (prev.type === 'ident') {
                // 排除"表名+列清单"场景：INTO users(...)、UPDATE users(...)、TABLE users(...) 等
                isFunc = true;
                if (prev2 && prev2.type === 'keyword') {
                    var pu = prev2.upper;
                    if (pu === 'INTO' || pu === 'UPDATE' || pu === 'TABLE' ||
                        pu === 'FROM' || pu === 'JOIN' || pu === 'USING') {
                        isFunc = false;
                    }
                }
            } else if (prev.type === 'keyword' && !isClauseKeyword(prev.upper)) {
                isFunc = true;
            }
        }
        if (hasTopClause) return { kind: 'subquery', multiline: true, len: contentLen };
        if (isFunc) return { kind: 'func', multiline: false, len: contentLen };
        // 简单分组：长度小于阈值则单行，否则换行
        var multiline = contentLen > 60;
        return { kind: 'group', multiline: multiline, len: contentLen };
    }

    var i = 0;
    while (i < tokens.length) {
        var t = tokens[i];

        if (t.type === 'keyword') {
            // 在函数调用括号内：不换行，所有关键字按普通 token 处理
            if (inInlineParen()) {
                appendToken(t.value);
                i++; continue;
            }

            // 处理两词关键字
            var combo = null;
            var next = tokens[i + 1];
            if (next && next.type === 'keyword') {
                var pair = (t.upper + ' ' + next.upper);
                if (BREAK_TOP.indexOf(pair) >= 0) combo = pair;
            }
            var single = t.upper;

            if (combo) {
                if (out.length > 0) {
                    if (indent > 0) indent = Math.max(0, indent - 1);
                    newline();
                }
                appendToken(combo);
                newline();
                indent++;
                out = out.replace(/[ \t]*$/, INDENT_STR.repeat(indent));
                i += 2;
                continue;
            }
            if (BREAK_TOP.indexOf(single) >= 0) {
                if (out.length > 0) {
                    if (indent > 0) indent = Math.max(0, indent - 1);
                    newline();
                }
                appendToken(t.value);
                newline();
                indent++;
                out = out.replace(/[ \t]*$/, INDENT_STR.repeat(indent));
                i++;
                continue;
            }
            if (BREAK_INLINE.indexOf(single) >= 0) {
                newline();
                appendToken(t.value);
                i++;
                continue;
            }
            appendToken(t.value);
            i++;
            continue;
        }

        if (t.type === 'punct') {
            if (t.value === '(') {
                var info = classifyParen(i);
                // 函数调用：紧贴前一个 token；其它情况（子查询、表名列清单、分组）加空格
                if (info.kind === 'func') {
                    // 强制去掉末尾空格再写 (
                    out = out.replace(/[ \t]+$/, '');
                    out += '(';
                    atLineStart = false;
                } else {
                    appendToken('(');
                }
                parenStack.push({
                    kind: info.kind,
                    multiline: info.multiline,
                    indentBefore: indent
                });
                if (info.multiline) {
                    indent++;
                    newline();
                }
                i++; continue;
            }
            if (t.value === ')') {
                var top = parenStack.pop();
                if (top && top.multiline) {
                    indent = top.indentBefore;
                    newline();
                }
                appendToken(')');
                i++; continue;
            }
            if (t.value === ',') {
                // 在函数调用 / 单行分组括号内：逗号后只加空格，不换行
                if (inInlineParen()) {
                    appendToken(',');
                    out += ' ';
                    atLineStart = false;
                    // 跳过紧随的空白（如果有）
                    i++;
                    continue;
                }
                appendToken(',');
                newline();
                i++; continue;
            }
            if (t.value === ';') {
                appendToken(';');
                newline();
                i++; continue;
            }
            appendToken(t.value);
            i++; continue;
        }

        if (t.type === 'comment') {
            if (out.length > 0 && !atLineStart) newline();
            appendToken(t.value);
            newline();
            i++; continue;
        }

        appendToken(t.value);
        i++;
    }

    return out.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').trim();
}

/** 渲染带高亮的 SQL（基于已格式化文本，再次 tokenize） */
/** 渲染带高亮的 SQL（基于已格式化文本，再次 tokenize）
 *  括号会被附加 data-pair（配对索引）+ class="sql-paren depth-N"
 *  未匹配括号 class="sql-paren unmatched"
 */
function renderHighlighted(sql) {
    var tokens = tokenizeSql(sql);

    // 第一遍扫描：为每对括号分配配对索引和嵌套深度
    // pairIndex[tokenIdx] = 配对编号；depthOf[tokenIdx] = 该括号的嵌套深度
    var pairIndex = {};
    var depthOf = {};
    var stack = []; // 元素：{ idx: tokenIdx, depth: 嵌套深度 }
    var nextPairId = 0;
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (t.type !== 'punct') continue;
        if (t.value === '(') {
            var depth = stack.length;
            stack.push({ idx: i, depth: depth });
            depthOf[i] = depth;
        } else if (t.value === ')') {
            if (stack.length > 0) {
                var top = stack.pop();
                var id = nextPairId++;
                pairIndex[top.idx] = id;
                pairIndex[i] = id;
                depthOf[i] = top.depth; // 闭括号深度与对应开括号一致
            } else {
                depthOf[i] = -1; // 多余的右括号
            }
        }
    }
    // 栈中剩余的左括号是未闭合的
    for (var s = 0; s < stack.length; s++) {
        // 不分配 pairIndex —— 渲染时识别为 unmatched
    }

    var html = tokens.map(function (t, idx) {
        var v = escapeHtml(t.value);
        switch (t.type) {
            case 'keyword':
                return '<span class="sql-keyword">' + v + '</span>';
            case 'string':  return '<span class="sql-string">'  + v + '</span>';
            case 'number':  return '<span class="sql-number">'  + v + '</span>';
            case 'comment': return '<span class="sql-comment">' + v + '</span>';
            case 'op':      return '<span class="sql-operator">'+ v + '</span>';
            case 'punct':
                if (t.value === '(' || t.value === ')') {
                    if (pairIndex.hasOwnProperty(idx)) {
                        var depthClass = 'depth-' + ((depthOf[idx] % 6 + 6) % 6);
                        return '<span class="sql-paren ' + depthClass +
                               '" data-pair="' + pairIndex[idx] + '">' + v + '</span>';
                    }
                    // 未匹配括号
                    return '<span class="sql-paren unmatched">' + v + '</span>';
                }
                return '<span class="sql-punct">' + v + '</span>';
            default:        return v;
        }
    }).join('');
    $("#sql-display").html(html);
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}
