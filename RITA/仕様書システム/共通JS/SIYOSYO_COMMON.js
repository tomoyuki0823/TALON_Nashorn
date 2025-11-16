/**
 * 初期条件から指定された仕様書番号（SISYOSYO_NO）をもとに、
 * SIYOSYO_MAIN_WORK テーブルから SIYOSYO_SEQ を取得し、
 * 検索条件データに設定する。
 */
function setSiyosyoNoToSiyosyoSeq() {
    var conditionMap = TALON.getConditionData();
    var SIYOSYO_NO = conditionMap["SIYOSYO_NO"];
    var SIYOSYO_SEQ = conditionMap["SIYOSYO_SEQ"];

    if (TALON.getButtonName() == "IVH子基盤生成") {
        var whereMap = {
            "SIYOSYO_SEQ": SIYOSYO_SEQ
        };

        var record = selectOne(TALON.getDbConfig(), "SIYOSYO_MAIN_WORK", null, whereMap, null);
        var SIYOSYO_NO = record["SIYOSYO_NO"]
        TALON.setSearchConditionData("SIYOSYO_NO", SIYOSYO_NO, "");

    } else {
        var whereMap = {
            "SIYOSYO_NO": SIYOSYO_NO
        };

        var record = selectOne(TALON.getDbConfig(), "SIYOSYO_MAIN_WORK", null, whereMap, null);
        var siyoshoSeq = record["SIYOSYO_SEQ"];
        TALON.setSearchConditionData("SIYOSYO_SEQ", siyoshoSeq, "");
    }

}

/**
 * 仕様書番号取得
 * @returns 
 */
function getSiyoshoNo() {
    var ki = getKi();  // "42", "43"など
    var db = TALON.getOtherDBConn("1");
    var db2 = TALON.getDbConfig();

    var sql2 = " SELECT COUNT(*) CNT FROM SIYOSYO_MAIN_WORK"
    var resultList = TalonDbUtil.select(db2, sql2);
    var CNT = resultList[0]['CNT']

    if (CNT > 0) {
        var sql = "SELECT MAX(SIYOSYO_NO) AS MAX_NO FROM SIYOSYO_MAIN_WORK WHERE SIYOSYO_NO LIKE '60" + ki + "%'";
        var resultList = TalonDbUtil.select(db2, sql);
    } else {

        var sql = "SELECT MAX(SIYOSYO_NO) AS MAX_NO FROM SIYOSYO_MAIN WHERE SIYOSYO_NO LIKE '60" + ki + "%'";
        var resultList = TalonDbUtil.select(db, sql);
    }

    var maxNo = resultList.length > 0 ? resultList[0]["MAX_NO"] : null;
    var nextSeq = 1;

    if (maxNo) {
        var currentSeq = parseInt(maxNo.slice(-4), 10);
        nextSeq = currentSeq + 1;
    }

    var newSiyoshoNo = "60" + ki + ("000" + nextSeq).slice(-4);
    return newSiyoshoNo;
}

/**
 * 現在日付に基づいて「期」を返す（2桁）
 * - 期の切替日は毎年7月1日
 * - 例：2025/06/30 → 42期（"42"）
 *       2025/07/01 → 43期（"43"）
 */
function getKi() {
    var LocalDate = Java.type("java.time.LocalDate");
    var Period = Java.type("java.time.Period");

    // 基準日
    var startDate = LocalDate.of(1983, 7, 1);
    // 現在日付
    var currentDate = LocalDate.now();
    // 差分
    var period = Period.between(startDate, currentDate);
    // 1983/07/1を1とする
    return period.getYears() + 1;
}

/**
 * 表面処理コードに対応する汎用コードマスタの情報を1件取得する。
 *
 * @param {string} HYOMEN_SYORI_CD - 対象の表面処理コード（KEY_CODE に該当）
 * @returns {Object|null} 対応するTLN_M_HANYO_CODE_MAINのレコード（存在しない場合は null）
 */
function _getSousuValue(SOUSU, hyomenSaibanCd) {

    if (hyomenSaibanCd == "0") {

        return "O"
    }

    SOUSU = _adjustSousuToEven(SOUSU)

    var whereMap = {};
    whereMap['KEY_CODE'] = SOUSU;
    whereMap['SIKIBETU_CODE'] = "SIYOH001";
    return selectOne(TALON.getDbConfig(), 'TLN_M_HANYO_CODE_MAIN', null, whereMap, null)['DSP2'];

}

/**
 * 表面処理コードに対応する汎用コードマスタの情報を1件取得する。
 *
 * @param {string} HYOMEN_SYORI_CD - 対象の表面処理コード（KEY_CODE に該当）
 * @returns {Object|null} 対応するTLN_M_HANYO_CODE_MAINのレコード（存在しない場合は null）
 */
function _getHyomenMap(HYOMEN_SYORI_CD) {
    var whereMap = {};
    whereMap['KEY_CODE'] = HYOMEN_SYORI_CD;
    whereMap['SIKIBETU_CODE'] = "HYOMEN_SYORI";
    return selectOne(TALON.getDbConfig(), 'TLN_M_HANYO_CODE_MAIN', null, whereMap, null)['DSP2'];
}

/**
 * 指定された情報を元に製品コードを構成し、SIYOSYO_MAIN_WORK に更新する。
 *
 * @param {string} SIYOSYO_SEQ
 * @param {string} HYOMEN_SYORI_CD
 * @param {number} SOUSU
 * @param {string} NEW_SHOHIN_CD
 * @param {string} RIVIJON
 * @param {string} COST
 * @param {string} KOJO_NO
 */
