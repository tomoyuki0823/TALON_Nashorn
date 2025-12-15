setIryoSime();

/**
 * 医療費締め処理（本人→配偶者／FY切替で空白行／FY×ZOKU見出し1回／年間上限クランプ）
 * 依存：insertIryoCom02, _calcIryohiKyufukin, getGendogaku,
 *       calcFiscalYear, convertToWarekiPad2, getRuisekiDataSafe など
 */
function setIryoSime() {
    var db = TALON.getDbConfig();
    var conditionMap = TALON.getConditionData() || {};
    var SHORI_TUKI = asStr(conditionMap['SHORI_TUKI']);

    // yyyymm の簡易チェック
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
            var tkMap = getTkMap(TK_NO);      // ← 共通の getTkMap を使う前提
            if (!tkMap) continue;

            // 明細（後でJS側でソート）
            var iryoList = selectList(db, "TK_IRYO", null,
                { TK_NO: TK_NO, SHORI_TUKI: SHORI_TUKI }, null) || [];
            if (iryoList.length === 0) continue;

            // 本人("0")→配偶者("1")、同一ZOKU内は療養年月昇順
            iryoList.sort(function (a, b) {
                var za = asStr(a["ZOKU"]), zb = asStr(b["ZOKU"]);
                var ra = (za === "0") ? 0 : 1;
                var rb = (zb === "0") ? 0 : 1;
                if (ra !== rb) return ra - rb;

                var ya = parseInt(asStr(a["RYOYO_NENGETU"]), 10) || 0;
                var yb = parseInt(asStr(b["RYOYO_NENGETU"]), 10) || 0;
                return ya - yb;
            });

            // FY×ZOKUの状態 { FY: { "0":{total, headerDone}, "1":{total, headerDone} } }
            var fyTotals = {};
            var sortCount = 10;
            var prevFY = null;

            for (var j = 0; j < iryoList.length; j++) {
                var row = iryoList[j];

                var ZOKU = asStr(row["ZOKU"]);               // "0"=本人 / "1"=配偶者
                var RYOYO_NENGETU = asStr(row["RYOYO_NENGETU"]);
                var FY = calcFiscalYear(RYOYO_NENGETU);

                // 会計年度切替で空白行
                if (prevFY !== null && prevFY !== FY) {
                    insertBlankRow_Iryo(db, tkMap, SHORI_TUKI, sortCount++);
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
                    insertIryoCom02(
                        db,
                        tkMap,
                        SHORI_TUKI,
                        sortCount++,
                        title,               // RYOYOUSYA
                        jpHead.year,
                        jpHead.month,
                        null,                // TAISYOGAKU
                        null,                // KYUFUGAKU
                        null,                // KOJOGAKU
                        fyTotals[FY][ZOKU].total,
                        "02"                 // 区分：見出し
                    );
                    fyTotals[FY][ZOKU].headerDone = true;
                }

                // 年齢・限度額（FY基準）
                var honNenrei = calcAgeAsOfApril1FromCompactWareki(tkMap['HON_SEINENGAPI'], FY);
                var haiNenrei = calcAgeAsOfApril1FromCompactWareki(tkMap['HAI_SEINENGAPI'], FY);
                var honGendo = getGendogaku(honNenrei);
                var haiGendo = getGendogaku(haiNenrei);

                var RYOYOUSYA = (ZOKU === "0")
                    ? asStr(tkMap['HON_KANA_SIMEI'])
                    : asStr(tkMap['HAI_KANA_SIMEI']);
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

                // 限度額超過フラグ（クランプが発生したら 01）
                var rowFlg = (kyufuBase > remaining) ? "01" : "00";

                // 累計更新
                fyTotals[FY][ZOKU].total = already + kyufuPay;

                // 表示用年月（0埋め2桁）
                var jp = convertToWarekiPad2(RYOYO_NENGETU);

                // KOJOGAKUは要件に合わせて調整（暫定：1万円）
                var KOJOGAKU = 10000;

                // 明細出力
                insertIryoCom02(
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
                    rowFlg
                );
            }
        }

        updateIryoCloseStatus(db, SHORI_TUKI); // ← 共通 updateCloseStatus とは別名
        TalonDbUtil.commit(db);
    } catch (e) {
        TalonDbUtil.rollback(db);
        throw e;
    }
}

/** 医療締め専用：締め状態更新（共通の updateCloseStatus と名前を分離） */
function updateIryoCloseStatus(db, SHORI_TUKI) {
    var lineDataMap = TALON.getTargetData() || {};
    var nowStatus = asStr(lineDataMap['SIME_STATUS']);

    var nextStatus = nowStatus;
    if (nowStatus === "06") {
        nextStatus = "07";
    } else if (nowStatus === "07") {
        nextStatus = "08";
    }

    var updateMap = {
        SHORI_TUKI: SHORI_TUKI,
        SIME_IRYO: "02",
        SIME_STATUS: nextStatus
    };

    updateByMapEx(db, "TK_SIME_01", updateMap, ["SHORI_TUKI"], false);
}

