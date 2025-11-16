// ================== Java types ==================
var LocalDate = Java.type("java.time.LocalDate");
var YearMonth = Java.type("java.time.YearMonth");
var SimpleDateFormat = Java.type("java.text.SimpleDateFormat");
var Date = Java.type("java.util.Date");
var HashMap = Java.type("java.util.HashMap");

// ================== Const ==================
var TYOJU_KINGAKU = 2000;          // 支払金額（喜寿/米寿）
var USE_MONTH_END_FOR_PAYMENT = false; // trueなら支払予定日を月末にする

// ================== Utilities ==================
function z(n, w) { var s = String(n); while (s.length < w) s = "0" + s; return s; }
function asStr(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }

// 任意の入力を "yyyymmdd" に正規化
function toYmd(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, ""); // LocalDate toString()
    if (/^\d{8}$/.test(s)) return s;                               // 既に yyyymmdd
    try {
        if (v instanceof Date) return new SimpleDateFormat("yyyyMMdd").format(v);
    } catch (e) { }
    return null;
}

// yyyymm → 末日 yyyymmdd
function endOfMonthYmd(yyyymm) {
    var s = String(yyyymm); if (!/^\d{6}$/.test(s)) return null;
    var y = parseInt(s.substring(0, 4), 10), m = parseInt(s.substring(4, 6), 10);
    var e = YearMonth.of(y, m).atEndOfMonth();
    return z(e.getYear(), 4) + z(e.getMonthValue(), 2) + z(e.getDayOfMonth(), 2);
}
// yyyymm → 1日 yyyymmdd
function firstDayOfMonthYmd(yyyymm) {
    var s = String(yyyymm); return (/^\d{6}$/.test(s)) ? (s + "01") : null;
}
// 今日 yyyymmdd
function todayYmd() {
    var d = LocalDate.now();
    return z(d.getYear(), 4) + z(d.getMonthValue(), 2) + z(d.getDayOfMonth(), 2);
}

// yyyymmdd → {y,m,d}
function splitYmd(yyyymmdd) {
    var s = String(yyyymmdd); if (!/^\d{8}$/.test(s)) return null;
    return { y: parseInt(s.substring(0, 4), 10), m: parseInt(s.substring(4, 6), 10), d: parseInt(s.substring(6, 8), 10) };
}

// 満年齢
function calcAge(birthYmd, asOfYmd) {
    var b = splitYmd(birthYmd), a = splitYmd(asOfYmd); if (!b || !a) return null;
    var age = a.y - b.y; if (a.m < b.m || (a.m === b.m && a.d < b.d)) age -= 1; return age;
}