function setSiyoSeihinCd(SIYOSYO_SEQ, HYOMEN_SYORI_CD, SOUSU, NEW_SHOHIN_CD, RIVIJON, COST, KOJO_NO) {

    var result = "";

    // 表面処理コードチェック
    if (!HYOMEN_SYORI_CD) {
        TALON.addErrorMsg("表面処理情報が設定されていません");
        TALON.setIsSuccess(false);
        return;
    }
    var hyomenSaibanCd = _getHyomenMap(HYOMEN_SYORI_CD);
    result += hyomenSaibanCd;

    // 層数チェック
    if (!SOUSU) {
        TALON.addErrorMsg("層数が設定されていません");
        TALON.setIsSuccess(false);
        return;
    }
    result += _getSousuValue(SOUSU, hyomenSaibanCd);

    // 新商品コードチェック
    if (!NEW_SHOHIN_CD) {
        TALON.addErrorMsg("新商品コードが設定されていません");
        TALON.setIsSuccess(false);
        return;
    }
    result += NEW_SHOHIN_CD + "-0000";

    // リビジョンチェック
    if (!RIVIJON) {
        TALON.addErrorMsg("リビジョンが設定されていません");
        TALON.setIsSuccess(false);
        return;
    }
    result += RIVIJON;

    // 価格チェック
    if (!COST) {
        TALON.addErrorMsg("価格が設定されていません");
        TALON.setIsSuccess(false);
        return;
    }
    result += COST;
    result += "V00";

    // 更新用データ構築
    var updateMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,
        SEIHIN_CD: result
    };

    var whereKeys = ["SIYOSYO_SEQ"];
    var conn = TALON.getDbConfig();
    var enableLog = true;

    updateByMapEx(conn, "SIYOSYO_MAIN_WORK", updateMap, whereKeys, enableLog);

    var whereMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ
    }
    var map = selectOne(conn, "SIYOSYO_MAIN_WORK", null, whereMap, null);
    var BIKO1 = "仕様書No." + map['SIYOSYO_NO'] + " 製品CD:" + result;
    // 更新用データ構築
    var henkoMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,
        BIKO1: BIKO1
    };

    if (getCount(conn, "HENKOBI_BIKO_WORK", whereMap) > 0) {

        updateByMapEx(conn, "HENKOBI_BIKO_WORK", henkoMap, whereKeys, enableLog);
    } else {

        insertByMapEx(conn, "HENKOBI_BIKO_WORK", henkoMap, enableLog);

    }
}
/**
 * 1. 工程順管理情報を SIYOSYO_SEQ を条件に検索し、登録済みか確認する。
 * 2. 登録済みであれば処理終了。未登録なら層数を元に工程順を登録する。
 *
 * @param {string} SIYOSYO_SEQ - 対象仕様書番号
 * @param {number} SOUSU - 層数
 * @param HYOMEN_SYORI_CD - 表面処理コード
 * @param nonCreateKouteiCdList - 作成対象外工程コード
 */
function setInitKoutei(SIYOSYO_SEQ, SOUSU, HYOMEN_SYORI_CD, nonCreateKouteiCdList, SIYO_IVH_FLG) {

    // STEP 3: 工程初期リストを取得

    var SIYO_IVH_FLG = SIYO_IVH_FLG ? SIYO_IVH_FLG : "0";
    var kouteiInitList = getKouteiInitList(SOUSU, HYOMEN_SYORI_CD, SIYO_IVH_FLG);
    if (!kouteiInitList || kouteiInitList.length === 0) {
        return;
    }

    // STEP 1: 既存件数チェック
    var whereMap = { "SIYOSYO_SEQ": SIYOSYO_SEQ };
    var cnt = getCount(TALON.getDbConfig(), "KOUTEIJUN_KANRI_WORK", whereMap);

    // STEP 2: 洗い替え
    if (cnt >= 1) {
        var del_sql = "DELETE FROM KOUTEIJUN_KANRI_WORK WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ + "'";
        TalonDbUtil.delete(TALON.getDbConfig(), del_sql);
    }

    // STEP 4: 工程順を1件ずつ登録
    var conn = TALON.getDbConfig();
    var userData = TALON.getUserInfoMap();
    var now = new java.sql.Timestamp((new java.util.Date()).getTime());

    var kouteiJun = 0;
    for (var i = 0; i < kouteiInitList.length; i++) {
        var record = kouteiInitList[i];

        if (nonCreateKouteiCdList.indexOf(record['KOUTEI_CD']) !== -1) {
            continue;
        }

        kouteiJun++;

        var kouteiMap = getKouteiMst(record['KOUTEI_CD']);
        var insertMap = {
            "SIYOSYO_SEQ": SIYOSYO_SEQ,
            "KOUTEI_SEQ": TALON.getNumberingData('TID', 1)[0],
            "KOUTEI_JUN": kouteiJun,
            "KOUTEI_CD_M": kouteiMap['GAMEN_REI_KOUTEI_CD'],
            "KOUTEI_CD": record['KOUTEI_CD'],
            "KOUTEI_NM": kouteiMap['KOUTEI_NM'],
            "TOUROKU_ID": userData['USER_ID'],
            "TOUROKU_DT": now,
            "KOUSIN_ID": userData['USER_ID'],
            "KOUSIN_DT": now
        };

        // 登録処理結果をチェック
        var result = insertByMapEx(conn, "KOUTEIJUN_KANRI_WORK", insertMap, true);
        if (!result) {
            throw new Error("登録に失敗しました: KOUTEI_JUN = " + record['KOUTEI_JUN']);
        }
    }

    // 全件正常に登録完了
    TALON.setIsSuccess(true);
}

function getKouteiMst(KOUTEI_CD) {
    var conn = TALON.getDbConfig();
    var tableName = "KOUTEI_MEISAI_MST";
    var columns = null;
    var whereMap = { KOUTEI_CD: KOUTEI_CD };
    var orderBy = null;

    return selectOne(conn, tableName, columns, whereMap, orderBy);
}


/**
 * 仕様書採番値取得
 * 
 * ※呼出元はエラーハンドリングを行うこと
 * 
 * @param {*} SEQ_SYU SEQ種
 * @param {*} ZOUGEN_TI 増減値
 * @returns 採番したリスト
 */
function getSiyoNum(SEQ_SYU, ZOUGEN_TI) {

    // SEQ_MSTから対象レコードを1件取得
    var columns = ["SEQ_TI", "ZOUGEN_TI", "KOUSIN_DT"];
    var whereMap = { "SEQ_SYU": String(SEQ_SYU) };
    var seqMst = selectOne(TALON.getOtherDBConn("1"), "SEQ_MST", columns, whereMap, null);
    if (!seqMst) {
        throw new Error("指定されたSEQ_SYU [" + SEQ_SYU + "] のデータが存在しません。");
    }

    // 増減値の指定が無い場合、マスタの値を使用する
    if (!ZOUGEN_TI) {
        ZOUGEN_TI = seqMst["ZOUGEN_TI"];
    }

    // SQLの生成
    var afterSeqTi = parseInt(seqMst["SEQ_TI"]) + parseInt(ZOUGEN_TI);
    var updateSql = ""
        + "UPDATE SEQ_MST "
        + "SET SEQ_TI = " + afterSeqTi + ", "
        + "KOUSIN_ID = 'TALON', "
        + "KOUSIN_DT = GETDATE() "
        + "WHERE SEQ_SYU = '" + String(SEQ_SYU) + "'"
        + "  AND KOUSIN_DT = '" + seqMst["KOUSIN_DT"] + "'";

    // 更新
    TalonDbUtil.update(TALON.getOtherDBConn("1"), updateSql);

    // 返却値の生成
    var seqList = [];
    var minSeq = seqMst["SEQ_TI"] + 1;
    var maxSeq = seqMst["SEQ_TI"] + ZOUGEN_TI;
    for (var i = minSeq; i <= maxSeq; i++) {
        seqList.push(i);
    }

    return seqList;
}