/* ==================== ヘルパ ==================== */

/** FY切替時に入れる空白行（区切り） */
function insertBlankRow_Iryo(db, tkMap, SHORI_TUKI, sortKey) {
    insertIryoCom02(
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
        "00"  // 区切り識別
    );
}

/* ==================== TK_SOKIN_TUCHI 出力（医療用） ==================== */

/**
 * 医療用 TK_COM_02 挿入（POSヘッダ＋追加項目）
 * 既存 insertCom02（預託など）とシグネチャが違うので insertIryoCom02 として分離
 */
function insertIryoCom02(
    db,
    tkMap,
    SHORI_TUKI,
    sortKey,
    RYOYOUSYA,
    RYOYO_NEN,
    RYOYO_GETU,
    TAISYOGAKU,
    KYUFUGAKU,
    KOJOGAKU,
    NENKANKYUFUGAKU,
    flg
) {
    var pos = createIryoPosHeader(tkMap, SHORI_TUKI);

    pos["ID"] = TALON.getNumberingData("TID", 1)[0];
    pos["SORT_KEY"] = sortKey;
    pos["KYUFU_FLG"] = "1";
    pos["RYOYOUSYA"] = RYOYOUSYA;
    pos["RYOYO_GENGO"] = "令和"; // 必要であれば可変に
    pos["RYOYO_NEN"] = RYOYO_NEN;
    pos["RYOYO_GETU"] = RYOYO_GETU;
    pos["TAISYOGAKU"] = TAISYOGAKU;
    pos["KYUFUGAKU"] = KYUFUGAKU;
    pos["KOJOGAKU"] = KOJOGAKU;
    pos["NENKANKYUFUGAKU"] = NENKANKYUFUGAKU;
    pos["FLG"] = flg;
    pos["SHORI_TUKI"] = SHORI_TUKI;

    insertByMapEx(db, "TK_SOKIN_TUCHI", pos, false);
}

/**
 * POSヘッダ（和暦年月日・口座末尾マスク・銀行名/支店名）
 * こちらも SJIS 想定なので normalizeForSjis をかけておく
 */
function createIryoPosHeader(tkMap, SHORI_TUKI) {
    var db = TALON.getDbConfig();

    // tkMap は Java Map 想定
    var ginkoCd = asStr(tkMap.get("GINKOU_CD"));
    var shitenCd = asStr(tkMap.get("SHITEN_CD"));

    var whereBank = {
        BANK_CD: ginkoCd,
        SHITEN_CD: shitenCd
    };
    var ginkoMap = selectOne(db, "COM_M_BANK", null, whereBank, null) || {};

    var sokinWhere = { YM_ID: asStr(SHORI_TUKI) };
    var sokinMap = selectOne(db, "TPIM0004", null, sokinWhere, null) || {};
    var ymd = toYmd(sokinMap.get ? sokinMap.get("SOKIN_YOTEI_DATE") : sokinMap["SOKIN_YOTEI_DATE"]) ||
        firstDayOfMonthYmd(SHORI_TUKI); // USE_MONTH_END_FOR_PAYMENT を使うなら切替

    var jp = ymd ? seirekiToWarekiParts(ymd) : null;

    var out = {};

    out["GINKOU_CD"] = ginkoCd;
    out["SHITEN_CD"] = shitenCd;
    out["ZIP_CD"] = asStr(tkMap.get("YUBIN_NO"));
    out["ADDRESS1"] = asStr(tkMap.get("JUSHO1"));
    out["ADDRESS2"] = asStr(tkMap.get("JUSHO2"));
    out["SIMEI_KANA"] = asStr(tkMap.get("HON_KANA_SIMEI"));
    out["TK_NO"] = asStr(tkMap.get("TK_NO"));
    out["GENGO"] = jp ? jp.gengoName : "";
    out["NEN"] = jp ? jp.nen : "";
    out["GETU"] = jp ? jp.getu : "";
    out["HI"] = jp ? jp.hi : "";
    out["KINYU_NM"] = asStr(ginkoMap.get ? ginkoMap.get("BANK_NM") : ginkoMap["BANK_NM"]);
    out["SITEN_NM"] = asStr(ginkoMap.get ? ginkoMap.get("SHITEN_NM") : ginkoMap["SHITEN_NM"]);
    out["KOZA"] = asStr(tkMap.get("SHUBETU"));
    out["KOZA_NO"] = maskTail(asStr(tkMap.get("KOZA_NO")), 3, "*");
    out["BANK_CD"] = ginkoCd;
    out["SHITEN_CD"] = shitenCd;

    // SJIS 非対応文字を事前変換（共通の normalizeForSjis を利用）
    var normalized = {};
    var keys = Object.keys(out);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        normalized[k] = normalizeForSjis(out[k]);
    }

    return normalized;
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
    var NYUIN_KINGAKU = +asNum(calcMap['NYUIN_KINGAKU']);
    var GAIRAI_KINGAKU = +asNum(calcMap['GAIRAI_KINGAKU']);
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