// 和暦(7桁: GyyMMdd) → 西暦 "yyyymmdd"
function warekiToSeireki(warekiVal) {
    if (warekiVal == null) return null;
    var v = String(warekiVal).trim(); if (!/^\d{7}$/.test(v)) return null;
    var g = v.substring(0, 1), yy = parseInt(v.substring(1, 3), 10), mm = parseInt(v.substring(3, 5), 10), dd = parseInt(v.substring(5, 7), 10);
    if (isNaN(yy) || isNaN(mm) || isNaN(dd) || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    var base; switch (g) { case "5": base = 2018; break; case "4": base = 1988; break; case "3": base = 1925; break; default: return null; }
    var yyyy = base + yy;
    return z(yyyy, 4) + z(mm, 2) + z(dd, 2);
}

// 西暦 "yyyymmdd" → 和暦(7桁: GyyMMdd)（令和/平成/昭和）
function seirekiToWareki(yyyymmdd) {
    var s = String(yyyymmdd); if (!/^\d{8}$/.test(s)) return null;
    var y = parseInt(s.substr(0, 4), 10), m = parseInt(s.substr(4, 2), 10), d = parseInt(s.substr(6, 2), 10);
    var dt; try { dt = LocalDate.of(y, m, d); } catch (e) { return null; }
    var REIWA = LocalDate.of(2019, 5, 1), HEISEI = LocalDate.of(1989, 1, 8), SHOWA = LocalDate.of(1926, 12, 25);
    var g, base;
    if (!dt.isBefore(REIWA)) { g = "5"; base = 2018; }
    else if (!dt.isBefore(HEISEI)) { g = "4"; base = 1988; }
    else if (!dt.isBefore(SHOWA)) { g = "3"; base = 1925; }
    else return null;
    var eraYY = y - base;
    return g + z(eraYY, 2) + z(m, 2) + z(d, 2);
}

// 西暦 "yyyymmdd" → 和暦パーツ
function seirekiToWarekiParts(yyyymmdd) {
    var w = seirekiToWareki(yyyymmdd); if (!w) return null;
    var code = w.substr(0, 1); var name = (code === "5" ? "令和" : code === "4" ? "平成" : "昭和");
    return { gengoCode: code, gengoName: name, nen: w.substr(1, 2), getu: w.substr(3, 2), hi: w.substr(5, 2) };
}

// 末尾 n 文字マスク
function maskTail(s, n, ch) {
    s = asStr(s); if (!s) return s; var len = s.length, k = Math.min(n, len);
    var mask = ""; for (var i = 0; i < k; i++) mask += (ch || "*"); return s.substring(0, len - k) + mask;
}

// 和暦生年月日から 77/88 歳判定（AS_OF: yyyymmdd or yyyymm）
function judge77or88(warekiBirth, AS_OF) {
    var birthYmd = warekiToSeireki(warekiBirth); if (!birthYmd) return { age: null, is77: false, is88: false, hit: null, asOfYmd: null };
    var asOfYmd = null; if (AS_OF) { var s = String(AS_OF); if (/^\d{8}$/.test(s)) asOfYmd = s; else if (/^\d{6}$/.test(s)) asOfYmd = endOfMonthYmd(s); }
    if (!asOfYmd) asOfYmd = todayYmd();
    var age = calcAge(birthYmd, asOfYmd); var is77 = (age === 77), is88 = (age === 88); var hit = is77 ? 77 : (is88 ? 88 : null);
    return { age: age, is77: is77, is88: is88, hit: hit, asOfYmd: asOfYmd };
}

// ================== Domain helpers ==================
// 支払テーブル更新（必要ならキー拡張: ['TK_NO','SHORI_TUKI','KBN'] 等）
function updateShiharai(updateMap) {
    updateByMapEx(TALON.getDbConfig(), "TK_SHIHARAI", updateMap, ["TK_NO"], false);
}




// 締め状態更新
function updateCloseStatus(db, SHORI_TUKI) {
    var updateMap = new Array();

    var lineDataMap = TALON.getTargetData();
    var SIME_STATUS = lineDataMap['SIME_STATUS'];

    if (SIME_STATUS == "06") {
        updateMap["SIME_STATUS"] = "07";

    } else if (SIME_STATUS == "07") {
        updateMap["SIME_STATUS"] = "08";

    }


    updateMap["SHORI_TUKI"] = SHORI_TUKI;
    updateMap["SIME_CHOJU"] = "02";

    updateByMapEx(db, "TK_SIME_01", updateMap, ["SHORI_TUKI"], false);
}


// ================== Main ==================
setChoju();

function setChoju() {
    try {
        var db = TALON.getDbConfig();
        var conditionMap = TALON.getConditionData() || {};

        var SHORI_TUKI = asStr(conditionMap["SHORI_TUKI"]);
        if (!SHORI_TUKI) return;

        var where = { SHORI_TUKI: SHORI_TUKI };
        var list = selectList(db, "TK_CHOJU_01", null, where, null) || [];

        // 支払予定日（処理月の1日 or 末日）
        var shiharaiDt = USE_MONTH_END_FOR_PAYMENT ? endOfMonthYmd(SHORI_TUKI) : firstDayOfMonthYmd(SHORI_TUKI);
        var shiharaiWdt = seirekiToWareki(shiharaiDt); // 和暦

        for (var i = 0; i < list.length; i++) {
            var row = list[i]; // JSオブジェクトとして扱う想定
            var ZOKU = asStr(row["ZOKU"]);     // 0=本人, 他=配偶者
            var TK_NO = asStr(row["TK_NO"]);
            if (!TK_NO) continue;

            // TK_MEMBERから生年月日（和暦7桁）
            var whereTk = { TK_NO: TK_NO };
            var tkMap = selectOne(db, "TK_MEMBER", null, whereTk, null) || {};
            var HON_SEINENGAPI = asStr(tkMap["HON_SEINENGAPI"]);
            var HAI_SEINENGAPI = asStr(tkMap["HAI_SEINENGAPI"]);



            if (ZOKU === "0") {
                var r = judge77or88(HON_SEINENGAPI, SHORI_TUKI);
                if (r.hit === 77) {
                    var upd = {
                        TK_NO: TK_NO,
                        HON_TYOJU_77_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HON_TYOJU_77_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_77_HON_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HON_TYOJU_77_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HON_TYOJU_77_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HON_TYOJU_77_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HON_TYOJU_77_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd);
                    insertCom02(db, tkMap, SHORI_TUKI, 5, "07", TYOJU_KINGAKU, row);
                } else if (r.hit === 88) {
                    var upd2 = {
                        TK_NO: TK_NO,
                        HON_TYOJU_88_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HON_TYOJU_88_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_88_HON_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HON_TYOJU_88_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HON_TYOJU_88_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HON_TYOJU_88_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HON_TYOJU_88_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd2);
                    insertCom02(db, tkMap, SHORI_TUKI, 6, "08", TYOJU_KINGAKU, row);
                }
            } else {
                var rH = judge77or88(HAI_SEINENGAPI, SHORI_TUKI);
                if (rH.hit === 77) {
                    var upd3 = {
                        TK_NO: TK_NO,
                        HAI_TYOJU_77_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HAI_TYOJU_77_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_77_HAI_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HAI_TYOJU_77_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HAI_TYOJU_77_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HAI_TYOJU_77_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HAI_TYOJU_77_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd3);
                    insertCom02(db, tkMap, SHORI_TUKI, 7, "09", TYOJU_KINGAKU, row);
                } else if (rH.hit === 88) {
                    var upd4 = {
                        TK_NO: TK_NO,
                        HAI_TYOJU_88_SHIHARAI_YOTEI_SDT: shiharaiDt,
                        HAI_TYOJU_88_SHIHARAI_YOTEI_WDT: shiharaiWdt,
                        TYOJU_88_HAI_SHIHARAI_KINGAKU: TYOJU_KINGAKU,
                        HAI_TYOJU_88_GINKO_CD: asStr(row["GINKOU_CD"]),
                        HAI_TYOJU_88_SHITEN_CD: asStr(row["SHITEN_CD"]),
                        HAI_TYOJU_88_KOZA_NO: asStr(row["KOUZA_NO"]),
                        HAI_TYOJU_88_KOZA_MEIGI: asStr(row["KOUZAMEIGI"])
                    };
                    updateShiharai(upd4);
                    insertCom02(db, tkMap, SHORI_TUKI, 8, "10", TYOJU_KINGAKU, row);
                }
            }
        }

        updateCloseStatus(db, SHORI_TUKI);

    } catch (e) {
        TALON.addErrorMsg((e && e.message) ? e.message : String(e));
    }
}