/**
 * 層数（SOUSU）に対応するパターンコード（PTN_CD）を
 * SIYOM006マスタから取得する処理。
 *
 * - 該当するデータが存在しない場合は、エラーメッセージを追加し、
 *   成功フラグを false に設定して null を返す。
 *
 * @param {string|number} SOUSU - 対象となる層数（数値文字列）
 * @returns {string|null} 対応するパターンコード（PTN_CD）、存在しない場合は null
 */
function getSiyoM006(SOUSU) {
    var conn = TALON.getDbConfig();
    var tableName = "SIYOM006";
    var columns = ["PTN_CD"];
    var whereMap = { "SOUSU": String(SOUSU) };
    var orderBy = null;

    var map = selectOne(conn, tableName, columns, whereMap, orderBy);

    if (!map) {
        TALON.addErrorMsg("層数[" + SOUSU + "]に関連する情報がマスタ(SIYOM006)に設定されていません。");
        TALON.setIsSuccess(false);
        return null;
    }

    TALON.setIsSuccess(true);
    return map["PTN_CD"];
}

/**
 * 指定されたパターンコードに対応する工程情報を取得します。
 * 
 * - KOUTEI_CD（工程コード）、KOUTEI_JUN（工程順）を含むリストを返却。
 * - 該当データが存在しない場合はエラーを登録し null を返却。
 * 
 * @param PTN_CD 対象のパターンコード
 * @return 工程情報のリスト（List<Map>）、該当なしまたはエラー時は null
 */
function getSiyoM005(PTN_CD) {

    // SQL整形（読みやすさ向上）
    var sql = ""
        + " SELECT SIYOM005.KOUTEI_CD, SIYOM005.KOUTEI_JUN, KOUTEI_MEISAI_MST.KOUTEI_NM, KOUTEI_MEISAI_MST.GAMEN_REI_KOUTEI_CD AS KOUTEI_CD_M"
        + " FROM SIYOM005 INNER JOIN KOUTEI_MEISAI_MST ON SIYOM005.KOUTEI_CD = KOUTEI_MEISAI_MST.KOUTEI_CD"
        + " WHERE SIYOM005.PTN_CD = '" + PTN_CD + "'";

    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    if (!mapList || mapList.length === 0) {
        TALON.addErrorMsg("パターンコード[" + PTN_CD + "]に関連する情報がマスタ(SIYOM005)に設定されていません。");
        TALON.setIsSuccess(false);
        return null;
    }

    return mapList;
}

function getSiyoM010(SOUSU, HYOMEN_SYORI_CD, SIYO_IVH_FLG) {

    var conn = TALON.getDbConfig();
    var tableName = "SIYOM013";
    var columns = null;

    // ★6層以上はすべて6層として扱う
    var normalizedSousu = (Number(SOUSU) >= 6) ? 6 : SOUSU;

    var whereMap = {
        "SOUSU": normalizedSousu,
        "HYOMEN_SYORI_CD": String(HYOMEN_SYORI_CD),
        "SIYO_IVH_FLG": SIYO_IVH_FLG ? SIYO_IVH_FLG : "0"
    };

    var orderBy = "KOUTEI_JUN ASC";

    return selectList(conn, tableName, columns, whereMap, orderBy);
}




/**
 * 層数に基づき、初期工程リストを取得します。
 * 
 * - SOUSU（層数）をキーに SIYOM006 から PTN_CD を取得。
 * - 取得した PTN_CD を元に SIYOM005 から工程リストを取得。
 * 
 * @param SOUSU 対象の層数（数値文字列）
 * @return 工程リスト（List<Map>）、該当なしまたはエラー時は null
 */
function getKouteiInitList(SOUSU, HYOMEN_SYORI_CD, SIYO_IVH_FLG) {
    return getSiyoM010(SOUSU, HYOMEN_SYORI_CD, SIYO_IVH_FLG)
}

/**
 * TALON→RITADBへの連携機能
 * 
 * @param TARGET_SIYOSYO_SEQ 連携対象の仕様書番号
 */
function renkeiSiyosyoMain(TALON_SIYOSYO_SEQ, SIYOSYO_NO) {

    // TALON側はTIDで採番されているのでRITAの仕様書SEQを採番
    var RITA_SIYOSYO_SEQ = getSiyoNum("1")[0];

    // 各テーブルを連携する
    // 仕様書メイン
    var delSQL = " DELETE FROM SIYOSYO_MAIN WHERE SIYOSYO_NO = '" + SIYOSYO_NO + "'"
    TalonDbUtil.delete(TALON.getOtherDBConn("1"), delSQL);

    _renkeiSiyosyo("SIYOSYO_MAIN", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, null, null);
    // 層構成管理
    _renkeiSiyosyo("SOUKOUSEI_KANRI", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, "SOUKOUSEI_SEQ", "3");
    // 工程順管理
    _renkeiSiyosyo("KOUTEIJUN_KANRI", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, "KOUTEI_SEQ", "2");
    // 工程明細仕様書​
    _renkeiSiyosyo("KOUTEI_MEISAI_SIYOSYO", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, null, null);
    // 工程明細項目
    _renkeiSiyosyo("KOUTEI_MEISAI_KOUMOKU", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, null, null);
    //管理 
    _renkeiSiyosyo("HENKOBI_BIKO", TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, null, null);

    var updSql = " UPDATE SOUKOUSEI_KANRI SET SOUKOUSEI_NO = '' WHERE SOUKOUSEI_NO IS NULL AND SIYOSYO_SEQ =" + TALON_SIYOSYO_SEQ

    createSoukouteiPrtWorkData(SIYOSYO_NO, TALON_SIYOSYO_SEQ);

    TalonDbUtil.update(TALON.getOtherDBConn("1"), updSql);

}

