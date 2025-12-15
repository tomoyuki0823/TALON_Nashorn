setIryoSime();

/* ==================== Public API ==================== */

/**
 * 医療費締め処理（VIEWで計算済みの結果を元に、通知行を作成）
 * ・年間上限／累積ロジックは V_TK_T_IRYO_KARI_SOKIN_LOGIC 側に寄せる
 * ・JS側は「空白行／見出し行／明細行」の整形だけ行う
 */
function setIryoSime() {
    var db = TALON.getDbConfig();
    var conditionMap = TALON.getConditionData() || {};
    var SHORI_TUKI = asStr(conditionMap['SHORI_TUKI']);

    // 入力チェック（yyyymm）
    if (!isValidYm(SHORI_TUKI)) return;

    TalonDbUtil.begin(db);
    try {
        // ① 仮送金テーブル初期化＋コピー
        iryoKariDataInit(db, SHORI_TUKI);

        // ② 対象TK_NO一覧取得（VIEWベース）
        var tkList = fetchIryoTkList(db, SHORI_TUKI);

        // ③ 会員ごとの通知行作成
        for (var i = 0; i < tkList.length; i++) {
            var TK_NO = asStr(tkList[i]['TK_NO']);
            if (!TK_NO) continue;

            var tkMap = getTkMap(TK_NO);   // 共通の会員取得
            if (!tkMap) continue;

            adjustHonKanaForKeizoku(tkMap);

            processIryoForMember(db, SHORI_TUKI, TK_NO, tkMap);
        }

        // ③' 限度額超過分を TK_IRYO_03 に書き出し
        // exportOverCapToTkIryo03(db, SHORI_TUKI);

        // ③'' 仮送金テーブル → 本番送金テーブル（TK_T_IRYO_SOKIN）へ当月分を差分コピー
        syncIryoKariToSokin(db, SHORI_TUKI);

        // ④ 締めステータス更新
        updateIryoCloseStatus(db, SHORI_TUKI);

        TalonDbUtil.commit(db);
    } catch (e) {
        TalonDbUtil.rollback(db);
        throw e;
    }
}

/* ==================== Input Validate ==================== */

/** yyyymm 形式かざっくりチェック */
function isValidYm(ym) {
    return !!(ym && /^\d{6}$/.test(ym));
}

/* ==================== Pre Process (仮送金初期化) ==================== */

/**
 * 仮送金テーブル初期化
 *  ① TK_T_IRYO_KARI_SOKIN 当月分削除
 *  ② TK_T_IRYO_SOKIN 当月分を仮送金へコピー
 *  ③ TK_T_IRYO_SOKIN 当月分削除（別処理で差分INSERTする想定）
 */
function iryoKariDataInit(db, SHORI_TUKI) {

    // ① 仮送金テーブル当月分削除
    var delKariSql = ""
        + "DELETE FROM TK_T_IRYO_KARI_SOKIN "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";
    TalonDbUtil.delete(db, delKariSql);

    // ③ TK_T_IRYO_SOKIN 当月分削除（差分INSERTは別処理で実施）
    var delSokinSql = ""
        + "DELETE FROM TK_T_IRYO_SOKIN "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";
    TalonDbUtil.delete(db, delSokinSql);

    // ② 当月分の TK_T_IRYO_SOKIN を仮送金にコピー（現在は未使用）
    var insSql = ""
        + "INSERT INTO TK_T_IRYO_KARI_SOKIN ("
        + "  ID, TK_NO, SHORI_TUKI, ZOKU, KYUHU_TAISHO,"
        + "  RYOYO_NENGETU, GAIRAI_KINGAKU, GAIRAI_KINGAKU_RUIKEI,"
        + "  NYUIN_KINGAKU, KYUFU, CMT, SEQ,"
        + "  CREATED_DATE, CREATED_BY, CREATED_PRG_NM,"
        + "  UPDATED_DATE, UPDATED_BY, UPDATED_PRG_NM,"
        + "  modify_count, GINKO_CD, SHITEN_CD, KOZA_NO, KOZA_MEIGI,"
        + "  TAISYO_KINGAKU, NENDOKAN_KYUFU, SOKIN_DT, RUISEKI_DT, HBA_SEIRI_NO,"
        + "  MUJOKEN_SOKIN"
        + ") "
        + "SELECT "
        + "  ID, TK_NO, SHORI_TUKI, ZOKU, KYUHU_TAISHO,"
        + "  RYOYO_NENGETU, GAIRAI_KINGAKU, GAIRAI_KINGAKU_RUIKEI,"
        + "  NYUIN_KINGAKU, KYUFU, CMT, SEQ,"
        + "  CREATED_DATE, CREATED_BY, CREATED_PRG_NM,"
        + "  UPDATED_DATE, UPDATED_BY, UPDATED_PRG_NM,"
        + "  modify_count, GINKO_CD, SHITEN_CD, KOZA_NO, KOZA_MEIGI,"
        + "  TAISYO_KINGAKU, NENDOKAN_KYUFU, SOKIN_DT, RUISEKI_DT, HBA_SEIRI_NO,"
        + "  MUJOKEN_SOKIN "
        + "FROM TK_T_IRYO_SOKIN "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";
    // TalonDbUtil.insert(db, insSql);

    // ②' TK_IRYO → 仮送金テーブルへの転記を追加
    copyTkIryoToKari(db, SHORI_TUKI);
}

