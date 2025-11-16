/** 和暦(例: 5051231)→西暦(yyyyMMdd)。令和/平成/昭和対応。Nashornでも動くようpadは自作 */
function warekiToSeireki(warekiVal) {
    if (warekiVal == null) return null;
    var val = String(warekiVal).trim();
    if (!/^\d{7}$/.test(val)) return null; // 7桁固定: G yy mm dd

    var gengo = val.substring(0, 1);
    var yy = parseInt(val.substring(1, 3), 10);
    var mm = parseInt(val.substring(3, 5), 10);
    var dd = parseInt(val.substring(5, 7), 10);

    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null; // 簡易。厳密日付は必要に応じてチェック

    var base;
    switch (gengo) {
        case "5": base = 2018; break; // 令和元年=2019
        case "4": base = 1988; break; // 平成元年=1989
        case "3": base = 1925; break; // 昭和元年=1926
        default: return null;
    }
    var yyyy = base + yy;
    return z(yyyy, 4) + z(mm, 2) + z(dd, 2);
}

// 西暦 "yyyymmdd" → 和暦パーツ
function seirekiToWarekiParts(yyyymmdd) {
    var w = seirekiToWareki(yyyymmdd); if (!w) return null;
    var code = w.substr(0, 1); var name = (code === "5" ? "令和" : code === "4" ? "平成" : "昭和");
    return { gengoCode: code, gengoName: name, nen: w.substr(1, 2), getu: w.substr(3, 2), hi: w.substr(5, 2) };
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

/** yyyyMM → 会計年度（4月起算） */
function calcFiscalYear(yyyymm) {
    if (!yyyymm) return null;
    var s = String(yyyymm);
    if (!/^\d{6}$/.test(s)) return null;
    var y = parseInt(s.substr(0, 4), 10), m = parseInt(s.substr(4, 2), 10);
    return (m >= 4) ? y : (y - 1);
}

/** yyyyMM → {era, year:"NN", month:"NN", label:"令和NN年NN月"}（0埋め2桁） */
function convertToWarekiPad2(yyyymm) {
    var s = String(yyyymm);
    if (!/^\d{6}$/.test(s)) return { era: "不明", year: "00", month: "00", label: s };
    var y = parseInt(s.substr(0, 4), 10), m = parseInt(s.substr(4, 2), 10);
    var eras = [
        { name: "令和", y: 2019, m: 5 },
        { name: "平成", y: 1989, m: 1 },
        { name: "昭和", y: 1926, m: 12 }
    ];
    for (var i = 0; i < eras.length; i++) {
        var e = eras[i];
        if (y > e.y || (y === e.y && m >= e.m)) {
            var eraYear = y - e.y + 1;
            return { era: e.name, year: pad2(eraYear), month: pad2(m), label: e.name + pad2(eraYear) + "年" + pad2(m) + "月" };
        }
    }
    return { era: "不明", year: String(y), month: pad2(m), label: y + "年" + pad2(m) + "月" };
}

/** 和暦7桁(eyyMMdd) → 指定年の4/1時点の満年齢（5=令和,4=平成,3=昭和 固定） */
function calcAgeAsOfApril1FromCompactWareki(compactBirth, targetYear) {
    if (compactBirth == null) return null;
    var s = String(compactBirth);
    if (!/^\d{7}$/.test(s)) return null;
    var ERA_MAP = { "5": { startYear: 2019 }, "4": { startYear: 1989 }, "3": { startYear: 1926 } };
    var e = s.charAt(0), yy = parseInt(s.substr(1, 2), 10), mm = parseInt(s.substr(3, 2), 10), dd = parseInt(s.substr(5, 2), 10);
    var era = ERA_MAP[e]; if (!era) return null;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    var birth = new Date(era.startYear + (yy - 1), mm - 1, dd);
    var base = new Date(targetYear, 3, 1); // 4/1
    var age = base.getFullYear() - birth.getFullYear();
    var hasBirthdayPassed = (birth.getMonth() < base.getMonth()) || (birth.getMonth() === base.getMonth() && birth.getDate() <= base.getDate());
    if (!hasBirthdayPassed) age--;
    return age;
}

/** 年度別・ZOKU別の既存累計（なければ0） */
function getRuisekiDataSafe(TK_NO, ZOKU, FY) {
    var whereMap2 = { TK_NO: TK_NO, ZOKU: ZOKU, FY: FY };
    var rec = selectOne(TALON.getDbConfig(), "TK_A_IRYO_NENKAN", null, whereMap2, null);
    var v = rec ? rec['RUIKEI_KYUFU'] : 0;
    return +asNum(v) || 0;
}

/** 0埋め2桁 */
function pad2(num) { return ("0" + num).slice(-2); }

// ========== Domain Ops ==========
function updateCloseStatus(db, SHORI_TUKI, SIME_STATUS) {
    var updateMap = {
        SIME_STATUS: SIME_STATUS,
        SHORI_TUKI: SHORI_TUKI
    };
    updateByMapEx(db, "TK_SIME_01", updateMap, ["SHORI_TUKI"], false);
}

function pickNonBlankCore(javaMap, asString) {
    var out = {};
    if (!javaMap) return out;

    var it = javaMap.keySet().iterator();
    while (it.hasNext()) {
        var k = it.next();
        var v = javaMap.get(k);
        if (v !== null && v !== undefined && String(v).trim() !== "") {
            var key = asString ? String(k) : k;
            var val = asString ? String(v).trim() : v;
            out[key] = val;
        }
    }
    return out;
}

function pickNonBlank(javaMap) {
    // 型を維持（DB更新向け）
    return pickNonBlankCore(javaMap, false);
}

function pickNonBlankToJs(javaMap) {
    // 文字列に統一（JS/CSV向け）
    return pickNonBlankCore(javaMap, true);
}

function asStr(v) {
    return (v === null || v === undefined) ? "" : String(v).trim();
}

function asMessage(e) {
    return (e && e.message) ? e.message : String(e);
}

function z(num, width) { // left zero pad（NashornはpadStart非対応のため）
    var s = String(num);
    while (s.length < width) s = "0" + s;
    return s;
}

// ========== Validation ==========
function validateInputs(conditionMap) {
    var SHORI_TUKI = asStr(conditionMap["SHORI_TUKI"]);
    if (!SHORI_TUKI) return { ok: false }; // 無指定は無風
    if (!/^\d{6}$/.test(SHORI_TUKI)) {
        TALON.addErrorMsg("SHORI_TUKI の形式が不正です（yyyymm 想定）。値=" + SHORI_TUKI);
        return { ok: false };
    }
    return { ok: true, SHORI_TUKI: SHORI_TUKI };
}

// TK_COM_02 挿入（POSヘッダ＋追加項目）
function insertCom02(tkMap, SHORI_TUKI, sortKey, flg, kingaku, row) {
    var db = TALON.getDbConfig();
    var pos = createPosHeader(tkMap, SHORI_TUKI, row); // オブジェクト想定

    pos["ID"] = TALON.getNumberingData("TID", 1)[0];
    pos["SORT_KEY"] = sortKey;
    pos["KYUFUGAKU"] = kingaku;
    pos["FLG"] = flg;
    pos["SHORI_TUKI"] = SHORI_TUKI;

    insertByMapEx(db, "TK_SOKIN_TUCHI", pos, false);
}

function createPosHeader(tkMap, SHORI_TUKI, row) {
    var db = TALON.getDbConfig();
    var USE_MONTH_END_FOR_PAYMENT = false;

    var whereBank = {
        BANK_CD: row["GINKOU_CD"],
        SHITEN_CD: row["SHITEN_CD"]
    };
    var ginkoMap = selectOne(db, "COM_M_BANK", null, whereBank, null);

    var sokinWhere = { YM_ID: asStr(SHORI_TUKI) };
    var sokinMap = selectOne(db, "TPIM0004", null, sokinWhere, null);
    var ymd = toYmd(sokinMap["SOKIN_YOTEI_DATE"]) ||
        (USE_MONTH_END_FOR_PAYMENT ? endOfMonthYmd(SHORI_TUKI) : firstDayOfMonthYmd(SHORI_TUKI));
    var jp = ymd ? seirekiToWarekiParts(ymd) : null;

    var out = {};
    out["ZIP_CD"] = asStr(tkMap["YUBIN_NO"]);
    out["ADDRESS1"] = asStr(tkMap["JUSHO1"]);
    out["ADDRESS2"] = asStr(tkMap["JUSHO2"]);
    out["SIMEI_KANA"] = asStr(tkMap["HON_KANA_SIMEI"]);
    out["TK_NO"] = asStr(tkMap["TK_NO"]);
    out["GENGO"] = jp ? jp.gengoName : "";
    out["NEN"] = jp ? jp.nen : "";
    out["GETU"] = jp ? jp.getu : "";
    out["HI"] = jp ? jp.hi : "";
    out["KINYU_NM"] = asStr(ginkoMap["BANK_NM"]);
    out["SITEN_NM"] = asStr(ginkoMap["SHITEN_NM"]);
    out["KOZA"] = asStr(tkMap["SHUBETU"]);
    out["KOZA_NO"] = maskTail(tkMap["KOZA_NO"], 3, "*");

    // ★★★ SJIS非対応文字を事前変換する ★★★
    var normalized = {};
    var keys = Object.keys(out);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        normalized[k] = normalizeForSjis(out[k]);
    }

    return normalized;
}