function createSoukouteiPrtWorkData(SIYOSYO_NO, TALON_SIYOSYO_SEQ) {

    var userData = TALON.getUserInfoMap();
    var user_id = userData['USER_ID'];

    var whereMap = {
        SIYOSYO_NO: SIYOSYO_NO,
        PRT_TANMATU_ID: user_id
    }

    deleteByMapEx(TALON.getOtherDBConn("1"), "SOKOUSEI_PRT_WORK", whereMap, ["SIYOSYO_NO", "PRT_TANMATU_ID"], true);

    var whereMap = {
        SIYOSYO_SEQ: TALON_SIYOSYO_SEQ
    }

    var mapList = selectList(TALON.getDbConfig(), "SOUKOUSEI_KANRI_WORK", null, whereMap, null);
    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];

        var insMap = {
            SOKOUSEI_PRT_WK_SEQ: map ? map["SOUKOUSEI_SEQ"] : 0,
            PRT_TANMATU_ID: user_id,
            SIYOSYO_NO: SIYOSYO_NO,
            PAGE_NO: 1,
            SOUKOUSEI_NO: map ? map["SOUKOUSEI_NO"] : "",
            SOUKOUSEI_ZU_CD: map ? map["SOU_KOUSEI_ZU"] : "",
            SOUKOUSEI_HINMOKU_CD: map ? map["SOUKOUSEI_HINMOKU_CD"] : "",
            SOUKOUSEI_HINMOKU_NM: map ? map["SOUKOUSEI_HINMOKU_NAME"] : "",
            MAISU: map ? map["MAISU"] : "",
        }
        insertByMapEx(TALON.getOtherDBConn("1"), "SOKOUSEI_PRT_WORK", insMap, true);
    }
}

function copySiyosyo(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, IVH_COPY_FLG, lastFlg) {

    var IVH_COPY_FLG = IVH_COPY_FLG ? IVH_COPY_FLG : "0"
    var lastFlg = lastFlg ? lastFlg : false;

    copySiyosyoWork(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, "SIYOSYO_MAIN_WORK", IVH_COPY_FLG, lastFlg);
    copySiyosyoWork(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, "KOUTEIJUN_KANRI_WORK", IVH_COPY_FLG, lastFlg);
    copySiyosyoWork(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, "SOUKOUSEI_KANRI_WORK", IVH_COPY_FLG, lastFlg);
    copySiyosyoWork(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, "HENKOBI_BIKO_WORK", null, lastFlg);
}

/**
 * 指定されたSIYOSYO_SEQ（仕様書SEQ）のデータを、別のNEW_SIYOSYO_SEQに複製する。
 *
 * <p>対応テーブル：</p>
 * - SIYOSYO_MAIN_WORK：1件コピー（IVH_COPY_FLGによりIVH関連情報を付加）  
 * - HENKOBI_BIKO_WORK：1件コピー  
 * - KOUTEIJUN_KANRI_WORK：複数行＋KOUTEI_SEQ採番＋関連テーブルも複製  
 * - SOUKOUSEI_KANRI_WORK：複数行＋SOUKOUSEI_SEQ採番で複製
 *
 * @param {number} SIYOSYO_SEQ - 元の仕様書SEQ
 * @param {number} NEW_SIYOSYO_SEQ - 新しく複製先の仕様書SEQ
 * @param {string} tableName - 複製対象テーブル名
 * @param {string} IVH_COPY_FLG - "1" の場合、IVH関連情報も引き継いで複製する
 */
