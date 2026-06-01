$(document).ready(function(){
    //init
    let inputval = getLocalStorage('base64.input.val');
    let outputval = getLocalStorage('base64.output.val');
    $("#base_val").val(inputval);
    $("#base_res").val(outputval);

    let inputval2 = getLocalStorage('url.input.val');
    let outputval2 = getLocalStorage('url.output.val');
    $("#url_val").val(inputval2);
    $("#url_res").val(outputval2);

    $("#goback").click(function(){
        gobackPopup();
    });

    $("#base_encode_btn").click(function(){
        var val = $("#base_val").val();
        var str = Base64.encode(val);
        $("#base_res").val(str);

        setLocalStorage('base64.input.val', val);
        setLocalStorage('base64.output.val', str);
    });
    $("#base64_change").click(function(){
        var base_val = $("#base_val").val();
        var base_res = $("#base_res").val();

        $("#base_val").val(base_res);
        $("#base_res").val(base_val);
    });
    $("#base_decode_btn").click(function(){
        var val = $("#base_val").val();
        var str = Base64.decode(val);
        $("#base_res").val(str);

        setLocalStorage('base64.input.val',val);
        setLocalStorage('base64.output.val', str);
    });
    $("#clean_btn").click(function(){
        $("#base_val").val("");
        $("#base_res").val("");

        setLocalStorage('base64.input.val', "");
        setLocalStorage('base64.output.val', "");
    });


    $("#url_encode_btn").click(function(){
        var val = $("#url_val").val();
        var str = encodeURIComponent(val);
        $("#url_res").val(str);

        setLocalStorage('url.input.val', val);
        setLocalStorage('url.output.val', str);
    });
    $("#url_change").click(function(){
        var url_val = $("#url_val").val();
        var url_res = $("#url_res").val();

        $("#url_val").val(url_res);
        $("#url_res").val(url_val);
    });
    $("#url_decode_btn").click(function(){
        var val = $("#url_val").val();
        var str = decodeURIComponent(val);
        $("#url_res").val(str);

        setLocalStorage('url.input.val',val);
        setLocalStorage('url.output.val', str);
    });
    $("#url_clean_btn").click(function(){
        $("#url_val").val("");
        $("#url_res").val("");

        setLocalStorage('url.input.val', "");
        setLocalStorage('url.output.val', "");
    });

    // ===================== MD5 =====================
    // 初始化：恢复上次输入与结果
    var md5In = getLocalStorage('md5.input.val');
    if (md5In) {
        $("#md5_val").val(md5In);
        try { renderMd5(md5In); } catch (e) {}
    }

    function renderMd5(text) {
        if (!text) {
            $("#md5_res_32_lower").val("");
            $("#md5_res_32_upper").val("");
            $("#md5_res_16_lower").val("");
            $("#md5_res_16_upper").val("");
            return;
        }
        var hex32Lower = md5(text);
        var hex32Upper = hex32Lower.toUpperCase();
        // 16 位 MD5 = 32 位结果取中间 16 位（第 9 位~第 24 位，索引 8..23）
        var hex16Lower = hex32Lower.substring(8, 24);
        var hex16Upper = hex16Lower.toUpperCase();
        $("#md5_res_32_lower").val(hex32Lower);
        $("#md5_res_32_upper").val(hex32Upper);
        $("#md5_res_16_lower").val(hex16Lower);
        $("#md5_res_16_upper").val(hex16Upper);
    }

    $("#md5_encode_btn").click(function(){
        var val = $("#md5_val").val();
        renderMd5(val);
        setLocalStorage('md5.input.val', val);
    });

    // 输入即时计算（防抖）
    var md5Timer = null;
    $("#md5_val").on('input', function(){
        var val = $(this).val();
        clearTimeout(md5Timer);
        md5Timer = setTimeout(function(){
            renderMd5(val);
            setLocalStorage('md5.input.val', val);
        }, 200);
    });

    $("#md5_clean_btn").click(function(){
        $("#md5_val").val("");
        $("#md5_res_32_lower").val("");
        $("#md5_res_32_upper").val("");
        $("#md5_res_16_lower").val("");
        $("#md5_res_16_upper").val("");
        setLocalStorage('md5.input.val', "");
    });

    // 一键拷贝 32 位小写结果
    $("#md5_copy_32l_btn").click(function(){
        var text = $("#md5_res_32_lower").val();
        if (!text) return;
        var $btn = $(this);
        var orig = $btn.data('origVal') || $btn.val();
        $btn.data('origVal', orig);

        function done(ok) {
            $btn.val(ok ? '已拷贝' : '拷贝失败');
            setTimeout(function(){ $btn.val(orig); }, 1200);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function(){ done(true); },
                function(){ legacyCopy(text); done(true); }
            );
        } else {
            legacyCopy(text);
            done(true);
        }
    });

    function legacyCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    $("#title_btn").click(function(){
        location.reload();
    });

    setLocalStorage('page.current', "base64");
});



