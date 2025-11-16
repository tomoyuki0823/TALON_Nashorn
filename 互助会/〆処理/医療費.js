setIryoSime()

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

// 末尾 n 文字マスク
function maskTail(s, n, ch) {
    s = asStr(s); if (!s) return s; var len = s.length, k = Math.min(n, len);
    var mask = ""; for (var i = 0; i < k; i++) mask += (ch || "*"); return s.substring(0, len - k) + mask;
}

/**
 * 医療費締め処理（本人→配偶者／FY切替で空白行／FY×ZOKU見出し1回／年間上限クランプ）
 * 依存：insertCom02, _calcIryohiKyufukin, getGendogaku
 */
function setIryoSime() {
    var db = TALON.getDbConfig();
    var conditionMap = TALON.getConditionData() || {};
    var SHORI_TUKI = asStr(conditionMap['SHORI_TUKI']);
    if (!SHORI_TUKI || !/^\d{6}$/.test(SHORI_TUKI)) return;

    // 対象TK_NO一覧
    var sqlTkList = "SELECT TK_NO FROM TK_IRYO WHERE SHORI_TUKI = '" + SHORI_TUKI + "' GROUP BY TK_NO";
    var listDisp = TalonDbUtil.select(db, sqlTkList);

    TalonDbUtil.begin(db);

    try {
        for (var i = 0; i < listDisp.length; i++) {
            var TK_NO = asStr(listDisp[i]['TK_NO']);
            if (!TK_NO) continue;

            // 会員
            var whereTk = {
                TK_NO: TK_NO

            }

            var tkMap = selectOne(db, "TK_MEMBER", null, whereTk, null);

            // 明細（後でJS側でソート）
            var list = selectList(db, "TK_IRYO", null, { TK_NO: TK_NO, SHORI_TUKI: SHORI_TUKI }, null) || [];
            if (list.length === 0) continue;

            // 本人("0")→配偶者("1")、同一ZOKU内は療養年月昇順
            list.sort(function (a, b) {
                var za = asStr(a["ZOKU"]), zb = asStr(b["ZOKU"]);
                var ra = (za === "0") ? 0 : 1, rb = (zb === "0") ? 0 : 1;
                if (ra !== rb) return ra - rb;
                var ya = parseInt(asStr(a["RYOYO_NENGETU"]), 10) || 0;
                var yb = parseInt(asStr(b["RYOYO_NENGETU"]), 10) || 0;
                return ya - yb;
            });

            // FY×ZOKUの状態 { FY: { "0":{total, headerDone}, "1":{total, headerDone} } }
            var fyTotals = {};
            var sortCount = 10;
            var prevFY = null;

            for (var j = 0; j < list.length; j++) {
                var row = list[j];
                var ZOKU = asStr(row["ZOKU"]);               // "0"=本人 / "1"=配偶者
                var RYOYO_NENGETU = asStr(row["RYOYO_NENGETU"]);
                var FY = calcFiscalYear(RYOYO_NENGETU);

                // 会計年度切替で空白行
                if (prevFY !== null && prevFY !== FY) {
                    insertBlankRow(db, tkMap, SHORI_TUKI, sortCount++);
                }
                prevFY = FY;

                // FY初期化（既存累計を起点に）
                if (!fyTotals[FY]) {
                    fyTotals[FY] = {
                        "0": { total: getRuisekiDataSafe(TK_NO, "0", FY), headerDone: false },
                        "1": { total: getRuisekiDataSafe(TK_NO, "1", FY), headerDone: false }
                    };
                }

                // ZOKU見出し（FY内で該当ZOKUの最初のみ）
                if (!fyTotals[FY][ZOKU].headerDone) {
                    var jpHead = convertToWarekiPad2(RYOYO_NENGETU);
                    var title = (ZOKU === "0") ? "(ﾎﾝﾆﾝ)" : "(ﾊｲｸﾞｳｼｬ)";
                    insertCom02(db, tkMap, SHORI_TUKI, sortCount++,
                        title, jpHead.year, jpHead.month,
                        null, null, null, fyTotals[FY][ZOKU].total, '02');
                    fyTotals[FY][ZOKU].headerDone = true;
                }

                // 年齢・限度額（FY基準）
                var honNenrei = calcAgeAsOfApril1FromCompactWareki(tkMap['HON_SEINENGAPI'], FY);
                var haiNenrei = calcAgeAsOfApril1FromCompactWareki(tkMap['HAI_SEINENGAPI'], FY);
                var honGendo = getGendogaku(honNenrei);
                var haiGendo = getGendogaku(haiNenrei);

                var RYOYOUSYA = (ZOKU === "0") ? asStr(tkMap['HON_KANA_SIMEI']) : asStr(tkMap['HAI_KANA_SIMEI']);
                var nenrei = (ZOKU === "0") ? honNenrei : haiNenrei;
                var gendo = (ZOKU === "0") ? honGendo : haiGendo;

                // 金額
                var NYUIN_KINGAKU = +asNum(row['NYUIN_KINGAKU']) || 0;
                var GAIRAI_KINGAKU = +asNum(row['GAIRAI_KINGAKU']) || 0;
                var TOTAL_KINGAKU = NYUIN_KINGAKU + GAIRAI_KINGAKU;

                // ベース給付（1回のみ）
                var kyufuBase = _calcIryohiKyufukin(nenrei, row);
                if (kyufuBase < 0) kyufuBase = 0;

                // 年間上限クランプ
                var already = fyTotals[FY][ZOKU].total || 0;
                var remaining = Math.max(0, gendo - already);
                var kyufuPay = Math.min(kyufuBase, remaining);

                // ★限度額超過フラグ（クランプが発生したら 01）
                var rowFlg = (kyufuBase > remaining) ? "01" : "00";

                // 累計更新
                fyTotals[FY][ZOKU].total = already + kyufuPay;

                // 表示用年月（0埋め2桁）
                var jp = convertToWarekiPad2(RYOYO_NENGETU);

                // KOJOGAKUは要件に合わせて調整（暫定：1万円）
                var KOJOGAKU = 10000;

                // 明細出力（★最後の引数 flg を rowFlg に）
                insertCom02(
                    db,
                    tkMap,
                    SHORI_TUKI,
                    sortCount++,
                    RYOYOUSYA,
                    jp.year,
                    jp.month,
                    TOTAL_KINGAKU,
                    kyufuPay,
                    KOJOGAKU,
                    fyTotals[FY][ZOKU].total,
                    rowFlg               // ← ここを "01"/"00" 切り替え
                );
            }


        }
        updateCloseStatus(db, SHORI_TUKI);
        TalonDbUtil.commit(db);
    } catch (e) {
        TalonDbUtil.rollback(db);
        throw e;
    }
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
    updateMap["SIME_IRYO"] = "02";

    updateByMapEx(db, "TK_SIME_01", updateMap, ["SHORI_TUKI"], false);
}