/**
 * TK_IRYO（月次登録データ）を TK_T_IRYO_KARI_SOKIN に転記する
 *  - SHORI_TUKI 単位
 */
function copyTkIryoToKari(db, SHORI_TUKI) {
    var where = { SHORI_TUKI: SHORI_TUKI };
    var iryoList = selectList(db, "TK_IRYO", null, where, null) || [];
    if (!iryoList || iryoList.length === 0) {
        return;
    }

    for (var i = 0; i < iryoList.length; i++) {
        var src = iryoList[i];

        var map = {};

        // 採番（ID が IDENTITY の場合は、この項目は削ってください）
        map["ID"] = TALON.getNumberingData("TID", 1)[0];

        map["TK_NO"] = asStr(src["TK_NO"]);
        map["SHORI_TUKI"] = asStr(src["SHORI_TUKI"]);
        map["ZOKU"] = asStr(src["ZOKU"]);
        map["KYUHU_TAISHO"] = asStr(src["KYUHU_TAISHO"]);

        // RYOYO_NENGETU：VIEW 側のロジックに合わせて 202501 のような数値文字列
        var ymStr = asStr(src["RYOYO_NENGETU"]);
        var ymInt = ymStr ? parseInt(ymStr.replace("/", "").substring(0, 6), 10) : null;
        map["RYOYO_NENGETU"] = ymInt != null ? ("" + ymInt) : null;

        map["GAIRAI_KINGAKU"] = asNum(src["GAIRAI_KINGAKU"]);
        map["GAIRAI_KINGAKU_RUIKEI"] = asNum(src["GAIRAI_KINGAKU_RUIKEI"]);
        map["NYUIN_KINGAKU"] = asNum(src["NYUIN_KINGAKU"]);
        map["KYUFU"] = asNum(src["KYUFU"]);
        map["CMT"] = asStr(src["CMT"]);
        map["SEQ"] = asNum(src["SEQ"]);

        // ★ 無条件送金金額
        map["MUJOKEN_SOKIN"] = asNum(src["MUJOKEN_SOKIN"]);

        map["CREATED_DATE"] = src["CREATED_DATE"];
        map["CREATED_BY"] = asStr(src["CREATED_BY"]);
        map["CREATED_PRG_NM"] = asStr(src["CREATED_PRG_NM"]);
        map["UPDATED_DATE"] = src["UPDATED_DATE"];
        map["UPDATED_BY"] = asStr(src["UPDATED_BY"]);
        map["UPDATED_PRG_NM"] = asStr(src["UPDATED_PRG_NM"]);
        map["modify_count"] = asNum(src["modify_count"]);

        // 銀行系は TK_MEMBER から COALESCE されるので null で問題なし
        map["GINKO_CD"] = null;
        map["SHITEN_CD"] = null;
        map["KOZA_NO"] = null;
        map["KOZA_MEIGI"] = null;

        // 限度額関連・送金日付は VIEW で計算するのでここでは null
        map["TAISYO_KINGAKU"] = null;
        map["NENDOKAN_KYUFU"] = null;
        map["SOKIN_DT"] = null;
        map["RUISEKI_DT"] = null;
        map["HBA_SEIRI_NO"] = null;

        insertByMapEx(db, "TK_T_IRYO_KARI_SOKIN", map, false);
    }
}