function normalizeForSjis(str) {
    if (str == null) return "";
    var s = String(str);

    // Unicode 正規化（濁点結合文字などを通常化）
    try {
        s = s.normalize("NFKC");
    } catch (e) {
        // Nashorn では normalize 未サポートのため安全に無視
    }

    // 全角ハイフン → 半角
    s = s.replace(/－/g, "-");

    // 波ダッシュ → 全角チルダ
    s = s.replace(/〜/g, "～");

    // 外字っぽいものの代表例
    s = s.replace(/髙/g, "高");
    s = s.replace(/﨑/g, "崎");
    s = s.replace(/邉/g, "辺");

    // 制御文字除去
    s = s.replace(/[\u0000-\u001f]/g, "");

    return s;
}

function getTkMap(TK_NO) {

    var whereTk = {
        TK_NO: TK_NO

    }
    return selectOne(TALON.getDbConfig(), "TK_MEMBER", null, whereTk, null);
}

function toYmd(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, ""); // LocalDate toString()
    if (/^\d{8}$/.test(s)) return s;                               // 既に yyyymmdd
    try {
        if (v instanceof Date) return new java.text.SimpleDateFormat("yyyyMMdd").format(v);
    } catch (e) { }
    return null;
}

// 末尾 n 文字マスク
function maskTail(s, n, ch) {
    s = asStr(s); if (!s) return s; var len = s.length, k = Math.min(n, len);
    var mask = ""; for (var i = 0; i < k; i++) mask += (ch || "*"); return s.substring(0, len - k) + mask;
}