/* ==================== ヘルパ ==================== */

/** FY切替時に入れる空白行（区切り） */
function insertBlankRow(db, tkMap, SHORI_TUKI, sortKey) {
    insertCom02(
        db,
        tkMap,
        SHORI_TUKI,
        sortKey,
        "",   // RYOYOUSYA
        "",   // 年
        "",   // 月
        null, // 対象額
        null, // 給付額
        null, // 控除額
        null, // 年間累計
        '00'  // 区切り識別
    );
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
/** 文字列化 */
function asStr(v) { return (v == null) ? "" : String(v); }
/** 数値化 */
function asNum(v) { if (v == null || v === "") return 0; var n = Number(v); return isNaN(n) ? 0 : n; }

/* ==================== 既存提供関数（このまま利用） ==================== */

// TK_COM_02 挿入（POSヘッダ＋追加項目）
function insertCom02(db, tkMap, SHORI_TUKI, sortKey, RYOYOUSYA, RYOYO_NEN, RYOYO_GETU, TAISYOGAKU, KYUFUGAKU, KOJOGAKU, NENKANKYUFUGAKU, flg) {
    var pos = createPosHeader(tkMap, SHORI_TUKI);

    pos['ID'] = TALON.getNumberingData("TID", 1)[0];
    pos['SORT_KEY'] = sortKey;
    pos['KYUFU_FLG'] = "1";
    pos['RYOYOUSYA'] = RYOYOUSYA;
    pos['RYOYO_GENGO'] = "令和";
    pos['RYOYO_NEN'] = RYOYO_NEN;
    pos['RYOYO_GETU'] = RYOYO_GETU;
    pos['TAISYOGAKU'] = TAISYOGAKU;
    pos['KYUFUGAKU'] = KYUFUGAKU;
    pos['KOJOGAKU'] = KOJOGAKU;
    pos['NENKANKYUFUGAKU'] = NENKANKYUFUGAKU;
    pos['FLG'] = flg;
    pos['SHORI_TUKI'] = SHORI_TUKI;

    //pos.put("ID", TALON.getNumberingData("TID", 1)[0]);
    //pos.put("SORT_KEY", sortKey);
    //pos.put("KYUFU_FLG", "1");
    //pos.put("RYOYOUSYA", RYOYOUSYA);
    //pos.put("RYOYO_GENGO", "令和");
    //pos.put("RYOYO_NEN", RYOYO_NEN);
    //pos.put("RYOYO_GETU", RYOYO_GETU);
    //pos.put("TAISYOGAKU", TAISYOGAKU);
    //pos.put("KYUFUGAKU", KYUFUGAKU);
    //pos.put("KOJOGAKU", KOJOGAKU);
    //pos.put("NENKANKYUFUGAKU", NENKANKYUFUGAKU);
    //pos.put("FLG", flg);
    //pos.put("SHORI_TUKI", SHORI_TUKI);

    insertByMapEx(db, "TK_SOKIN_TUCHI", pos, false);
}

// POSヘッダ（和暦年月日・口座末尾マスク・銀行名/支店名）
function createPosHeader(tkMap, SHORI_TUKI) {
    var db = TALON.getDbConfig();
    var whereBank = new Array();
    //whereBank.put("BANK_CD", asStr(tkMap.get("GINKOU_CD")));
    //whereBank.put("SHITEN_CD", asStr(tkMap.get("SHITEN_CD")));
    whereBank['BANK_CD'] = asStr(tkMap.get("GINKOU_CD"));
    whereBank['SHITEN_CD'] = asStr(tkMap.get("SHITEN_CD"));
    var ginkoMap = selectOne(db, "COM_M_BANK", null, whereBank, null) || new Array();

    var sokinWhere = new Array();
    //sokinWhere.put("YM_ID", asStr(SHORI_TUKI));
    sokinWhere['YM_ID'] = asStr(SHORI_TUKI);
    var sokinMap = selectOne(db, "TPIM0004", null, sokinWhere, null) || new Array();
    var ymd = toYmd(sokinMap.get("SOKIN_YOTEI_DATE")) ||
        (USE_MONTH_END_FOR_PAYMENT ? endOfMonthYmd(SHORI_TUKI) : firstDayOfMonthYmd(SHORI_TUKI));
    var jp = ymd ? seirekiToWarekiParts(ymd) : null;

    var out = new Array();

    out["GINKOU_CD"] = whereBank['BANK_CD'];
    out["SHITEN_CD"] = whereBank['SHITEN_CD'];
    out["ZIP_CD"] = asStr(tkMap.get("YUBIN_NO"));
    out["ADDRESS1"] = asStr(tkMap.get("JUSHO1"));
    out["ADDRESS2"] = asStr(tkMap.get("JUSHO2"));
    out["SIMEI_KANA"] = asStr(tkMap.get("HON_KANA_SIMEI"));
    out["TK_NO"] = asStr(tkMap.get("TK_NO"));
    out["GENGO"] = jp ? jp.gengoName : "";
    out["NEN"] = jp ? jp.nen : "";
    out["GETU"] = jp ? jp.getu : "";
    out["HI"] = jp ? jp.hi : "";
    out["KINYU_NM"] = asStr(ginkoMap.get("BANK_NM_KANA"));
    out["SITEN_NM"] = asStr(ginkoMap.get("SHITEN_NM_KANA"));
    out["KOZA"] = asStr(tkMap.get("SHUBETU"));
    out["KOZA_NO"] = maskTail(asStr(tkMap.get("KOZA_NO")), 3, "*");

    return out;
}

/* ==== 業務ロジック（既存のまま利用） ==== */

/** 年齢に応じて限度額 */
function getGendogaku(age) {
    if (age == null || isNaN(age)) return 0;
    if (age <= 69) return 80000;
    else if (age <= 74) return 60000;
    else return 40000;
}

/** 医療費給付金（基礎計算） */
function _calcIryohiKyufukin(targetNenrei, calcMap) {
    if (!calcMap || calcMap['NYUIN_KINGAKU'] == null || calcMap['GAIRAI_KINGAKU'] == null) {
        throw new Error("calcMap のデータが不正です。");
    }
    var NYUIN_KINGAKU = calcMap['NYUIN_KINGAKU'];
    var GAIRAI_KINGAKU = calcMap['GAIRAI_KINGAKU'];
    var TOTAL_KINGAKU = NYUIN_KINGAKU + GAIRAI_KINGAKU;

    if (targetNenrei <= 69) {
        return _calculateKyufukin(TOTAL_KINGAKU, 25000, 10000);
    }
    if (GAIRAI_KINGAKU >= 15000) {
        return _calculateKyufukin(GAIRAI_KINGAKU, 15000, 10000);
    } else {
        return _calculateKyufukin(TOTAL_KINGAKU, Infinity, 10000);
    }
}

/** 共通：給付額計算 */
function _calculateKyufukin(targetAmount, upperLimit, threshold) {
    if (targetAmount <= threshold) return 0;
    var raw = (Math.min(targetAmount, upperLimit) - threshold) * 0.6;
    return Math.floor(raw / 100) * 100; // 100円未満切り捨て
}