/* ==================== Queries ==================== */

/** VIEWから対象TK_NO一覧取得 */
function fetchIryoTkList(db, SHORI_TUKI) {
    var sql = ""
        + "SELECT TK_NO "
        + "FROM V_TK_T_IRYO_KARI_SOKIN_LOGIC "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "' "
        + "GROUP BY TK_NO";
    return TalonDbUtil.select(db, sql) || [];
}

/** VIEWから1会員分の明細取得（本人→配偶者、年月→SEQの順） */
function fetchIryoRowsFromView(db, SHORI_TUKI, TK_NO) {
    var sql = ""
        + "SELECT * "
        + "FROM V_TK_T_IRYO_KARI_SOKIN_LOGIC "
        + "WHERE TK_NO = '" + TK_NO + "' "
        + "AND SHORI_TUKI = '" + SHORI_TUKI + "' "
        + "ORDER BY "
        + "  ZOKU ASC, "
        + "  RYOYO_NENGETU ASC, "
        + "  SEQ ASC";
    return TalonDbUtil.select(db, sql) || [];
}

/* ==================== Domain Orchestration ==================== */

function processIryoForMember(db, SHORI_TUKI, TK_NO, tkMap) {
    var rows = fetchIryoRowsFromView(db, SHORI_TUKI, TK_NO);
    if (!rows || rows.length === 0) return;

    var sortCount = 10;
    var prevFY = null;
    var prevZOKU = null;   // 前回行のZOKUを保持

    var headerState = {
        "0": { headerDone: false },
        "1": { headerDone: false }
    };

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];

        var ZOKU = asStr(row["ZOKU"]);              // "0"=本人 / "1"=配偶者
        var RYOYO_NENGETU = asStr(row["RYOYO_NENGETU"]);
        var FY = calcFiscalYear(RYOYO_NENGETU);     // 会計年度（西暦）※空白行制御にのみ利用

        // ============================
        // 空白行ロジック（ここだけで制御）
        // ・前回FYがあり
        // ・FYが変わっていて
        // ・かつ「同じZOKU内」での変化のときだけ空行を入れる
        //   → 本人→配偶者に切り替わるタイミングでは挿入しない
        // ============================
        if (prevFY !== null && prevFY !== FY && prevZOKU === ZOKU) {
            insertBlankRow_Iryo(db, tkMap, SHORI_TUKI, sortCount++, RYOYO_NENGETU);
        }

        // ZOKU単位の見出し（表示上の年は療養年月ベース）
        sortCount = ensureFyHeaderRow(
            db,
            tkMap,
            SHORI_TUKI,
            sortCount,
            headerState,
            FY,
            ZOKU,
            row,
            RYOYO_NENGETU
        );

        // 明細行（表示上の年は療養年月ベース）
        sortCount = insertIryoDetailRow(
            db,
            tkMap,
            SHORI_TUKI,
            sortCount,
            row,
            RYOYO_NENGETU,
            FY
        );

        // 次ループ用に保持
        prevFY = FY;
        prevZOKU = ZOKU;
    }
}

/**
 * ZOKUごとの見出し行を必要に応じて作る
 *  - 年度内累計の開始値は「NENDOKAN_KYUFU - KYUFU」とする
 *  - 年度が変わっても、ZOKUごとに1回だけ
 *  - 表示する年は会計年度ではなく「療養年月ベースの和暦年」
 */
