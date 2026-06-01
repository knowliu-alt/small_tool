$(document).ready(function(){

    $("#goback").click(function(){
        gobackPopup();
    });
    //paste clean format
    $("#json-display").on("paste", function (e) {
        textInit(e)
    });

    $("#format_btn").click(function(){
        //var json_val = $("#json-display").text();
        var my_json_val = $("#json-display").clone(false);
        my_json_val.find("a.json-placeholder").remove();
        my_json_val.find("div.error").remove();
        var json_val = my_json_val.text();
        if(json_val){
            try {
                var jsonObj = JSON.parse(json_val);   //把json字符串转为json对象
                $("#json-display").jsonViewer(jsonObj,{withQuotes: true});

                setLocalStorage('json.input.jv', json_val);
            } catch(err) {
                $("#json-display").html(json_val+"<div class='error'><font color='red'>"+err.message+"</font></div>");
            }
        }
    });

    $("#compress_btn").click(function(){
        //var json_val = $("#json-display").text();
        var my_json_val = $("#json-display").clone(false);
        my_json_val.find("a.json-placeholder").remove();
        my_json_val.find("div.error").remove();
        var json_val = my_json_val.text();
        if (json_val){
            try {
                var e = yasuo(json_val,1);
                //var e = json_val.trim().replace(/\ +/g,"").replace(/[\r\n]/g,"");
                $("#json-display").text(e);//去空格，去换行
    
                setLocalStorage('json.input.jv', e);
            } catch(err) {
                $("#json-display").html(e+"<div class='error'><font color='red'>"+err.message+"</font></div>");
            }
        }
    });

    $("#escap_btn").click(function(){
        //var json_val = $("#json-display").text();
        var my_json_val = $("#json-display").clone(false);
        my_json_val.find("a.json-placeholder").remove();
        my_json_val.find("div.error").remove();
        var json_val = my_json_val.text();
        if(json_val){
            try {
                //var e = json_val.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
                var e = yasuo(json_val,2);
                $("#json-display").text(e);

                setLocalStorage('json.input.jv', e);
            } catch(err) {
                $("#json-display").html(e+"<div class='error'><font color='red'>"+err.message+"</font></div>");
            }
        }
    });

    $("#unescap_btn").click(function(){
        //var json_val = $("#json-display").text();
        var my_json_val = $("#json-display").clone(false);
        my_json_val.find("a.json-placeholder").remove();
        my_json_val.find("div.error").remove();
        var json_val = my_json_val.text();
        if(json_val){
            try {
                //var e = json_val.replace(/\\\\/g, "\\").replace(/\\\"/g, '"')
                var e = yasuo(json_val,4);
                $("#json-display").text(e);

                setLocalStorage('json.input.jv', e);
            } catch(err) {
                $("#json-display").html(e+"<div class='error'><font color='red'>"+err.message+"</font></div>");
            }
        }
    });

    $("#expan_btn").click(function(){
        $("#json-display").find('a.json-toggle').click();
    });

    $("#copy_btn").click(function(){
        var $display = $("#json-display");
        // 取出纯文本 JSON，优先尝试格式化输出（4 空格缩进），失败则回退到原文
        var $clone = $display.clone(false);
        $clone.find("a.json-placeholder").remove();
        $clone.find("div.error").remove();
        var rawText = $clone.text();
        var plainText = rawText;
        try {
            plainText = JSON.stringify(JSON.parse(rawText), null, 4);
        } catch (e) {
            plainText = rawText;
        }

        // 构造带 inline style 的 HTML，确保粘贴到富文本编辑器时保留颜色
        var $htmlClone = $display.clone(true);
        $htmlClone.find("a.json-placeholder").remove();
        $htmlClone.find("div.error").remove();
        // jquery.json-viewer 默认配色（与 jquery.json-viewer.min.css 一致）
        var styleMap = {
            'json-string':  'color:#0B7500;',
            'json-literal': 'color:#1A01CC;font-weight:bold;',
            'json-key':     'color:#000000;font-weight:bold;'
        };
        $.each(styleMap, function(cls, css){
            $htmlClone.find('.' + cls).each(function(){
                var existing = $(this).attr('style') || '';
                $(this).attr('style', existing + css);
            });
        });
        // 折叠/展开按钮、占位符等不需要带过去
        $htmlClone.find('a.json-toggle').remove();
        // 用 <pre> 包一层，保留缩进与换行
        var htmlContent = '<pre style="font-family:Menlo,Consolas,monospace;background:#1c2833;color:#fff;padding:10px;border-radius:4px;white-space:pre;">'
            + $htmlClone.html()
            + '</pre>';

        function fallbackCopy() {
            // 降级：用一个临时 contenteditable 元素 + execCommand('copy')
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
                    'text/html':  new Blob([htmlContent], {type: 'text/html'}),
                    'text/plain': new Blob([plainText],   {type: 'text/plain'})
                });
                navigator.clipboard.write([item]).then(function(){
                    flashCopyBtn(true);
                }).catch(function(){
                    fallbackCopy();
                    flashCopyBtn(true);
                });
            } catch (e) {
                fallbackCopy();
                flashCopyBtn(true);
            }
        } else {
            fallbackCopy();
            flashCopyBtn(true);
        }
    });

    function flashCopyBtn(ok) {
        var $btn = $("#copy_btn");
        var origVal = $btn.data('origVal') || $btn.val();
        $btn.data('origVal', origVal);
        $btn.val(ok ? '已拷贝' : '拷贝失败');
        setTimeout(function(){ $btn.val(origVal); }, 1200);
    }


    $("#clean_btn").click(function(){
        $("#json-display").empty();

        setLocalStorage('json.input.jv', "");
    });

    if ($("#json_all").length <= 0) {
        setLocalStorage('page.current', "json");
    }

    $("#title_btn").click(function(){
        location.reload();
    });

     //init
     var inputSjc = getLocalStorage('json.input.jv');
     if(inputSjc) {
         try {
            var jsonObj = JSON.parse(inputSjc);   //把json字符串转为json对象
            $("#json-display").jsonViewer(jsonObj,{withQuotes: true});
         } catch(err) {
            setLocalStorage('json.input.jv', "");
         }
     }

     //back top
     var $goTopBottom = $('<div id="goTop" style="border-radius:5px;solid #444;background:#333;color:#fff;text-align:center;padding:10px 13px 7px 13px;position:fixed;bottom:50px;right:5px;cursor:pointer;display:none;font-family:verdana;font-size:15px;">∧</div><div id="goBottom" style="border-radius:5px;solid #444;background:#333;color:#fff;text-align:center;padding:10px 13px 7px 13px;position:fixed;bottom:10px;right:5px;cursor:pointer;display:none;font-family:verdana;font-size:15px;">∨</div>').appendTo('body');

     $(window).scroll(function() {
        if ($(this).scrollTop() != 0) {
            $goTopBottom.fadeIn();
        } else {
            $goTopBottom.fadeOut();
        }
     });
     $("#goTop").click(function() {
        $('body, html').animate({
            scrollTop: 0
        }, 800);
     });
     $("#goBottom").click(function() {
        $('body, html').animate({
            scrollTop: document.body.clientHeight
        }, 800);
     });
});