function copySiyosyoWork(SIYOSYO_SEQ, NEW_SIYOSYO_SEQ, tableName, IVH_COPY_FLG, lastFlg) {
    var conn = TALON.getDbConfig();
    var whereMap = { SIYOSYO_SEQ: SIYOSYO_SEQ };

    // ===== 単票コピー（1件のみ）=====
    if (tableName === "SIYOSYO_MAIN_WORK") {
        var map = selectOne(conn, tableName, null, whereMap, null);
        if (!map) return;

        // 新しいSEQに差し替え
        map['SIYOSYO_SEQ'] = NEW_SIYOSYO_SEQ;
        map['COPY_FLG'] = "1";  // コピーした印をつける

        var IVH_OYA_SIYO_NO = map['SIYOSYO_NO'];
        var IVH_OYA_HINMOKU_CD = map['HINMOKU_CD']
        var NEW_SIYO_NO = getSiyoshoNo();

        var OLD_SEIHIN_CD = map['SEIHIN_CD'];
        map['SIYOSYO_NO'] = NEW_SIYO_NO;
        if (IVH_COPY_FLG === "1") {

            var IVH_NAISO_FLG = map['IVH_NAISO_FLG'];

            // 最初のオリジナル値をキープ
            var baseIVH_OYA_SIYO_NO = IVH_OYA_SIYO_NO;
            var baseIVH_OYA_HINMOKU_CD = map['HINMOKU_CD'];
            var newSiyosyoNo = NEW_SIYO_NO;

            // 条件によって使用する値を分岐して設定
            var newIVH_OYA_SIYO_NO = (IVH_NAISO_FLG == "1" && lastFlg) ? newSiyosyoNo : baseIVH_OYA_SIYO_NO;
            var newIVH_OYA_HINMOKU_CD = (IVH_NAISO_FLG == "1" && lastFlg) ? newSiyosyoNo : baseIVH_OYA_SIYO_NO;

            var newHINMOKU_CD = (IVH_NAISO_FLG == "1" && lastFlg) ? baseIVH_OYA_SIYO_NO : newSiyosyoNo;
            var newSIYOSYO_NO = (IVH_NAISO_FLG == "1" && lastFlg) ? baseIVH_OYA_SIYO_NO : newSiyosyoNo;


            // 整形処理
            var formattedHINMOKU_CD = "600000-0T" + newHINMOKU_CD;
            var formattedIVH_OYA_HINMOKU_CD = "600000-0T" + newIVH_OYA_HINMOKU_CD;

            // 最終代入
            map['SIYOSYO_NO'] = newSIYOSYO_NO;
            map['IVH_FLG'] = "0";
            map['KOKIBANSU'] = null;
            map['SOUSU'] = null;
            map['IVH_NAISO_FLG'] = "1";
            map['IVH_OYA_SIYO_SEQ'] = SIYOSYO_SEQ;
            map['IVH_OYA_SIYO_NO'] = newIVH_OYA_SIYO_NO;
            map['IVH_OYA_HINMOKU_CD'] = formattedIVH_OYA_HINMOKU_CD;
            map['HINMOKU_CD'] = formattedHINMOKU_CD;
            map['HYOMEN_SYORI_CD'] = "12";
            map['SEIHIN_CD'] = convertProductCd(OLD_SEIHIN_CD);
            map['HIN_NM'] = "D " + map['HIN_NM'] + " L";

            if (lastFlg) {
                // 元データのIVH_FLGを1に更新（親側）
                var ivhWhereMap = {
                    IVH_FLG: "1",
                    SIYOSYO_SEQ: SIYOSYO_SEQ
                };

                if (IVH_NAISO_FLG == "1") {
                    ivhWhereMap["SIYOSYO_NO"] = newIVH_OYA_SIYO_NO;
                    ivhWhereMap["HINMOKU_CD"] = formattedIVH_OYA_HINMOKU_CD

                    var updMap3 = {
                        IVH_OYA_SIYO_SEQ: SIYOSYO_SEQ,
                        IVH_OYA_SIYO_NO: newIVH_OYA_SIYO_NO,
                        IVH_OYA_HINMOKU_CD: formattedIVH_OYA_HINMOKU_CD,

                    }
                    updateByMapEx(conn, tableName, updMap3, ["IVH_OYA_SIYO_SEQ"], true);
                }

                updateByMapEx(conn, tableName, ivhWhereMap, ["SIYOSYO_SEQ"], true);

            }
        }

        insertByMapEx(conn, tableName, map, true);

        var map2 = selectOne(conn, tableName, null, whereMap, null);
        var IVH_FLG = "0"
        var IVH_BUTTON = TALON.getButtonName(); // 
        if (map2 && lastFlg && IVH_BUTTON != "IVH子基盤生成") {

            var HYOMEN_SYORI_CD = map2["HYOMEN_SYORI_CD"]
            if (HYOMEN_SYORI_CD != "12") IVH_FLG = "1"
        }

        if (tableName === "SIYOSYO_MAIN_WORK") setInitKoutei(NEW_SIYOSYO_SEQ, map['SOUSU'], map['HYOMEN_SYORI_CD'], [], IVH_FLG);
        if (tableName === "SIYOSYO_MAIN_WORK") TALON.addMsg("新規作成仕様書No :" + map['SIYOSYO_NO'] + " です。検索画面よりご確認ください。");
        // ===== 工程順管理テーブル（複数行＋KOUTEI_SEQ再発番）=====
    } else if (tableName === "KOUTEIJUN_KANRI_WORK") {


        if (IVH_COPY_FLG === "1") {
            // IVHは前段で処理を実施済み

        } else {

            var mapList = selectList(conn, tableName, null, whereMap, null);

            for (var i = 0; i < mapList.length; i++) {
                var map = mapList[i];
                var oldKouteiSeq = map['KOUTEI_SEQ'];
                var newKouteiSeq = TALON.getNumberingData('TID', 1)[0];

                map['SIYOSYO_SEQ'] = NEW_SIYOSYO_SEQ;
                map['KOUTEI_SEQ'] = newKouteiSeq;

                insertByMapEx(conn, tableName, map, true);

                // 関連テーブルを定義（工程単位で複製が必要）
                var relatedTables = [
                    "KOUTEI_MEISAI_KOUMOKU_WORK",
                    "KOUTEI_MEISAI_SIYOSYO_WORK",
                    "SIYO_SEIZO_JKN_HEADER",
                    "SIYO_SEIZO_JKN_MEISAI",
                    "SIYO_SEIZO_JKN_MEISAI2",
                    "SIYO_SEIZO_JKN_MEISAI3"
                ];

                for (var j = 0; j < relatedTables.length; j++) {
                    var targetTable = relatedTables[j];

                    var relWhereMap = {
                        SIYOSYO_SEQ: SIYOSYO_SEQ,
                        KOUTEI_SEQ: oldKouteiSeq
                    };

                    if (targetTable === "KOUTEI_MEISAI_KOUMOKU_WORK" ||
                        targetTable === "SIYO_SEIZO_JKN_MEISAI" ||
                        targetTable === "SIYO_SEIZO_JKN_MEISAI2" ||
                        targetTable === "SIYO_SEIZO_JKN_MEISAI3") {

                        // 複数行の関連レコードを複製
                        var detailList = selectList(conn, targetTable, null, relWhereMap, null);
                        for (var k = 0; k < detailList.length; k++) {
                            var detailMap = detailList[k];
                            detailMap['SIYOSYO_SEQ'] = NEW_SIYOSYO_SEQ;
                            detailMap['KOUTEI_SEQ'] = newKouteiSeq;

                            insertByMapEx(conn, targetTable, detailMap, true);
                        }

                    } else {
                        // 単一行（1対1）の関連データを複製
                        var oneMap = selectOne(conn, targetTable, null, relWhereMap, null);
                        if (!oneMap) continue;

                        oneMap['SIYOSYO_SEQ'] = NEW_SIYOSYO_SEQ;
                        oneMap['KOUTEI_SEQ'] = newKouteiSeq;

                        insertByMapEx(conn, targetTable, oneMap, true);
                    }
                }
            }
        }

        // ===== 層構成管理テーブル（複数行＋SOUKOUSEI_SEQ再発番）=====
    } else if (tableName === "SOUKOUSEI_KANRI_WORK") {
        var mapList = selectList(conn, tableName, null, whereMap, null);

        for (var i = 0; i < mapList.length; i++) {
            var map = mapList[i];

            map['SIYOSYO_SEQ'] = NEW_SIYOSYO_SEQ;
            map['SOUKOUSEI_SEQ'] = TALON.getNumberingData('TID', 1)[0];

            insertByMapEx(conn, tableName, map, true);
        }

        var whereMap2 = {
            IVH_OYA_SIYO_SEQ: SIYOSYO_SEQ
        };
        var ivhKoMapList = selectList(conn, "SIYOSYO_MAIN_WORK", null, whereMap2, null);

        for (var j = 0; j < ivhKoMapList.length; j++) {

            var ivhKoMap = ivhKoMapList[j];
            var insMap = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                SOUKOUSEI_SEQ: TALON.getNumberingData('TID', 1)[0],
                SOUKOUSEI_JUN: getCount(conn, "SOUKOUSEI_KANRI_WORK", whereMap) + 1,
                IVH_SIYOSYO_SEQ: ivhKoMap["SIYOSYO_SEQ"],
                IVH_SIYOSYO_NO: ivhKoMap["SIYOSYO_NO"],
                IVH_HINMOKU_CD: ivhKoMap["HINMOKU_CD"]
            }
            insertByMapEx(conn, tableName, insMap, true);
        }
    }
}

/**
 * 製品CDの先頭2桁を "00" に置き換える
 * 例：1BW-0000ATV00 → 00W-0000ATV00
 * 
 * @param {string} parentCd - 親の製品CD
 * @returns {string} 変換後の子の製品CD
 */
function convertProductCd(parentCd) {
    if (!parentCd || parentCd.length < 2) {
        return parentCd; // 無効な入力はそのまま返す
    }

    return '00' + parentCd.substring(2);
}


/**
 * 1.TARON DBからデータ取得
 * 2.RITA DBのデータを削除
 * 3.RITA DBに挿入
 * 
 * @param tableName 連携対象テーブル名
 * @param TALON_SIYOSYO_SEQ TALON側の仕様書番号SEQ
 * @param RITA_SIYOSYO_SEQ RITA側の仕様書番号SEQ
 * @param CHILD_SEQ_COLUMN テーブルの第２キー
 * @param SEQ_SYU 採番種別
 */