function ensureFyHeaderRow(db, tkMap, SHORI_TUKI, sortCount, headerState, FY, ZOKU, row, RYOYO_NENGETU) {

    if (!headerState[ZOKU]) {
        headerState[ZOKU] = { headerDone: false };
    }

    if (headerState[ZOKU].headerDone) {
        return sortCount;
    }

    var title = (ZOKU === "0") ? "(ﾎﾝﾆﾝ)" : "(ﾊｲｸﾞｳｼｬ)";

    // 療養年月(YYYYMM)ベースで和暦年を取得
    var jpHead = convertToWarekiPad2(RYOYO_NENGETU);
    var fyNen = jpHead ? jpHead.year : null;

    // VIEWのNENDOKAN_KYUFUは「今回分反映後」の年度内累計
    var nendoAfter = +asNum(row["NENDOKAN_KYUFU"]) || 0;
    var kyufuCurr = +asNum(row["KYUFU"]) || 0;
    var nendoBefore = nendoAfter - kyufuCurr;
    if (nendoBefore < 0) nendoBefore = 0;

    insertIryoCom02(
        db,
        tkMap,
        SHORI_TUKI,
        sortCount++,
        title,           // RYOYOUSYA（見出し：本人/配偶者）
        fyNen,           // 療養年月ベースの「和暦年」
        null,            // 月は見出しでは非表示
        null,
        null,
        null,
        nendoBefore,     // 年間累計（開始時点）
        "02"             // 区分：見出し
    );

    headerState[ZOKU].headerDone = true;
    return sortCount;
}

/* ==================== Domain Helpers (行生成) ==================== */

/**
 * 明細行（VIEWの計算結果を通知テーブルへ）
 *  - MUJOKEN_SOKIN > 0 の行は無条件行として別扱い
 *    → 控除なし
 *    → フラグは固定で「03」
 *  - 表示する年は会計年度ではなく「療養年月ベースの和暦年」
 */
function insertIryoDetailRow(
    db,
    tkMap,
    SHORI_TUKI,
    sortCount,
    row,
    RYOYO_NENGETU,
    FY                      // FYは空白行制御など別用途で保持（表示には使わない）
) {
    var jp = convertToWarekiPad2(RYOYO_NENGETU);

    // 療養年月ベースの和暦年
    var RYOYO_NEN_FY = jp ? jp.year : null;

    var RYOYOUSYA = asStr(row["TAISHOSHA_SHIMEI"]);
    var KYUFUGAKU = asNum(row["KYUFU"]) || 0;
    var NENKANKYUFUGAKU = asNum(row["NENDOKAN_KYUFU"]) || 0;

    var MUJOKEN_SOKIN = asNum(row["MUJOKEN_SOKIN"]) || 0;
    var isMujoken = (MUJOKEN_SOKIN > 0);

    var TAISYOGAKU;
    var KOJOGAKU;
    var rowFlg;

    if (isMujoken) {
        TAISYOGAKU = MUJOKEN_SOKIN;
        KOJOGAKU = null;
        rowFlg = "03";
    } else {
        TAISYOGAKU = asNum(row["TAISYO_KINGAKU"]) || 0;
        KOJOGAKU = 10000;

        var hitAnnualCap = (asNum(row["IS_HIT_ANNUAL_CAP"]) === 1);
        rowFlg = hitAnnualCap ? "01" : "00";
    }

    insertIryoCom02(
        db,
        tkMap,
        SHORI_TUKI,
        sortCount++,
        RYOYOUSYA,
        RYOYO_NEN_FY,      // 療養年月ベースの和暦年
        jp.month,          // 月は従来通り「受診月」
        TAISYOGAKU,
        KYUFUGAKU,
        KOJOGAKU,
        NENKANKYUFUGAKU,
        rowFlg
    );

    return sortCount;
}

/* ==================== POS / 通知テーブル出力 ==================== */