function textInit(e) {
    e.preventDefault();
    var text;
    var clp = (e.originalEvent || e).clipboardData;
    if (clp === undefined || clp === null) {
        text = window.clipboardData.getData("text") || "";
        if (text !== "") {
            if (window.getSelection) {
                var newNode = document.createElement("span");
                newNode.innerHTML = text;
                window.getSelection().getRangeAt(0).insertNode(newNode);
            } else {
                document.selection.createRange().pasteHTML(text);
            }
        }
    } else {
        text = clp.getData('text/plain') || "";
        if (text !== "") {
            document.execCommand('insertText', false, text);
        }
    }
}

function yasuo(e,t) {
    if (1 === t || 3 === t) {
        for (var n = [], i = !1, o = 0, r = (e = e.split("\n").join(" ")).length; o < r; o++) {
            var a = e.charAt(o);
            i && a === i ? "\\" !== e.charAt(o - 1) && (i = !1) : i || '"' !== a && "'" !== a ? i || " " !== a && "\t" !== a || (a = "") : i = a,
            n.push(a)
        }
        e = n.join("")
    }
    2 !== t && 3 !== t || (e = e.replace(/\\/g, "\\\\").replace(/\"/g, '\\"')),
    4 === t && (e = e.replace(/\\\\/g, "\\").replace(/\\\"/g, '"')),
    ee = e;
    return ee;
}