function _renkeiSiyosyo(tableName, TALON_SIYOSYO_SEQ, RITA_SIYOSYO_SEQ, CHILD_SEQ_COLUMN, SEQ_SYU) {

    // TARONの_WORKテーブルからデータを取得する。
    var selSql = " SELECT * FROM " + tableName + "_WORK WHERE SIYOSYO_SEQ = " + TALON_SIYOSYO_SEQ;
    var talonMapList = TalonDbUtil.select(TALON.getDbConfig(), selSql);
    if (!talonMapList) {
        return; // 対象データなし
    }

    // 通番を取得する
    var childSeqList = [];
    if (CHILD_SEQ_COLUMN) {
        // 通番を取得
        childSeqList = getSiyoNum(SEQ_SYU, talonMapList.length);
    }

    // 登録・更新情報を上書きする。
    var userData = TALON.getUserInfoMap();
    var user_id = userData['USER_ID'];
    var sysdate = new java.util.Date();
    for (var i = 0; i < talonMapList.length; i++) {
        var talonMap = talonMapList[i];
        // 登録情報
        talonMap['TOUROKU_ID'] = user_id;   // 登録ID
        talonMap['TOUROKU_DT'] = sysdate;   // 登録日時
        talonMap['KOUSIN_ID'] = user_id;   // 更新ID
        talonMap['KOUSIN_DT'] = sysdate;   // 更新日時
        talonMap['SOUKOUSEI_NO'] = talonMap['SOUKOUSEI_NO'] ? talonMap['SOUKOUSEI_NO'] : "";   // 更新日時

        // RITA側の仕様書番号に置き換える
        talonMap['SIYOSYO_SEQ'] = RITA_SIYOSYO_SEQ;

        // 通番上書きの指定がある場合通番を上書き
        if (CHILD_SEQ_COLUMN) {

            if (CHILD_SEQ_COLUMN == "KOUTEI_SEQ") {

                // 他情報との関連が崩れているため、ここで明示的に更新を加えて情報を揃える
                var tables = [
                    "KOUTEIJUN_KANRI_WORK",
                    "KOUTEI_MEISAI_KOUMOKU_WORK",
                    "KOUTEI_MEISAI_SIYOSYO_WORK",
                    "SIYO_SEIZO_JKN_HEADER",
                    "SIYO_SEIZO_JKN_MEISAI",
                    "SIYO_SEIZO_JKN_MEISAI2",
                    "SIYO_SEIZO_JKN_MEISAI3"
                ];

                var conn = TALON.getDbConfig();
                var oldSeq = talonMap[CHILD_SEQ_COLUMN];
                var newSeq = childSeqList[i];

                for (var j = 0; j < tables.length; j++) {
                    var sql = "UPDATE " + tables[j] + " SET KOUTEI_SEQ = " + newSeq + " WHERE KOUTEI_SEQ = " + oldSeq;
                    TalonDbUtil.update(conn, sql);
                }
            }
            talonMap[CHILD_SEQ_COLUMN] = childSeqList[i];   // 登録ID
        }
    }

    // RITAのテーブルカラムリストを取得する。
    var ritaColList = _getColList(TALON.getOtherDBConn("1"), tableName);

    // RITAのデータを事前に削除する。
    // RITAのテーブルに存在するカラムのみデータを挿入する。
    TalonDbUtil.insertByArray(TALON.getOtherDBConn("1"), tableName, talonMapList, ritaColList);
    TALON.getLogger().writeInfo('[_renkeiSiyosyo]' + tableName);
    TALON.getLogger().writeInfo('[_renkeiSiyosyo]' + talonMapList);
    TALON.getLogger().writeInfo('[_renkeiSiyosyo]' + ritaColList);

}

/**
 * 指定されたSIYOSYO_SEQ、KOUTEI_SEQ、GYOUSUに基づいてKOUTEI_MEISAI_KOUMOKU_WORKテーブルを削除し、新しいデータを挿入する関数です。
 * 
 * @param {number} SIYOSYO_SEQ - 挿入するSIYOSYO_SEQ。
 * @param {number} KOUTEI_SEQ - 挿入するKOUTEI_SEQ。
 * @param {string} GYOUSU - 挿入するGYOUSU。
 * @param {string} DATA01 - 挿入するDATA01。
 * @param {string} DATA02 - 挿入するDATA02。
 * @param {string} DATA03 - 挿入するDATA03。
 * @param {string} DATA04 - 挿入するDATA04。
 * @param {string} DATA05 - 挿入するDATA05。
 * @param {string} TOKUSYU_JOKEN - 挿入するTOKUSYU_JOKEN。
 */
function insKouteiMeisaiGyosu(SIYOSYO_SEQ, KOUTEI_SEQ, GYOUSU, DATA01, DATA02, DATA03, DATA04, DATA05, TOKUSYU_JOKEN) {

    // 既存のデータを削除
    delKOUTEI_MEISAI_KOUMOKU(SIYOSYO_SEQ, KOUTEI_SEQ, GYOUSU);

    // 新しいデータを挿入するためのマップの準備
    var map = {};
    map['SIYOSYO_SEQ'] = SIYOSYO_SEQ;
    map['KOUTEI_SEQ'] = KOUTEI_SEQ;
    map['GYOUSU'] = GYOUSU;
    map['DATA01'] = DATA01;
    map['DATA02'] = DATA02;
    map['DATA03'] = DATA03;
    map['DATA04'] = DATA04;
    map['DATA05'] = DATA05;
    map['TOKUSYU_JOKEN'] = TOKUSYU_JOKEN;

    // 新しいデータを挿入
    insKOUTEI_MEISAI_KOUMOKU(map);
}

/**
 * KOUTEI_MEISAI_KOUMOKUデータを挿入する関数です。
 * 
 * @param {Object} map - 挿入するデータが格納されたマップ。
 * mapは、キーとしてカラム名、値として挿入するデータを保持します。
 */
function insKOUTEI_MEISAI_KOUMOKU(map) {

    // ユーザー情報の取得
    var userData = TALON.getUserInfoMap();
    var user_id = userData['USER_ID'];
    var sysdate = new java.util.Date();

    // マップに登録する値をセット
    map['TOUROKU_ID'] = user_id;
    map['TOUROKU_DT'] = sysdate;
    map['KOUSIN_ID'] = user_id;
    map['KOUSIN_DT'] = sysdate;

    insertByMapEx(TALON.getDbConfig(), "KOUTEI_MEISAI_KOUMOKU_WORK", map, true);
}