/**
 * 医療用 TK_SOKIN_TUCHI 挿入（POSヘッダ＋追加項目）
 *
 * @param {Object} db                  DB設定
 * @param {Object} tkMap               会員情報（TK_MEMBER系）
 * @param {string} SHORI_TUKI          処理月（yyyymm）
 * @param {number} sortKey             ソートキー
 * @param {string} RYOYOUSYA           療養者（氏名）
 * @param {string|number} RYOYO_NEN    療養年（和暦の年：例 7）
 * @param {string|number} RYOYO_GETU   療養月（例 3）
 * @param {number|null} TAISYOGAKU     対象額
 * @param {number} KYUFUGAKU           給付額
 * @param {number|null} KOJOGAKU       控除額
 * @param {number} NENKANKYUFUGAKU     年間給付額
 * @param {string} flg                 明細区分フラグ（"00"=通常, "01"=年限ヒット, "02"=見出し, "03"=無条件）
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
    // 見出し行のみ金額は非表示
    var isHeader = (flg === "02" || flg === "01" || flg === "03");

    // POSヘッダ共通部作成
    var pos = createIryoPosHeader(tkMap, SHORI_TUKI);

    pos["ID"] = TALON.getNumberingData("TID", 1)[0];
    pos["SORT_KEY"] = sortKey;
    pos["KYUFU_FLG"] = "1";           // 医療分は常に給付フラグ ON
    pos["RYOYOUSYA"] = RYOYOUSYA;
    pos["RYOYO_GENGO"] = "令和";      // 必要であれば和暦コードから可変にする
    pos["RYOYO_NEN"] = RYOYO_NEN;
    pos["RYOYO_GETU"] = RYOYO_GETU;
    pos["TAISYOGAKU"] = isHeader ? null : TAISYOGAKU;
    pos["KYUFUGAKU"] = KYUFUGAKU;
    pos["KOJOGAKU"] = isHeader ? null : KOJOGAKU;
    pos["NENKANKYUFUGAKU"] = NENKANKYUFUGAKU;
    pos["FLG"] = flg;
    pos["SHORI_TUKI"] = SHORI_TUKI;


    insertByMapEx(db, "TK_SOKIN_TUCHI", pos, false);
}

/**
 * FY切替時に入れる空白行（区切り）
 * 年は療養年月の和暦年を表示する
 */
function insertBlankRow_Iryo(db, tkMap, SHORI_TUKI, sortKey, RYOYO_NENGETU) {

    // 受診年月(YYYYMM) → 和暦変換
    var jp = convertToWarekiPad2(RYOYO_NENGETU);
    var nen = jp ? jp.year : "";   // 和暦年

    insertIryoCom02(
        db,
        tkMap,
        SHORI_TUKI,
        sortKey,
        "",        // RYOYOUSYA（空行なので空）
        nen,       // 療養年月由来の和暦年
        "",        // 月は空白のまま
        null,
        null,
        null,
        null,
        "00"       // 空白行
    );
}

/**
 * POSヘッダ（和暦年月日・口座末尾マスク・銀行名/支店名）
 */
function createIryoPosHeader(tkMap, SHORI_TUKI) {
    var db = TALON.getDbConfig();

    var ginkoCd = asStr(tkMap.get("GINKOU_CD"));
    var shitenCd = asStr(tkMap.get("SHITEN_CD"));

    var whereBank = {
        BANK_CD: ginkoCd,
        SHITEN_CD: shitenCd
    };
    var ginkoMap = selectOne(db, "COM_M_BANK", null, whereBank, null) || {};

    var sokinWhere = { YM_ID: asStr(SHORI_TUKI) };
    var sokinMap = selectOne(db, "TPIM0004", null, sokinWhere, null) || {};
    var ymd = toYmd(sokinMap.get ? sokinMap.get("SOKIN_YOTEI_DATE") : sokinMap["SOKIN_YOTEI_DATE"])
        || firstDayOfMonthYmd(SHORI_TUKI);

    var jp = ymd ? seirekiToWarekiParts(ymd) : null;

    var out = {};

    out["GINKOU_CD"] = ginkoCd;
    out["SHITEN_CD"] = shitenCd;
    out["ZIP_CD"] = asStr(tkMap.get("YUBIN_NO"));
    out["ADDRESS1"] = asStr(tkMap.get("JUSHO1"));
    out["ADDRESS2"] = asStr(tkMap.get("JUSHO2"));
    var HON_TAISYOKU_CD = asStr(tkMap.get("HON_TAISYOKU_CD"));
    var SIMEI_KANA = asStr(tkMap.get("HON_KANA_SIMEI"));
    if (HON_TAISYOKU_CD == "91") {
        SIMEI_KANA = asStr(tkMap.get("HAI_KANA_SIMEI"));
    }
    out["SIMEI_KANA"] = SIMEI_KANA;
    out["TK_NO"] = asStr(tkMap.get("TK_NO"));
    out["GENGO"] = jp ? jp.gengoName : "";
    out["NEN"] = jp ? jp.nen : "";
    out["GETU"] = jp ? jp.getu : "";
    out["HI"] = jp ? jp.hi : "";
    out["KINYU_NM"] = asStr(ginkoMap.get ? ginkoMap.get("BANK_NM") : ginkoMap["BANK_NM"]);
    out["SITEN_NM"] = asStr(ginkoMap.get ? ginkoMap.get("SHITEN_NM") : ginkoMap["SHITEN_NM"]);
    out["KOZA"] = asStr(tkMap.get("SHUBETU"));
    out["KOZA_NO"] = maskTail(asStr(tkMap.get("KOZA_NO")), 3, "*");

    // SJIS 非対応文字を事前変換
    var normalized = {};
    var keys = Object.keys(out);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        normalized[k] = normalizeForSjis(out[k]);
    }

    return normalized;
}

