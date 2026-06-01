/**
 * 子网掩码计算工具
 *  - 输入：4 段 IP + 掩码位（CIDR 0~32）
 *  - 输出：可用 IP 数、掩码（4 段）、网络、第一可用、最后可用、广播
 */
$(document).ready(function () {

    $("#goback").click(function () { gobackPopup(); });
    $("#title_btn").click(function () { location.reload(); });

    // 限制 IP 段输入只能数字，并自动跳到下一格
    $(".subnet-octet").not('[readonly]').on('input', function () {
        var v = $(this).val().replace(/[^\d]/g, '');
        if (v.length > 3) v = v.slice(0, 3);
        $(this).val(v);
        // 满 3 位 / 输入到 . 时跳到下一格
        if (v.length === 3) {
            var $next = $(this).nextAll('input.subnet-octet').not('[readonly]').first();
            if ($next.length) $next.focus().select();
        }
    });
    // 输入 . 时跳到下一格
    $(".subnet-octet").not('[readonly]').on('keydown', function (e) {
        if (e.key === '.' || e.keyCode === 190) {
            var $next = $(this).nextAll('input.subnet-octet').not('[readonly]').first();
            if ($next.length) {
                $next.focus().select();
                e.preventDefault();
            }
        }
    });

    $("#cidr").on('input', function () {
        var v = $(this).val().replace(/[^\d]/g, '');
        if (v.length > 2) v = v.slice(0, 2);
        $(this).val(v);
    });

    $("#calc_btn").click(calculate);
    $("#clear_btn").click(clearAll);

    // 初始化按一次（默认 10.0.0.5/24）
    calculate();

    /** 主计算流程 */
    function calculate() {
        clearError();
        var ip = readIp();
        if (ip === null) return;
        var prefix = readPrefix();
        if (prefix === null) return;

        var ipInt = ipToInt(ip);
        var maskInt = prefixToMaskInt(prefix);
        var netInt  = (ipInt & maskInt) >>> 0;
        var bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;

        // 可用 IP 数：CIDR=32 -> 1，CIDR=31 -> 2（点对点链路），其它 -> 总数 - 2（去网络/广播）
        var totalHosts = Math.pow(2, 32 - prefix);
        var usable;
        if (prefix === 32) usable = 1;
        else if (prefix === 31) usable = 2;
        else usable = totalHosts - 2;

        var firstInt, lastInt;
        if (prefix === 32) {
            firstInt = lastInt = ipInt;
        } else if (prefix === 31) {
            firstInt = netInt;
            lastInt  = bcastInt;
        } else {
            firstInt = (netInt + 1) >>> 0;
            lastInt  = (bcastInt - 1) >>> 0;
        }

        // 写入输出
        $("#usable_count").val(usable.toLocaleString());
        writeIp('mask',  intToOctets(maskInt));
        writeIp('net',   intToOctets(netInt));
        writeIp('first', intToOctets(firstInt));
        writeIp('last',  intToOctets(lastInt));
        writeIp('bcast', intToOctets(bcastInt));

        setLocalStorage('subnet.ip',   ip.join('.'));
        setLocalStorage('subnet.cidr', String(prefix));
    }

    /** 清空所有结果，并把输入恢复默认 */
    function clearAll() {
        clearError();
        ['ip_0','ip_1','ip_2','ip_3'].forEach(function(id){ $('#'+id).val(''); });
        $('#cidr').val('');
        $('#usable_count').val('');
        ['mask','net','first','last','bcast'].forEach(function(prefix){
            for (var i = 0; i < 4; i++) $('#'+prefix+'_'+i).val('');
        });
        setLocalStorage('subnet.ip', '');
        setLocalStorage('subnet.cidr', '');
    }

    function readIp() {
        var oct = [];
        for (var i = 0; i < 4; i++) {
            var v = $.trim($('#ip_'+i).val());
            if (v === '') { setError('IP 各段不能为空'); $('#ip_'+i).focus(); return null; }
            if (!/^\d+$/.test(v)) { setError('IP 段必须是数字'); $('#ip_'+i).focus(); return null; }
            var n = parseInt(v, 10);
            if (n < 0 || n > 255) { setError('IP 段必须在 0~255 之间'); $('#ip_'+i).focus(); return null; }
            oct.push(n);
        }
        return oct;
    }

    function readPrefix() {
        var v = $.trim($('#cidr').val());
        if (v === '') { setError('掩码位不能为空'); $('#cidr').focus(); return null; }
        if (!/^\d+$/.test(v)) { setError('掩码位必须是数字'); $('#cidr').focus(); return null; }
        var n = parseInt(v, 10);
        if (n < 0 || n > 32) { setError('掩码位必须在 0~32 之间'); $('#cidr').focus(); return null; }
        return n;
    }

    function setError(msg) { $("#err_tip").text(msg); }
    function clearError()  { $("#err_tip").text(''); }

    function writeIp(prefix, octets) {
        for (var i = 0; i < 4; i++) $('#'+prefix+'_'+i).val(octets[i]);
    }

    setLocalStorage('page.current', 'subnet');

    // 恢复上次记忆
    var savedIp = getLocalStorage('subnet.ip');
    var savedCidr = getLocalStorage('subnet.cidr');
    if (savedIp) {
        var parts = savedIp.split('.');
        for (var i = 0; i < 4 && i < parts.length; i++) $('#ip_'+i).val(parts[i]);
    }
    if (savedCidr) $('#cidr').val(savedCidr);
    if (savedIp || savedCidr) calculate();
});

/* =========================== 工具函数 =========================== */

function ipToInt(octets) {
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function intToOctets(n) {
    return [
        (n >>> 24) & 0xff,
        (n >>> 16) & 0xff,
        (n >>> 8)  & 0xff,
        n & 0xff
    ];
}

function prefixToMaskInt(prefix) {
    if (prefix <= 0)  return 0;
    if (prefix >= 32) return 0xffffffff >>> 0;
    return (0xffffffff << (32 - prefix)) >>> 0;
}