/**
 * KOUTEI_MEISAI_KOUMOKU_WORKテーブルから指定したSIYOSYO_SEQおよびKOUTEI_SEQ、GYOUSUのレコードを削除する関数です。
 * 
 * @param {number} SIYOSYO_SEQ - 削除対象のSIYOSYO_SEQ。
 * @param {number} KOUTEI_SEQ - 削除対象のKOUTEI_SEQ。
 * @param {string} GYOUSU - 削除対象のGYOUSU。
 */
function delKOUTEI_MEISAI_KOUMOKU(SIYOSYO_SEQ, KOUTEI_SEQ, GYOUSU) {

    // SQLクエリの作成（文字列としてパラメータを直接連携）
    var sql = "DELETE FROM KOUTEI_MEISAI_KOUMOKU_WORK WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEI_SEQ = " + KOUTEI_SEQ + " AND GYOUSU = " + GYOUSU;

    // SQLクエリの実行
    TalonDbUtil.delete(TALON.getDbConfig(), sql);
}

/**
 * KOUTEI_MEISAI_KOUMOKU_WORKテーブルから指定したSIYOSYO_SEQおよびKOUTEI_SEQ、GYOUSUのレコードを削除する関数です。
 * 
 * @param {number} SIYOSYO_SEQ - 削除対象のSIYOSYO_SEQ。
 * @param {number} KOUTEI_SEQ - 削除対象のKOUTEI_SEQ。
 * @param {string} GYOUSU - 削除対象のGYOUSU。
 */
function delKOUTEI_MEISAI_KOUMOKU2(SIYOSYO_SEQ, KOUTEI_SEQ) {

    // SQLクエリの作成（文字列としてパラメータを直接連携）
    var sql = "DELETE FROM KOUTEI_MEISAI_KOUMOKU_WORK WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEI_SEQ = " + KOUTEI_SEQ;

    // SQLクエリの実行
    TalonDbUtil.delete(TALON.getDbConfig(), sql);
}

/**
 * 指定された機能ID（FUNC_ID）および行番号（GYOUSU）に対応する工程構成情報を取得します。
 *
 * SIYOM007 テーブルから、対象の GYOUSU 行の以下項目を取得します：
 * - TOP_NM（前工程名）
 * - AFTER_NM（後工程名）
 * - SIKIBETU_CODE（識別コード）
 *
 * @param {string} funcId - 対象の機能ID（FUNC_ID）
 * @param {number} GYOUSU - 対象行番号
 * @returns {Array<Object>} - 検索結果（FUNC_ID, GYOUSU, TOP_NM, AFTER_NM, SIKIBETU_CODE を含む）
 */
function _getKouteiNameList(funcId, GYOUSU) {
    var sql = ""
        + "SELECT "
        + "  FUNC_ID, "
        + "  GYOUSU, "
        + "  ISNULL(TOP_NM, '') AS TOP_NM, "
        + "  ISNULL(AFTER_NM, '') AS AFTER_NM, "
        + "  SIKIBETU_CODE, "
        + "  SEQ "
        + "FROM "
        + "  SIYOM007 "
        + "WHERE "
        + "  FUNC_ID = '" + funcId + "' "
        + "  AND GYOUSU = " + GYOUSU + " "
        + "ORDER BY "
        + "  GYOUSU, SEQ;";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

/**
 * 工程パラメータ（TOP/AFTER/識別コード）とDATA値を元に、変換後の文字列を生成します。
 *
 * @param {Object} paramMap - 工程パラメータ情報（TOP_NM, AFTER_NM, SIKIBETU_CODEを含む）
 * @param {string} DATA - 対象のデータ文字列
 * @returns {string} - 変換後の出力文字列（TOP + 値 + AFTER）
 */
function _createValue(paramMap, DATA) {
    if (!DATA) return "";

    var TOP_NM = paramMap['TOP_NM'];
    var AFTER_NM = paramMap['AFTER_NM'];
    var SIKIBETU_CODE = paramMap['SIKIBETU_CODE'];

    if (SIKIBETU_CODE) {
        return TOP_NM + _getHanyoMst(SIKIBETU_CODE, DATA) + AFTER_NM;
    } else {
        return TOP_NM + DATA + AFTER_NM;
    }
}

/**
 * 工程明細項目ワークテーブルの内容を仕様書明細ワーク形式に変換し、
 * 該当する TEXT01～TEXT20 フィールドに値をマッピングします。
 *
 * @param {string} SIYOSYO_SEQ - 対象仕様書番号
 * @param {string} KOUTEI_SEQ - 対象工程番号
 */
function _convertKomokuToSiyosyoCommon(SIYOSYO_SEQ, KOUTEI_SEQ) {

    try {

        var dbConfig = TALON.getDbConfig();

        // KOUTEI_MEISAI_SIYOSYO_WORKを初期作成
        _setKouteiSiyosyoInit(dbConfig, SIYOSYO_SEQ, KOUTEI_SEQ);

        // KOUTEI_MEISAI_KOUMOKU_WORK取得(GYOUSUでソート)
        var dataList = _getKouteiMeisaiKoumokuWork(SIYOSYO_SEQ, KOUTEI_SEQ);
        if (!dataList || dataList.length == 0) {
            return;
        }

        var updMap = new Array();

        // FUNC_IDの算出を行う
        var whereMap = {
            "SIYOSYO_SEQ": SIYOSYO_SEQ,
            "KOUTEI_SEQ": KOUTEI_SEQ
        };
        var kkw = selectOne(TALON.getDbConfig(), "KOUTEIJUN_KANRI_WORK", null, whereMap);

        var funcId = "SIYO3R" + kkw['KOUTEI_CD_M'];
        if (kkw['KOUTEI_CD_M'] == "150" || kkw['KOUTEI_CD_M'] == "140") {

            funcId = "SIYO3R" + kkw['KOUTEI_CD'];

        } else if (kkw['KOUTEI_CD_M'] == "290" || kkw['KOUTEI_CD_M'] == "295") {
            funcId = "SIYO3R" + "290";
        }

        // コメント行とそれ以外に分ける
        var maxValueGYOUSU = 0;
        var valueList = [];
        var bikoList = [];
        for (i = 0; i < dataList.length; i++) {
            var GYOUSU = dataList[i]['GYOUSU'];
            if (GYOUSU < 20) {
                valueList.push(dataList[i]);
                maxValueGYOUSU = GYOUSU;
            } else {
                // 行数が20以上は備考とする
                if (maxValueGYOUSU + bikoList.length == 20) {
                    // ただしTEXT20個分使い切ったら終了
                    break;
                }
                bikoList.push(dataList[i]);
            }
        }

        // SIYOM007を元にTEXT01~TEXT19を編集する
        for (var i = 0; i < valueList.length; i++) {
            var dataMap = valueList[i];
            var GYOUSU = dataMap['GYOUSU'];

            // SIYOM007を元にDATA01～19を作成する  
            var TOKUSYU_JOKEN = dataMap['TOKUSYU_JOKEN'];
            var paramMapList = _getKouteiNameList(funcId, GYOUSU);
            var zi = java.lang.String.format("%02d", new java.lang.Integer(GYOUSU));

            if (paramMapList.length > 0) {
                var result = "";
                for (var j = 0; j < paramMapList.length; j++) {
                    var paramMap = paramMapList[j];
                    var SEQ = paramMap['SEQ'];
                    var DATA = dataMap['DATA' + java.lang.String.format("%02d", new java.lang.Integer(SEQ))];
                    result += _createValue(paramMap, DATA);
                }

                updMap["TEXT" + zi] = result ? result + " " + TOKUSYU_JOKEN : TOKUSYU_JOKEN;

            }
        }

        // 上記までで使わなかった領域に備考を詰め込む
        var no = 20;
        for (var i = bikoList.length; i > 0; i--) {
            var zi = java.lang.String.format("%02d", java.lang.Integer.valueOf(no));
            if (funcId == "SIYO3R910") {
                updMap["TEXT" + zi] = bikoList[i - 1]['DATA01'];
            } else {
                if (bikoList[i - 1]['DATA01']) {
                    //updMap["TEXT" + zi] = "備考：" + bikoList[i - 1]['DATA01'];
                    updMap["TEXT" + zi] = bikoList[i - 1]['DATA01'];
                }
            }
            no--;
        }

        // 結合した文字列が50Byte超えていないかチェックする
        var maxText = 20;
        for (var i = 1; i <= 20; i++) {
            var zi = java.lang.String.format("%02d", java.lang.Integer.valueOf(i));
            checkByteLength(updMap["TEXT" + zi], 50);
        }

        // KOUTEI_MEISAI_SIYOSYO_WORKを更新
        updMap['SIYOSYO_SEQ'] = SIYOSYO_SEQ;
        updMap['KOUTEI_SEQ'] = KOUTEI_SEQ;

        var whereList = [];
        whereList.push([null, '=', 'SIYOSYO_SEQ']);
        whereList.push([null, '=', 'KOUTEI_SEQ']);

        TalonDbUtil.updateByMap(
            dbConfig,
            'KOUTEI_MEISAI_SIYOSYO_WORK',
            updMap,
            _getColList(dbConfig, "KOUTEI_MEISAI_SIYOSYO_WORK"),
            whereList
        );

    } catch (e) {
        TALON.addErrorMsg(e.message);
        TALON.setIsSuccess(false);
    }
}

/**
 * 工程明細項目ワークテーブル（KOUTEI_MEISAI_KOUMOKU_WORK）から、
 * 指定された仕様書SEQおよび工程SEQに対応するレコードを取得する。
 *
 * @param {string|number} SIYOSYO_SEQ - 対象の仕様書SEQ
 * @param {string|number} KOUTEI_SEQ - 対象の工程SEQ
 * @returns {Array<Object>} 工程明細項目ワークテーブルの該当レコード一覧
 */
function _getKouteiMeisaiKoumokuWork(SIYOSYO_SEQ, KOUTEI_SEQ) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,
        KOUTEI_SEQ: KOUTEI_SEQ
    };

    return selectList(conn, "KOUTEI_MEISAI_KOUMOKU_WORK", null, whereMap, "GYOUSU");
}