/* ==================== Close Status ==================== */

/** 医療締め専用：締め状態更新 */
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

/**
 * 限度額超過データを TK_IRYO_03 に出力する
 *  - 対象：V_TK_T_IRYO_KARI_SOKIN_LOGIC のうち IS_HIT_ANNUAL_CAP = 1 の行
 *  - テーブル定義は TK_IRYO と同一想定
 */
function exportOverCapToTkIryo03(db, SHORI_TUKI) {

    // 当月分を一旦削除（再実行時の二重登録防止）
    var delSql = ""
        + "DELETE FROM TK_IRYO_03 "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";
    TalonDbUtil.delete(db, delSql);

    // 年度限度額でカットされた行のみ抽出
    var sql = ""
        + "SELECT * "
        + "FROM V_TK_T_IRYO_KARI_SOKIN_LOGIC "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "' "
        + "AND IS_HIT_ANNUAL_CAP = 1";

    var list = TalonDbUtil.select(db, sql) || [];
    if (!list || list.length === 0) {
        return;
    }

    for (var i = 0; i < list.length; i++) {
        var row = list[i];
        var map = {};

        // === PK相当 ===
        map["TK_NO"] = asStr(row["TK_NO"]);
        map["SHORI_TUKI"] = asStr(row["SHORI_TUKI"]);
        map["ZOKU"] = asStr(row["ZOKU"]);

        // RYOYO_NENGETU は "202506" 形式で格納
        var ymInt = asNum(row["RYOYO_NENGETU"]);
        var ymStr = ymInt ? String(ymInt) : "";
        map["RYOYO_NENGETU"] = ymStr;

        // === 金額系 ===
        map["GAIRAI_KINGAKU"] = asNum(row["GAIRAI_KINGAKU"]);
        map["GAIRAI_KINGAKU_RUIKEI"] = null;
        map["NYUIN_KINGAKU"] = asNum(row["NYUIN_KINGAKU"]);

        // 年度限度額で削られた給付額を KYUFU に格納
        var overKyufu = +asNum(row["OVER_KYUFU_ANNUAL"]) || 0;
        map["KYUFU"] = overKyufu;
        // もし「本来の給付額」を持ちたいなら ↓ こちらに変更
        // map["KYUFU"] = asNum(row["KYUFU_BASE"]);

        map["CMT"] = null;
        map["SEQ"] = asNum(row["SEQ"]);

        var now = new java.util.Date();
        map["CREATED_DATE"] = now;
        map["CREATED_BY"] = TALON.getUserId ? TALON.getUserId() : null;
        map["CREATED_PRG_NM"] = "TK_IRYO_03";
        map["UPDATED_DATE"] = now;
        map["UPDATED_BY"] = map["CREATED_BY"];
        map["UPDATED_PRG_NM"] = map["CREATED_PRG_NM"];
        map["modify_count"] = 0;

        // 各種フラグ類は、要件が決まるまでは null 想定
        map["KYUHU_TAISHO"] = null;
        map["MUJOKEN_SOKIN"] = null;
        map["KIKAN_MUKO_FLG"] = null;
        map["TAISYOKU_FLG"] = null;
        map["RYOYO_YM_JIKO_FLG"] = null;
        map["KAIIN_HIKAIIN_FLG"] = null;
        map["KANYU_MAE_FLG"] = null;
        map["TAIKAI_FLG"] = null;
        map["GINKO_MASTER_FUSEIGO_FLG"] = null;
        map["TAIKAIGO_FLG"] = null;

        insertByMapEx(db, "TK_IRYO_03", map, false);
    }
}

