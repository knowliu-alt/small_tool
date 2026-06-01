$(function() {

	var currentPage = getLocalStorage('page.current');
	if(currentPage) {
		location.href = currentPage + '.html';
	}

	// 1) 先按上次保存的顺序重排
	restoreToolOrder();

	// 2) 启用拖拽排序，结束后保存顺序
	$( "#toolList" ).sortable({
		revert: true,
		items: '> a.panel',
		update: function () {
			saveToolOrder();
		}
	});

    //$('body').hide().fadeIn(200);

	$("#json_click").click(function(e){
		e.preventDefault();
		e.stopPropagation();
		chrome.tabs.create({'url': chrome.runtime.getURL('json_all.html')}, function(tab) {
			// Tab opened.
		});
		return false;
	});

	$("#sql_click").click(function(e){
		e.preventDefault();
		e.stopPropagation();
		chrome.tabs.create({'url': chrome.runtime.getURL('sql_all.html')}, function(tab) {
			// Tab opened.
		});
		return false;
	});


	// 加载设置
	// var defaultConfig = {color: 'white'}; // 默认配置
	// chrome.storage.sync.get(defaultConfig, function(items) {
	// 	document.body.style.backgroundColor = items.color;
	// });

	// 初始化国际化
	// $('#test_i18n').html(chrome.i18n.getMessage("helloWorld"));


});

/** 保存当前 #toolList 内 panel 的顺序到 localStorage */
function saveToolOrder() {
	var order = [];
	$('#toolList > a.panel').each(function () {
		var key = $(this).attr('href') || '';
		if (key) order.push(key);
	});
	try {
		setLocalStorage('popup.tool.order', JSON.stringify(order));
	} catch (e) {}
}

/** 按 localStorage 中的顺序重排 #toolList 内的 panel */
function restoreToolOrder() {
	var raw = getLocalStorage('popup.tool.order');
	if (!raw) return;
	var order;
	try { order = JSON.parse(raw); } catch (e) { return; }
	if (!order || !order.length) return;

	var $list = $('#toolList');
	if (!$list.length) return;

	// 建立 href -> 元素 的映射
	var map = {};
	$list.children('a.panel').each(function () {
		var key = $(this).attr('href') || '';
		if (key) map[key] = this;
	});

	// 1. 按保存的顺序追加
	order.forEach(function (key) {
		var el = map[key];
		if (el) {
			$list.append(el);
			delete map[key];
		}
	});
	// 2. 剩下未在记录中的（新增工具）追加到末尾，保持原相对顺序
	Object.keys(map).forEach(function (key) {
		$list.append(map[key]);
	});
}

function getLocalStorage(key){
    var storage=window.localStorage;
    return storage[key];
}
function setLocalStorage(key,val){
    var storage=window.localStorage;
    storage[key] = val;
}