function transferKoutei(SIYOSYO_SEQ, KOUTEI_SEQ) {

    // 工程明細仕様書WORKの作成
    _convertKomokuToSiyosyoCommon(SIYOSYO_SEQ, KOUTEI_SEQ);
}

function _setKouteiSiyosyoInit(dbConfig, SIYOSYO_SEQ, KOUTEI_SEQ) {

    // 対象のワークテーブルを初期化
    TalonDbUtil.delete(dbConfig,
        "DELETE FROM KOUTEI_MEISAI_SIYOSYO_WORK WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ + "' AND KOUTEI_SEQ = '" + KOUTEI_SEQ + "'"
    );

    // ログインユーザー取得
    var USER_ID = TALON.getUserInfoMap()['USER_ID'];

    // 初期行の登録（ヘッダ行）
    TalonDbUtil.insert(dbConfig,
        "INSERT INTO KOUTEI_MEISAI_SIYOSYO_WORK (" +
        "SIYOSYO_SEQ, KOUTEI_SEQ, TOUROKU_ID, TOUROKU_DT, KOUSIN_ID, KOUSIN_DT" +
        ") VALUES (" +
        "'" + SIYOSYO_SEQ + "', '" + KOUTEI_SEQ + "', '" + USER_ID + "', SYSDATETIME(), '" + USER_ID + "', SYSDATETIME()" +
        ")"
    );

}

/**
 * 指定ブロックのデータリストを元に、insKouteiMeisaiGyosuを呼び出す
 * 
 * @param {string} SIYOSYO_SEQ 
 * @param {string} KOUTEI_SEQ 
 * @param {number} blockNo - 対象ブロック番号
 * @param {number} startIndex - 登録開始順番
 * @param {boolean} isBikoOnly - 備考専用（DATA01のみ）かどうか
 */
function _insertFromBlockList(SIYOSYO_SEQ, KOUTEI_SEQ, blockNo, startIndex, isBikoOnly) {
    var list = TALON.getBlockData_List(blockNo);

    if (!list) {

        return;
    }

    for (var i = 0; i < list.length; i++) {
        var idx = startIndex + i;
        var row = list[i];

        if (isBikoOnly) {
            insKouteiMeisaiGyosu(SIYOSYO_SEQ, KOUTEI_SEQ, idx, row['DATA01'], null, null, null, null, null);
        } else {
            insKouteiMeisaiGyosu(SIYOSYO_SEQ, KOUTEI_SEQ, idx, row['DATA01'], row['DATA02'], null, null, null, row['TOKUSYU_JOKEN']);
        }
    }
}

/**
 * 見積オブジェクト取得
 * @param {*} HINMOKU_CD 
 */
function getMitumoriObj(HINMOKU_CD) {
    return JSON.parse(selectSIYO1001(HINMOKU_CD, 'MITSUMORI_MEISAI'))['record'];
}

function getHacchuObj(HINMOKU_CD) {
    return JSON.parse(selectSIYO1001(HINMOKU_CD, 'HACCHU'))['record']
}

function getJustKomokuCode(record, fieldName) {
    var arr = record[fieldName];
    return (arr && arr.length > 0) ? arr[0] : null;
}

function getJustKomokuLabel(record, fieldName) {
    var arr = record[fieldName];
    return (arr && arr.length > 1) ? arr[1] : null;
}