/**
 * 仮送金テーブル → 本番送金テーブルへの差分コピー
 *  - 対象：当月分 SHORI_TUKI
 *  - 事前に TK_T_IRYO_SOKIN 当月分は削除済み（iryoKariDataInit）
 *  - よって実質「当月分を丸ごと再作成」だが、再実行しても二重登録にはならない
 */
function syncIryoKariToSokin(db, SHORI_TUKI) {

    // 念のため当月分削除（多重実行でも安全）
    var delSql = ""
        + "DELETE FROM TK_T_IRYO_SOKIN "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";
    TalonDbUtil.delete(db, delSql);

    var insSql = ""
        + "INSERT INTO TK_T_IRYO_SOKIN ("
        + "  ID, TK_NO, SHORI_TUKI, ZOKU, KYUHU_TAISHO,"
        + "  RYOYO_NENGETU, GAIRAI_KINGAKU, GAIRAI_KINGAKU_RUIKEI,"
        + "  NYUIN_KINGAKU, KYUFU, CMT, SEQ,"
        + "  CREATED_DATE, CREATED_BY, CREATED_PRG_NM,"
        + "  UPDATED_DATE, UPDATED_BY, UPDATED_PRG_NM,"
        + "  modify_count, GINKO_CD, SHITEN_CD, KOZA_NO, KOZA_MEIGI,"
        + "  TAISYO_KINGAKU, NENDOKAN_KYUFU, SOKIN_DT, RUISEKI_DT, HBA_SEIRI_NO,"
        + "  MUJOKEN_SOKIN"
        + ") "
        + "SELECT "
        + "  ID, TK_NO, SHORI_TUKI, ZOKU, KYUHU_TAISHO,"
        + "  RYOYO_NENGETU, GAIRAI_KINGAKU, GAIRAI_KINGAKU_RUIKEI,"
        + "  NYUIN_KINGAKU, KYUFU, CMT, SEQ,"
        + "  CREATED_DATE, CREATED_BY, CREATED_PRG_NM,"
        + "  UPDATED_DATE, UPDATED_BY, UPDATED_PRG_NM,"
        + "  modify_count, GINKO_CD, SHITEN_CD, KOZA_NO, KOZA_MEIGI,"
        + "  TAISYO_KINGAKU, NENDOKAN_KYUFU, SOKIN_DT, RUISEKI_DT, HBA_SEIRI_NO,"
        + "  MUJOKEN_SOKIN "
        + "FROM TK_T_IRYO_KARI_SOKIN "
        + "WHERE SHORI_TUKI = '" + SHORI_TUKI + "'";

    TalonDbUtil.insert(db, insSql);
}

/**
 * 本人カナ名の差し替え（資格継続パターン）
 * ・配偶者カナ＋退職CD=99 のとき本人カナを配偶者に差し替え
 *   それ以外は請求名で上書き
 */
function adjustHonKanaForKeizoku(tkMap) {

    var HON_TAISYOKU_CD = tkMap['HON_TAISYOKU_CD'];
    var HAI_TAISYOKU_CD = tkMap['HAI_TAISYOKU_CD'];
    var HAI_KANA_SIMEI = tkMap['HAI_KANA_SIMEI'];
    var SEIKYU_KANA_NM = tkMap['SEIKYU_KANA_NM'];

    if (HON_TAISYOKU_CD != "90" && HON_TAISYOKU_CD != "91") {
        return;
    }

    if (HAI_KANA_SIMEI && HAI_TAISYOKU_CD == "99" && HAI_TAISYOKU_CD != "91") {
        tkMap['HON_KANA_SIMEI'] = HAI_KANA_SIMEI;
    } else {
        tkMap['HON_KANA_SIMEI'] = SEIKYU_KANA_NM;
    }
}
