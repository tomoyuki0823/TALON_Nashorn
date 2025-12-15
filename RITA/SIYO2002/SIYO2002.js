try {
    // 仕様書条件ヘッダーの更新
    TalonDbUtil.begin(TALON.getDbConfig());
    clearKoutei();
    // 特殊工程
    convertTokusyuMstTo3R();
    convertTokusyuMstTo3RTokusyu();
    convertTokusyuMstTo3RBiko();

    set3rInitInfo()

    // 一般工程
    convertKouteiTokusyuInfo();
    convertTokusyuMstTo3RBikoAdd();
    convertTokusyuMstTo3R()
    setKyotuBiko()
    setBiko()
    TalonDbUtil.commit(TALON.getDbConfig());
    // 工程明細仕様書の更新
    setKouteiJunKanriWork();
} catch (e) {
    TALON.addErrorMsg(e.message);
    TALON.setIsSuccess(false);
}
TALON.addMsg("変換処理が完了しました。")



function convertTokusyuMstTo3RBikoAdd() {
    var conn = TALON.getDbConfig();
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];
    var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
    var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);
    var mapList = selectList(conn, "KOUTEIJUN_KANRI_WORK", null, { SIYOSYO_SEQ: SIYOSYO_SEQ }, null);

    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        var KOUTEI_SEQ = map['KOUTEI_SEQ'];
        var KOUTEI_CD_M = map['KOUTEI_CD_M'];
        var KOUTEI_CD = map['KOUTEI_CD'];

        if (KOUTEI_CD_M) {
            var whereMap = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                KOUTEI_SEQ: KOUTEI_SEQ
            };

            var talonMap = selectOne(conn, "SIYO_SEIZO_JKN_HEADER", null, whereMap, null);
            if (!talonMap) continue;
            var talonMap2 = selectOne(conn, "SIYO_SEIZO_JKN_MEISAI", null, whereMap, "GYOSU DESC");
            var currentGYOSU = talonMap2 ? talonMap2['GYOSU'] : 0;

            var funcId = "SIYO3R" + KOUTEI_CD_M;
            if (KOUTEI_CD_M === "150" || KOUTEI_CD_M === "140") {
                funcId = "SIYO3R" + KOUTEI_CD;
            } else if (KOUTEI_CD_M === "290" || KOUTEI_CD_M === "295") {
                funcId = "SIYO3R290";
            }

            for (var j = 0; j <= 10; j++) {
                var colName = "TOKUSYU_JOKEN" + ("0" + j).slice(-2);
                var value = talonMap[colName];

                if (value) {
                    var sql = "SELECT COUNT(*) CNT FROM TLN_M_GENERAL_ITEM WHERE FUNC_ID = '" + funcId + "' AND COL_NAME = '" + colName + "' AND FUNC_SEQ = 0";
                    var CNT = TalonDbUtil.select(conn, sql)[0]['CNT'];

                    if (CNT == 0) {
                        currentGYOSU++;

                        var bikoMap = {
                            SIYOSYO_SEQ: SIYOSYO_SEQ,
                            KOUTEI_SEQ: KOUTEI_SEQ,
                            GYOSU: currentGYOSU,
                            DATA01: value
                        };

                        insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, false); // ← INSERTのみなら false
                    }
                }
            }
        }
    }
}


function convertKouteiTokusyuInfo() {
    var conn = TALON.getDbConfig();

    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];

    var sql = ""
        + " SELECT DISTINCT KOUTEI_CD FROM SIYO20011 WHERE SIYOSYO_NO ='" + SIYOSYO_NO + "'"

    var listDisp = TalonDbUtil.select(conn, sql);

    for (var i = 0; i < listDisp.length; i++) {

        var map = listDisp[i];
        var KOUTEI_CD = map['KOUTEI_CD'];
        if (KOUTEI_CD == "910") KOUTEI_CD = "009";
        var kouteiList = getSiyo2011(SIYOSYO_NO, KOUTEI_CD);
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
        var map2 = getKouteiSeq(SIYOSYO_SEQ, KOUTEI_CD);

        if (!map2) {

            var KOUTEI_SEQ = getKouteiSeq2(SIYOSYO_SEQ, KOUTEI_CD);
        } else {

            var KOUTEI_SEQ = map2['KOUTEI_SEQ']
        }
        var jokenList = [];

        for (var j = 0; j < kouteiList.length; j++) {
            var kouteiMap = kouteiList[j];
            var TOKUSYU = kouteiMap['TOKUSYU'];

            jokenList.push(TOKUSYU);
        }

        setTokusyuJoken(jokenList, SIYOSYO_SEQ, KOUTEI_SEQ);
    }
}

/**
 * 工程進捗対象列名取得
 *
 * @returns {Array<Object>} DSP1, DSP2, DSP3を含む行のリスト
 */
function getSiyo2011(SIYOSYO_NO, KOUTEI_CD) {

    var whereMap = { SIYOSYO_NO: SIYOSYO_NO, KOUTEI_CD: KOUTEI_CD };

    return selectList(TALON.getDbConfig(), 'SIYO20011', null, whereMap, null) || [];
}

function getSiyosyoSeq(SIYOSYO_NO) {

    var whereMap = { SIYOSYO_NO: SIYOSYO_NO };

    return selectOne(TALON.getDbConfig(), 'SIYOSYO_MAIN_WORK', null, whereMap, null)['SIYOSYO_SEQ'] || null;
}

function getKouteiSeq(SIYOSYO_SEQ, KOUTEI_CD) {

    if (KOUTEI_CD == "910") KOUTEI_CD = "009";
    var whereMap = { SIYOSYO_SEQ: SIYOSYO_SEQ, KOUTEI_CD: KOUTEI_CD };

    return selectOne(TALON.getDbConfig(), 'KOUTEIJUN_KANRI_WORK', null, whereMap, null) || null;
}

function getKouteMeisaiMst(KOUTEI_CD) {

    var whereMap = { KOUTEI_CD: KOUTEI_CD };

    return selectOne(TALON.getDbConfig(), 'KOUTEI_MEISAI_MST', null, whereMap, null) || null;
}

function getKouteijunCount(SIYOSYO_SEQ) {
    var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), 'SELECT COUNT(*) as CNT FROM KOUTEIJUN_KANRI_WORK WHERE SIYOSYO_SEQ = \'' + SIYOSYO_SEQ + '\'');
    return itemSelectList[0]['CNT'];
}

function setKouteiJunKanriWork() {
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_SEQ = getSiyosyoSeq(lineDataMap['SIYOSYO_NO']);
    var kouteiKanriWorkList = getKouteiKanriWork(SIYOSYO_SEQ);

    if (!kouteiKanriWorkList || kouteiKanriWorkList.length === 0) {
        return;
    }

    for (var i = 0; i < kouteiKanriWorkList.length; i++) {
        var KOUTEI_CD_M = kouteiKanriWorkList[i]['KOUTEI_CD_M'];
        var KOUTEI_SEQ = kouteiKanriWorkList[i]['KOUTEI_SEQ'];

        // 特殊コード変換（例：295 → 290）
        var actualKouteiCd = KOUTEI_CD_M;

        switch (KOUTEI_CD_M) {
            case "295":
                actualKouteiCd = "290";
                break;
            case "910":
                actualKouteiCd = "009";
                break;

            default:
                break;
        }

        if (!actualKouteiCd) continue
        // 51画面の処理を呼び出す
        executeSiyo3R("SIYO3R" + actualKouteiCd, SIYOSYO_SEQ, KOUTEI_SEQ);
    }
}


function getKouteiKanriWork(SIYOSYO_SEQ) {
    var whereMap = { SIYOSYO_SEQ: SIYOSYO_SEQ };
    return selectList(TALON.getDbConfig(), 'KOUTEIJUN_KANRI_WORK', null, whereMap, null);
}

function executeSiyo3R(func_id, SIYOSYO_SEQ, KOUTEI_SEQ) {
    paramTbl =
        ['-funcname', func_id
            , '-condition', 'SIYOSYO_SEQ', '=', SIYOSYO_SEQ
            , '-condition', 'KOUTEI_SEQ', '=', KOUTEI_SEQ
            , '-execute'
        ];
    TALON.getLogger().writeInfo("呼出 SIYO3R" + paramTbl);

    if (!TALON.callBATController(paramTbl)) {
        throw new Error("処理でエラーが発生しました" + paramTbl);
    }
}


function getKouteiSeq2(SIYOSYO_SEQ, KOUTEI_CD) {
    if (KOUTEI_CD == "910") KOUTEI_CD = "009";
    var KOUTEI_SEQ = TALON.getNumberingData('TID', 1)[0];
    var kouteiMeisaiMst = getKouteMeisaiMst(KOUTEI_CD);
    TALON.getLogger().writeInfo('[SIYO2002 TEST]' + kouteiMeisaiMst);

    if (!kouteiMeisaiMst) {
        TALON.addErrorMsg("工程明細マスタが取得できません: " + KOUTEI_CD);
        return null;
    }

    var KOUTEI_CD_M = kouteiMeisaiMst['GAMEN_REI_KOUTEI_CD'];
    var KOUTEI_NM = kouteiMeisaiMst['KOUTEI_NM'];
    var KOUTEI_JUN = getKouteijunCount(SIYOSYO_SEQ) + 1;
    var USER_ID = TALON.getUserInfoMap()['USER_ID'];

    // 日付フォーマット（Java形式）
    var sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); // ← 12時間制→24時間制(HHに修正)
    var strDate = sdf.format(new java.util.Date());

    var insMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,
        KOUTEI_SEQ: KOUTEI_SEQ,
        KOUTEI_CD_M: KOUTEI_CD_M,
        KOUTEI_NM: KOUTEI_NM,
        KOUTEI_CD: KOUTEI_CD,
        KOUTEI_JUN: KOUTEI_JUN,
        TOUROKU_ID: USER_ID,
        TOUROKU_DT: strDate,
        KOUSIN_ID: USER_ID,
        KOUSIN_DT: strDate
    };

    var conn = TALON.getDbConfig();
    insertByMapEx(conn, "KOUTEIJUN_KANRI_WORK", insMap, true);

    return KOUTEI_SEQ;
}


function convertTokusyuMstTo3R() {

    var conn = TALON.getDbConfig();
    var mapList = getTokusyuKoteiInit();

    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        var SIYOSYO_NO = map['SIYOSYO_NO'];
        var SIYOSYO_NO_R2 = SIYOSYO_NO.substring(2, SIYOSYO_NO.length);
        var KOUTEI_CD = map['KOUTEI_CD'];
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
        var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);

        var map2 = getKouteiSeq(SIYOSYO_SEQ, KOUTEI_CD);
        var KOUTEI_SEQ = map2 ? map2['KOUTEI_SEQ'] : getKouteiSeq2(SIYOSYO_SEQ, KOUTEI_CD);

        var tokusyuMapList = getTokusyuKotei2("01", KOUTEI_CD); // 外で一度だけ取得

        for (var j = 0; j < tokusyuMapList.length; j++) {
            var tokusyuMap = tokusyuMapList[j];
            var TARGET_ITEM_1 = tokusyuMap['TARGET_ITEM_1'];
            var TARGET_ITEM_2 = tokusyuMap['TARGET_ITEM_2'];
            var TARGET_ITEM_2 = tokusyuMap['TARGET_ITEM_2'];

            if (!TARGET_ITEM_2) continue;

            var TARGET_ITEM_TEXT = tokusyuMap['TARGET_ITEM_TEXT'];
            var TOKUSYU_TEXT = tokusyuMap['TOKUSYU_TEXT'];
            var TOKUSYU_FUYOPARAM = tokusyuMap['TOKUSYU_FUYOPARAM'];
            var TOKUSYU_JKN = tokusyuMap['TOKUSYU_JKN'];
            var TOKUSYU_JKN_DISP = convertTokusyuJkn(TOKUSYU_JKN);
            if (!TOKUSYU_JKN_DISP) {

                TOKUSYU_JKN_DISP = ""
            }
            if (!TARGET_ITEM_TEXT) TARGET_ITEM_TEXT = ""
            if (!TARGET_ITEM_2) {

                TARGET_ITEM_2 = ""
            }

            // ---------- ヘッダー処理 ----------
            var updMap = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                KOUTEI_SEQ: KOUTEI_SEQ
            };

            switch (TARGET_ITEM_2) {
                case '99':
                    updMap[TARGET_ITEM_1] = TARGET_ITEM_TEXT;
                    break;
                case '98':
                    updMap[TARGET_ITEM_1] = buildPrefixText(SIYOSYO_NO_R2, TARGET_ITEM_TEXT);
                    break;
                case '97':
                    updMap[TARGET_ITEM_1] = "DI:" + buildPrefixText(SIYOSYO_NO_R2, TARGET_ITEM_TEXT);
                    break;
                case '96':
                    updMap[TARGET_ITEM_1] = buildPrefixText(siyosyoMainMap['HIN_NM'], TARGET_ITEM_TEXT);
                    break;
                case '95':
                    updMap[TARGET_ITEM_1] = buildPrefixText(siyosyoMainMap['HINMOKU_CD'], TARGET_ITEM_TEXT);
                    break;
                default:
                    updMap[TARGET_ITEM_1] = TARGET_ITEM_2;
                    break;
            }

            var KEY = "TOKUSYU_JOKEN0" + j;

            if (TARGET_ITEM_2 && TOKUSYU_FUYOPARAM) {

                if (!TOKUSYU_TEXT) {

                    TOKUSYU_TEXT = ""
                }
                switch (TOKUSYU_FUYOPARAM) {

                    case '99':
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                        break;
                    case '98':
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                        break;
                    case '97':
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, "DI:" + SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                        break;
                    case '96':
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HIN_NM'] + ' ' + TOKUSYU_TEXT);
                        break;
                    case '95':
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HINMOKU_CD'] + ' ' + TOKUSYU_TEXT);
                        break;
                    default:
                        updMap[KEY] = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                        break;
                }
            } else if (TARGET_ITEM_2 && TOKUSYU_TEXT) {
                updMap[KEY] = TOKUSYU_TEXT;

            }

            var whereMap = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                KOUTEI_SEQ: KOUTEI_SEQ
            };

            if (getCount(conn, "SIYO_SEIZO_JKN_HEADER", whereMap) > 0) {
                updateByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", updMap, ['SIYOSYO_SEQ', 'KOUTEI_SEQ'], true);
            } else {
                insertByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", updMap, true);
            }
        }
    }
}

/**
 * 特殊条件マスタから3R特殊条件欄にデータを設定する。
 *
 * 各仕様書・工程ごとに、特殊条件マスタの定義をもとに
 * TOKUSYU_JOKEN00〜10 に順に表示文言を構築して埋め込む。
 */
function convertTokusyuMstTo3RTokusyu() {
    var conn = TALON.getDbConfig();
    var mapList = getTokusyuKoteiInit(); // 仕様書No, 工程CDを持つリストを取得

    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];

        var SIYOSYO_NO = map['SIYOSYO_NO'];
        var SIYOSYO_NO_R2 = SIYOSYO_NO.substring(2); // 先頭2桁を除いた文字列
        var KOUTEI_CD = map['KOUTEI_CD'];
        if (KOUTEI_CD == "910") KOUTEI_CD = "009";
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO); // 仕様書SEQ取得
        var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ); // 品目名などを取得

        var map2 = getKouteiSeq(SIYOSYO_SEQ, KOUTEI_CD); // 工程SEQの取得
        var KOUTEI_SEQ = map2 ? map2['KOUTEI_SEQ'] : getKouteiSeq2(SIYOSYO_SEQ, KOUTEI_CD);

        var tokusyuMapList = getTokusyuKotei2("01", KOUTEI_CD); // 特殊条件マスタ（定義済）

        var jokenList = [];

        for (var j = 0; j < tokusyuMapList.length; j++) {
            var tokusyuMap = tokusyuMapList[j];
            var TOKUSYU_TEXT = tokusyuMap['TOKUSYU_TEXT'];
            var TOKUSYU_FUYOPARAM = tokusyuMap['TOKUSYU_FUYOPARAM'];
            var TOKUSYU_JKN = tokusyuMap['TOKUSYU_JKN'];
            var TOKUSYU_JKN_DISP = convertTokusyuJkn(TOKUSYU_JKN);

            // 対象項目2が空、かつ付与パラメータあり（定義付きテンプレ型）
            if (!tokusyuMap['TARGET_ITEM_2'] && TOKUSYU_FUYOPARAM) {
                if (!TOKUSYU_TEXT) TOKUSYU_TEXT = "";

                switch (TOKUSYU_FUYOPARAM) {
                    case '99': // 通常
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT));
                        break;
                    case '98': // 仕様書番号
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT));
                        break;
                    case '97': // DI: + 番号
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, "DI:" + SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT));
                        break;
                    case '96': // 品目名
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HIN_NM'] + ' ' + TOKUSYU_TEXT));
                        break;
                    case '95': // 品目コード
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HINMOKU_CD'] + ' ' + TOKUSYU_TEXT));
                        break;
                    default:
                        jokenList.push(buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT));
                        break;
                }

            }
        }

        // 条件をJKN_HEADERにセット
        setTokusyuJoken(jokenList, SIYOSYO_SEQ, KOUTEI_SEQ);
    }
}

function setTokusyuJoken(jokenList, SIYOSYO_SEQ, KOUTEI_SEQ) {
    var conn = TALON.getDbConfig();

    // 条件を入れたい対象レコードを取得（例：1件のみ対象）
    var whereMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,  // ←対象の仕様書SEQに適宜置換
        KOUTEI_SEQ: KOUTEI_SEQ
    };
    var row = selectOne(conn, "SIYO_SEIZO_JKN_HEADER", null, whereMap, null);
    if (!row) {

        insertByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", whereMap, true);
    }

    var row = selectOne(conn, "SIYO_SEIZO_JKN_HEADER", null, whereMap, null);

    var insertCount = 0;

    for (var i = 0; i <= 10; i++) {
        var colName = "TOKUSYU_JOKEN" + ("0" + i).slice(-2);
        var value = row[colName];

        // 空欄（nullまたは空文字）だったら設定
        if (value == null || value === "") {
            if (insertCount >= jokenList.length) break;  // 値が尽きたら終了

            row[colName] = jokenList[insertCount];
            insertCount++;
        }
    }

    // 値を更新（where句は主キー指定）
    updateByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", row, ["SIYOSYO_SEQ", "KOUTEI_SEQ"]);
}


function convertTokusyuMstTo3RBiko() {

    var conn = TALON.getDbConfig();
    var mapList = getTokusyuKoteiInit();

    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        var SIYOSYO_NO = map['SIYOSYO_NO'];
        var SIYOSYO_NO_R2 = SIYOSYO_NO.substring(2, SIYOSYO_NO.length);
        var KOUTEI_CD = map['KOUTEI_CD'];
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
        var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);
        var tokusyuMapList = getTokusyuKotei3("01", KOUTEI_CD); // 外で一度だけ取得

        for (var j = 0; j < tokusyuMapList.length; j++) {
            if (KOUTEI_CD == "910") KOUTEI_CD = "009";
            var map2 = getKouteiSeq(SIYOSYO_SEQ, KOUTEI_CD);
            var KOUTEI_SEQ = map2 ? map2['KOUTEI_SEQ'] : getKouteiSeq2(SIYOSYO_SEQ, KOUTEI_CD);
            var tokusyuMap = tokusyuMapList[j];
            var TARGET_ITEM_1 = tokusyuMap['TARGET_ITEM_1'];
            var TARGET_ITEM_2 = tokusyuMap['TARGET_ITEM_2'];
            var TARGET_ITEM_TEXT = tokusyuMap['TARGET_ITEM_TEXT'];
            var TOKUSYU_TEXT = tokusyuMap['TOKUSYU_TEXT'];
            var TOKUSYU_FUYOPARAM = tokusyuMap['TOKUSYU_FUYOPARAM'];
            var TOKUSYU_JKN = tokusyuMap['TOKUSYU_JKN'];
            var TOKUSYU_JKN_DISP = convertTokusyuJkn(TOKUSYU_JKN);

            var BIKO = null;

            if (!TARGET_ITEM_2) TARGET_ITEM_2 = "";
            if (!TARGET_ITEM_TEXT) TARGET_ITEM_TEXT = "";

            switch (TARGET_ITEM_2) {
                case '99':
                    BIKO = TARGET_ITEM_TEXT;
                    break;
                case '98':
                    BIKO = buildPrefixText(SIYOSYO_NO_R2, TARGET_ITEM_TEXT);
                    break;
                case '97':
                    BIKO = "DI:" + buildPrefixText(SIYOSYO_NO_R2, TARGET_ITEM_TEXT);
                    break;
                case '96':
                    BIKO = buildPrefixText(siyosyoMainMap['HIN_NM'], TARGET_ITEM_TEXT);
                    break;
                case '95':
                    BIKO = buildPrefixText(siyosyoMainMap['HINMOKU_CD'], TARGET_ITEM_TEXT);
                    break;
                default:
                    BIKO = TARGET_ITEM_TEXT;
                    break;
            }

            var bikoMap = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                KOUTEI_SEQ: KOUTEI_SEQ,
                DATA01: BIKO,
                GYOSU: j + 1
            };

            var whereMap2 = {
                SIYOSYO_SEQ: SIYOSYO_SEQ,
                KOUTEI_SEQ: KOUTEI_SEQ,
                GYOSU: j + 1
            };

            if (getCount(conn, "SIYO_SEIZO_JKN_MEISAI", whereMap2) > 0) {
                updateByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, ['SIYOSYO_SEQ', 'KOUTEI_SEQ', 'GYOSU'], true);
            } else {
                insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, true);
            }

        }
    }
}

function setKyotuBiko() {

    var conn = TALON.getDbConfig();
    var tokusyuMapList = getTokusyuKotei("03"); // 外で一度だけ取得

    for (var i = 0; i < tokusyuMapList.length; i++) {

        if (i > 2) return;

        var tokusyuMap = tokusyuMapList[i];
        var SIYOSYO_NO = tokusyuMap['SIYOSYO_NO'];
        var SIYOSYO_NO_R2 = SIYOSYO_NO.substring(2, SIYOSYO_NO.length);
        var TOKUSYU_TEXT = tokusyuMap['TOKUSYU_TEXT'];
        var TOKUSYU_FUYOPARAM = tokusyuMap['TOKUSYU_FUYOPARAM']
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
        var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);

        var TOKUSYU_JKN = tokusyuMap['TOKUSYU_JKN'];
        var TOKUSYU_JKN_DISP = convertTokusyuJkn(TOKUSYU_JKN);

        var insMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ
        }

        var result = null;

        if (TOKUSYU_FUYOPARAM) {

            if (!TOKUSYU_TEXT) {

                TOKUSYU_TEXT = ""
            }

            if (!TOKUSYU_JKN_DISP) {

                TOKUSYU_JKN_DISP = ""
            }

            switch (TOKUSYU_FUYOPARAM) {
                case '99':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                    break;
                case '98':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                    break;
                case '97':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, "DI:" + SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                    break;
                case '96':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HIN_NM'] + ' ' + TOKUSYU_TEXT);
                    break;
                case '95':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HINMOKU_CD'] + ' ' + TOKUSYU_TEXT);
                    break;
                default:
                    result = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                    break;
            }
        } else if (TOKUSYU_TEXT) {
            result = TOKUSYU_TEXT;

        }

        insMap['TYUUI_JIKO1'] = "最小ﾄﾞﾘﾙ間:　㎜";
        if (i == 0) {
            insMap['TYUUI_JIKO2'] = result;
        } else if (i == 1) {
            insMap['TYUUI_JIKO3'] = result;
        } else {
            continue;
        }

        var whereMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ
        }


        if (getCount(conn, "HENKOBI_BIKO_WORK", whereMap) > 0) {
            updateByMapEx(conn, "HENKOBI_BIKO_WORK", insMap, ['SIYOSYO_SEQ'], true);
        } else {
            insertByMapEx(conn, "HENKOBI_BIKO_WORK", insMap, true);
        }
    }
}

function setBiko() {

    var conn = TALON.getDbConfig();
    var tokusyuMapList = getTokusyuKotei("04"); // 外で一度だけ取得

    for (var i = 0; i < tokusyuMapList.length; i++) {

        if (i > 2) return;

        var tokusyuMap = tokusyuMapList[i];
        var SIYOSYO_NO = tokusyuMap['SIYOSYO_NO'];
        var SIYOSYO_NO_R2 = SIYOSYO_NO.substring(2, SIYOSYO_NO.length);
        var TOKUSYU_TEXT = tokusyuMap['TOKUSYU_TEXT'];
        var TOKUSYU_JKN = tokusyuMap['TOKUSYU_JKN'];
        var TOKUSYU_JKN_DISP = convertTokusyuJkn(TOKUSYU_JKN);
        var TOKUSYU_FUYOPARAM = tokusyuMap['TOKUSYU_FUYOPARAM']
        var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
        var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);
        var insMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ
        }

        var result = null;

        if (TOKUSYU_FUYOPARAM) {

            if (!TOKUSYU_TEXT) {

                TOKUSYU_TEXT = ""
            }

            if (!TOKUSYU_JKN_DISP) {

                TOKUSYU_JKN_DISP = ""
            }
            switch (TOKUSYU_FUYOPARAM) {
                case '99':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                    break;
                case '98':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                    break;
                case '97':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, "DI:" + SIYOSYO_NO_R2 + ' ' + TOKUSYU_TEXT);
                    break;
                case '96':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HIN_NM'] + ' ' + TOKUSYU_TEXT);
                    break;
                case '95':
                    result = buildPrefixText(TOKUSYU_JKN_DISP, siyosyoMainMap['HINMOKU_CD'] + ' ' + TOKUSYU_TEXT);
                    break;
                default:
                    result = buildPrefixText(TOKUSYU_JKN_DISP, TOKUSYU_TEXT);
                    break;
            }
        } else if (TOKUSYU_TEXT) {
            result = TOKUSYU_TEXT;

        }

        if (i == 0) {
            insMap['BIKO2'] = result;
        } else if (i == 1) {
            insMap['BIKO3'] = result;

        }

        var whereMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ
        }

        if (getCount(conn, "HENKOBI_BIKO_WORK", whereMap) > 0) {
            updateByMapEx(conn, "HENKOBI_BIKO_WORK", insMap, ['SIYOSYO_SEQ'], true);
        } else {
            insertByMapEx(conn, "HENKOBI_BIKO_WORK", insMap, true);
        }
    }
}

function buildPrefixText(prefix, suffix) {
    if (prefix == null || prefix.trim() === "") return suffix;
    return prefix + " " + suffix;
}

function setColorinfo(mitsumoriObjrecord, SIYOSYO_SEQ) {
    var conn = TALON.getDbConfig();
    var SILK_A = getJustKomokuCode(mitsumoriObjrecord, "field_1673848989");
    var SILK_B = getJustKomokuCode(mitsumoriObjrecord, "field_1673849032");
    var RESIST_A = getJustKomokuCode(mitsumoriObjrecord, "field_1673848759");
    var RESIST_B = getJustKomokuCode(mitsumoriObjrecord, "field_1673848861");

    updMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ,
        SILK_A: SILK_A,
        SILK_B: SILK_B,
        RESIST_A: RESIST_A,
        RESIST_B: RESIST_B
    }

    updateByMapEx(conn, "SIYOSYO_MAIN_WORK", updMap, ['SIYOSYO_SEQ'], true);
}

/**
 * 指定された文字列がUTF-8で50バイト以内かを判定します。
 *
 * @param {String} str 判定対象の文字列
 * @return {Boolean} true: 50バイト以内 / false: 超過
 */
function isWithinVarchar50(str) {
    if (str == null) return true; // nullは許容とする
    var byteLength = new java.lang.String(str).getBytes("UTF-8").length;
    return byteLength <= 50;
}



function set3rInitInfo() {
    var conn = TALON.getDbConfig();
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];
    var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);
    var siyosyoMainMap = getSiyosyoMainWork(SIYOSYO_SEQ);
    var mapList = selectList(TALON.getDbConfig(), "KOUTEIJUN_KANRI_WORK", null, { SIYOSYO_SEQ: SIYOSYO_SEQ }, null);

    var mitsumoriObjrecord = getMitumoriObj(siyosyoMainMap['HINMOKU_CD']);
    var hacchuJsonObjrecord = getHacchuObj(siyosyoMainMap['HINMOKU_CD']);
    setColorinfo(mitsumoriObjrecord, SIYOSYO_SEQ);
    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        var KOUTEI_SEQ = map['KOUTEI_SEQ'];
        var KOUTEI_CD_M = map['KOUTEI_CD_M'];
        var KOUTEI_CD = map['KOUTEI_CD'];
        var updMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ,
            KOUTEI_SEQ: KOUTEI_SEQ
        };

        switch (KOUTEI_CD_M) {

            case "010":


                var KIZA_MAKER = getJustKomokuLabel(hacchuJsonObjrecord, "field_1714012704")
                var KIZAIGRADE = getJustKomokuCode(mitsumoriObjrecord, "field_1661157731_13")
                var moji = getJustKomokuLabel(hacchuJsonObjrecord, "field_1717883812");


                updMap['DATA0001'] = convertKizaiMaker010Code(KIZA_MAKER);
                updMap['TOKUSYU_JOKEN00'] = moji;
                updMap['DATA0101'] = convertKizaiGrade010Code(KIZAIGRADE);
                break;
            case "020":

                if (KOUTEI_CD == "020") {
                    var SOUSU = siyosyoMainMap["SOUSU"];
                    var result = SOUSU - 2;
                    for (var i = 0; i < result; i++) {
                        var rowMap = {
                            SIYOSYO_SEQ: SIYOSYO_SEQ,
                            KOUTEI_SEQ: KOUTEI_SEQ,
                            DATA01: siyosyoMainMap['HIN_NM'],
                            GYOSU: i + 1
                        };
                        insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI2", rowMap, true);
                    }
                }

                break;

            case "050":
            case "320":
                updMap['DATA0101'] = siyosyoMainMap['HIN_NM'];
                break;
            case "110":
                updMap['DATA0301'] = siyosyoMainMap['HIN_NM'];
                break;

            // case "100":
            case "140":

                updMap['DATA0201'] = siyosyoMainMap['HIN_NM'];
                updMap['DATA0501'] = siyosyoMainMap['HIN_NM'];
                break;
            case "150":
                updMap['DATA0201'] = siyosyoMainMap['HIN_NM'];
                updMap['DATA0301'] = siyosyoMainMap['HIN_NM'];

                break;
            case "200":
                // いずれの場合のロット表示不要
                updMap['DATA0101'] = '2';
                break;
            case "240":


                var mongon = getJustKomokuCode(mitsumoriObjrecord, "field_1661158090")

                var lotFlag2 = "2"; // デフォルト：不要の場合
                if (mongon === "必要(シルク)") {

                    lotFlag2 = "1"
                }

                putMapValue(updMap, "DATA0401", lotFlag2);

                var AMEN = getJustKomokuCode(mitsumoriObjrecord, "field_1673848989")
                var BMEN = getJustKomokuCode(mitsumoriObjrecord, "field_1673849032")

                var HIN_NM = siyosyoMainMap['HIN_NM'];

                var dispMap = selectSiyoSeizoHeader(SIYOSYO_SEQ, KOUTEI_SEQ);


                if (dispMap) {
                    var DATA0001 = dispMap['DATA0001'];
                    var TOKUSYU_JOKEN00 = dispMap['TOKUSYU_JOKEN00'];

                    if (AMEN != "000") {
                        if (TOKUSYU_JOKEN00) {
                            if (!isCombinedWithinVarchar50(HIN_NM, DATA0001, TOKUSYU_JOKEN00)) {

                                var bikoMap = {
                                    SIYOSYO_SEQ: SIYOSYO_SEQ,
                                    KOUTEI_SEQ: KOUTEI_SEQ,
                                    TOKUSYU_JOKEN: updMap['TOKUSYU_JOKEN03'],
                                    GYOSU: 1
                                };

                                insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, true);

                                updMap['TOKUSYU_JOKEN03'] = dispMap['TOKUSYU_JOKEN00'];
                                updMap['TOKUSYU_JOKEN00'] = "";

                            }
                        }
                    }

                    var DATA0101 = dispMap['DATA0101'];
                    var TOKUSYU_JOKEN01 = dispMap['TOKUSYU_JOKEN01'];
                    if (BMEN != "000") {
                        if (TOKUSYU_JOKEN01) {
                            if (!isCombinedWithinVarchar50(HIN_NM, DATA0101, TOKUSYU_JOKEN01)) {


                                var bikoMap = {
                                    SIYOSYO_SEQ: SIYOSYO_SEQ,
                                    KOUTEI_SEQ: KOUTEI_SEQ,
                                    TOKUSYU_JOKEN: updMap['TOKUSYU_JOKEN04'],
                                    GYOSU: 2
                                };

                                insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, true);

                                updMap['TOKUSYU_JOKEN04'] = dispMap['TOKUSYU_JOKEN01'];
                                updMap['TOKUSYU_JOKEN01'] = "";
                            }
                        }
                    }
                }


                updMap['DATA0002'] = HIN_NM;
                if (AMEN == "000") {
                    // なしの場合
                    updMap['DATA0002'] = ""
                }


                updMap['DATA0102'] = siyosyoMainMap['HIN_NM'];


                if (BMEN == "000") {
                    // なしの場合
                    updMap['DATA0102'] = ""
                }
                updMap['DATA0201'] = "";

                break;
            case "230":

                var AMEN = getJustKomokuCode(mitsumoriObjrecord, "field_1673848759")
                var BMEN = getJustKomokuCode(mitsumoriObjrecord, "field_1673848861")
                var HIN_NM = siyosyoMainMap['HIN_NM'];

                updMap['DATA0002'] = HIN_NM;

                if (AMEN == "000") {
                    // なしの場合
                    updMap['DATA0002'] = ""
                }

                var dispMap = selectSiyoSeizoHeader(SIYOSYO_SEQ, KOUTEI_SEQ);

                if (dispMap) {
                    var DATA0001 = dispMap['DATA0001'];
                    var TOKUSYU_JOKEN00 = dispMap['TOKUSYU_JOKEN00'];

                    if (AMEN != "000") {
                        if (TOKUSYU_JOKEN00) {
                            if (!isCombinedWithinVarchar50(HIN_NM, DATA0001, TOKUSYU_JOKEN00)) {

                                var bikoMap = {
                                    SIYOSYO_SEQ: SIYOSYO_SEQ,
                                    KOUTEI_SEQ: KOUTEI_SEQ,
                                    TOKUSYU_JOKEN: updMap['TOKUSYU_JOKEN03'],
                                    GYOSU: 1
                                };

                                insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, true);

                                updMap['TOKUSYU_JOKEN03'] = dispMap['TOKUSYU_JOKEN00'];
                                updMap['TOKUSYU_JOKEN00'] = "";
                            }
                        }
                    }

                    var DATA0101 = dispMap['DATA0101'];
                    var TOKUSYU_JOKEN01 = dispMap['TOKUSYU_JOKEN01'];
                    if (BMEN != "000") {
                        if (TOKUSYU_JOKEN01) {

                            if (!isCombinedWithinVarchar50(HIN_NM, DATA0101, TOKUSYU_JOKEN01)) {

                                var bikoMap = {
                                    SIYOSYO_SEQ: SIYOSYO_SEQ,
                                    KOUTEI_SEQ: KOUTEI_SEQ,
                                    TOKUSYU_JOKEN: updMap['TOKUSYU_JOKEN04'],
                                    GYOSU: 2
                                };

                                insertByMapEx(conn, "SIYO_SEIZO_JKN_MEISAI", bikoMap, true);

                                updMap['TOKUSYU_JOKEN04'] = dispMap['TOKUSYU_JOKEN01'];
                                updMap['TOKUSYU_JOKEN01'] = "";
                            }
                        }
                    }

                }
                updMap['DATA0102'] = HIN_NM;
                if (BMEN == "000") {
                    // なしの場合
                    updMap['DATA0102'] = ""
                }


                break;

            case "260":
                updMap['DATA0001'] = siyosyoMainMap['HIN_NM'];
                updMap['DATA0101'] = siyosyoMainMap['HIN_NM'];
                break;
            case "390":

                var kensaMae = getJustKomokuCode(hacchuJsonObjrecord, "field_1714018233");

                if (kensaMae) {

                    var kensa = extractLeadingNumber(kensaMae);
                    putMapValue(updMap, 'DATA0001', kensa);

                }

                break;

            case "400":
                var lotFlag = "2"; // デフォルト：不要の場合
                var mongon = getJustKomokuCode(mitsumoriObjrecord, "field_1661158090")

                if (mongon === "必要(レーザー)") {
                    lotFlag = "4";
                }

                putMapValue(updMap, 'DATA0001', "1");
                putMapValue(updMap, 'DATA0101', siyosyoMainMap['HIN_NM']);
                putMapValue(updMap, 'DATA0201', 100);
                putMapValue(updMap, 'DATA0301', "1");
                putMapValue(updMap, 'DATA0401', lotFlag);
                break;

            case "480":

                putMapValue(updMap, "DATA0001", null);
                // var hacchuJsonObj = JSON.parse(selectSIYO1001(siyosyoMainMap['HINMOKU_CD'], 'HACCHU'));

                // === 専用伝票（DATA0101） ===
                var senyoDenpyo = getJustKomokuCode(hacchuJsonObjrecord, "field_1714012017");


                //}

                senyoDenpyo = extractNumberBeforeColon(senyoDenpyo); // 例: "2：同梱" → "2"

                if (senyoDenpyo == "2") {

                    senyoDenpyo = "1"
                } else if (senyoDenpyo == "3") {

                    senyoDenpyo = "1"
                } else {
                    senyoDenpyo = "2"

                }

                putMapValue(updMap, "DATA0101", senyoDenpyo);

                // === 外装有無（DATA0201） ===
                //var exterior = hacchuJsonObj.record.field_1713766844_62;
                var exterior = hacchuJsonObjrecord["field_1713766844_62"];
                putMapValue(updMap, "DATA0201", exterior ? "1" : "2");

                // === 運送便（DATA0301） ===

                var unsomae = getJustKomokuCode(hacchuJsonObjrecord, "field_1714012314");
                unsoCode = extractNumberBeforeColon(unsomae); // 例: "1：ヤマト" → "1"
                var UNSO = "";
                if (unsoCode == "1") {
                    UNSO = "4"; // ヤマト
                } else if (unsoCode == "2") {
                    UNSO = "5"; // 佐川
                } else if (unsoCode == "9") {
                    UNSO = "9"; // 指定無し
                } else {
                    UNSO = ""; // その他は空白
                }
                putMapValue(updMap, "DATA0301", UNSO);


                break;
        }

        var whereMap = {
            SIYOSYO_SEQ: SIYOSYO_SEQ,
            KOUTEI_SEQ: KOUTEI_SEQ
        };

        if (getCount(conn, "SIYO_SEIZO_JKN_HEADER", whereMap) > 0) {
            updateByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", updMap, ['SIYOSYO_SEQ', 'KOUTEI_SEQ'], true);
        } else {
            insertByMapEx(conn, "SIYO_SEIZO_JKN_HEADER", updMap, true);
        }
    }
}

/**
 * 複数の文字列を合計して、UTF-8で50バイト以内か判定します。
 *
 * @param {...String} args 判定対象の文字列（可変長）
 * @return {Boolean} true: 50バイト以内 / false: 超過
 */
function isCombinedWithinVarchar50(/* 可変長引数 */) {
    var total = 0;
    for (var i = 0; i < arguments.length; i++) {
        var str = arguments[i];
        if (str != null) {
            total += new java.lang.String(str).getBytes("UTF-8").length;
        }
    }
    return total <= 50;
}

function extractLeadingNumber(str) {
    if (!str) return "無し";  // 空やnullのときは"無し"返却（業務ロジックに応じて調整）
    var match = String(str).match(/^\d+/);  // 先頭の数字だけマッチ（^\d+）
    return match ? match[0] : "無し";
}

function selectSiyoSeizoHeader(SIYOSYO_SEQ, KOUTEI_SEQ) {

    var tableName = "SIYO_SEIZO_JKN_HEADER";
    var whereMap = {
        "SIYOSYO_SEQ": SIYOSYO_SEQ,                  // 表示名称
        "KOUTEI_SEQ": KOUTEI_SEQ   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map

}


/**
 * マップに安全に値を設定（null/undefined → 空文字）
 */
function putMapValue(map, key, value) {
    map[key] = (value === null || value === undefined) ? "" : String(value);
}


function getTokusyuKotei(PROD_INSTR_DISPLAY_FLG) {
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];

    var sql = ""
        + " SELECT "
        + "   SIYO20012.SIYOSYO_NO"
        + "  ,SIYOM001.BLOCK_ID"
        + "  ,SIYO20012.TEXT"
        + "  ,SIYOM002.KOUTEI_CD"
        + "  ,SIYOM002.TARGET_FUNC"
        + "  ,SIYOM002.TARGET_ITEM_1"
        + "  ,SIYOM002.TARGET_ITEM_2"
        + "  ,SIYOM002.TARGET_ITEM_TEXT"
        + "  ,SIYOM002.TOKUSYU_ID"
        + "  ,SIYOM002.TOKUSYU_JKN"
        + "  ,SIYOM002.TOKUSYU_TEXT"
        + "  ,SIYOM002.TOKUSYU_FUYOPARAM"
        + " FROM SIYO20012"
        // MAIN情報取得
        + " OUTER APPLY ("
        + "     SELECT TOP 1 * FROM SIYOSYO_MAIN_WORK"
        + "     WHERE SIYOSYO_NO = SIYO20012.SIYOSYO_NO"
        + " ) SIYOSYO_MAIN"
        // BLOCK_ID 判定 APPLY
        + " OUTER APPLY ("
        + "     SELECT TOP 1 *"
        + "     FROM SIYOM001"
        + "     WHERE SIYOM001.BLOCK_NM = SIYO20012.TEXT"
        + "       AND ("
        + "             ( LEFT(SIYOM001.BLOCK_ID,1) BETWEEN '0' AND '9'"
        + "               AND SIYOSYO_MAIN.TRHK_CD IS NOT NULL"
        + "               AND SIYOM001.BLOCK_ID LIKE SIYOSYO_MAIN.TRHK_CD + '%' )"
        + "             OR (LEFT(SIYOM001.BLOCK_ID,1) NOT BETWEEN '0' AND '9')"
        + "           )"
        + " ) SIYOM001"
        // JOIN SIYOM002
        + " LEFT OUTER JOIN SIYOM002"
        + "   ON SIYOM002.BLOCK_ID = SIYOM001.BLOCK_ID"
        + " WHERE SIYO20012.SIYOSYO_NO = '" + SIYOSYO_NO + "'"
        + "   AND SIYOM002.PROD_INSTR_DISPLAY_FLG = '" + PROD_INSTR_DISPLAY_FLG + "'"
        + " ORDER BY SIYOM002.KOUTEI_CD";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

function getTokusyuKotei2(PROD_INSTR_DISPLAY_FLG, KOUTEI_CD) {
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];

    var sql = ""
        + " SELECT "
        + "   SIYO20012.SIYOSYO_NO"
        + "  ,SIYOM001.BLOCK_ID"
        + "  ,SIYO20012.TEXT"
        + "  ,SIYOM002.KOUTEI_CD"
        + "  ,SIYOM002.TARGET_FUNC"
        + "  ,SIYOM002.TARGET_ITEM_1"
        + "  ,SIYOM002.TARGET_ITEM_2"
        + "  ,SIYOM002.TARGET_ITEM_TEXT"
        + "  ,SIYOM002.TOKUSYU_ID"
        + "  ,SIYOM002.TOKUSYU_JKN"
        + "  ,SIYOM002.TOKUSYU_TEXT"
        + "  ,SIYOM002.TOKUSYU_FUYOPARAM"
        + " FROM SIYO20012"
        // MAIN
        + " OUTER APPLY ("
        + "     SELECT TOP 1 * FROM SIYOSYO_MAIN_WORK"
        + "     WHERE SIYOSYO_NO = SIYO20012.SIYOSYO_NO"
        + " ) SIYOSYO_MAIN"
        // BLOCK APPLY
        + " OUTER APPLY ("
        + "     SELECT TOP 1 *"
        + "     FROM SIYOM001"
        + "     WHERE SIYOM001.BLOCK_NM = SIYO20012.TEXT"
        + "       AND ("
        + "             ( LEFT(SIYOM001.BLOCK_ID,1) BETWEEN '0' AND '9'"
        + "               AND SIYOSYO_MAIN.TRHK_CD IS NOT NULL"
        + "               AND SIYOM001.BLOCK_ID LIKE SIYOSYO_MAIN.TRHK_CD + '%' )"
        + "             OR (LEFT(SIYOM001.BLOCK_ID,1) NOT BETWEEN '0' AND '9')"
        + "           )"
        + " ) SIYOM001"
        // JOIN
        + " LEFT OUTER JOIN SIYOM002"
        + "   ON SIYOM002.BLOCK_ID = SIYOM001.BLOCK_ID"
        + " WHERE SIYO20012.SIYOSYO_NO = '" + SIYOSYO_NO + "'"
        + "   AND SIYOM002.PROD_INSTR_DISPLAY_FLG = '" + PROD_INSTR_DISPLAY_FLG + "'"
        + "   AND SIYOM002.KOUTEI_CD = '" + KOUTEI_CD + "'"
        + "   AND ( SIYOM002.TARGET_ITEM_1 <> 'BIKO' OR SIYOM002.TARGET_ITEM_1 IS NULL )";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

function getTokusyuKotei3(PROD_INSTR_DISPLAY_FLG, KOUTEI_CD) {
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];

    var sql = ""
        + " SELECT "
        + "   SIYO20012.SIYOSYO_NO"
        + "  ,SIYOM001.BLOCK_ID"
        + "  ,SIYO20012.TEXT"
        + "  ,SIYOM002.KOUTEI_CD"
        + "  ,SIYOM002.TARGET_FUNC"
        + "  ,SIYOM002.TARGET_ITEM_1"
        + "  ,SIYOM002.TARGET_ITEM_2"
        + "  ,SIYOM002.TARGET_ITEM_TEXT"
        + "  ,SIYOM002.TOKUSYU_ID"
        + "  ,SIYOM002.TOKUSYU_JKN"
        + "  ,SIYOM002.TOKUSYU_TEXT"
        + "  ,SIYOM002.TOKUSYU_FUYOPARAM"
        + " FROM SIYO20012"
        // MAIN
        + " OUTER APPLY ("
        + "     SELECT TOP 1 * FROM SIYOSYO_MAIN_WORK"
        + "     WHERE SIYOSYO_NO = SIYO20012.SIYOSYO_NO"
        + " ) SIYOSYO_MAIN"
        // BLOCK APPLY
        + " OUTER APPLY ("
        + "     SELECT TOP 1 *"
        + "     FROM SIYOM001"
        + "     WHERE SIYOM001.BLOCK_NM = SIYO20012.TEXT"
        + "       AND ("
        + "             ( LEFT(SIYOM001.BLOCK_ID,1) BETWEEN '0' AND '9'"
        + "               AND SIYOSYO_MAIN.TRHK_CD IS NOT NULL"
        + "               AND SIYOM001.BLOCK_ID LIKE SIYOSYO_MAIN.TRHK_CD + '%' )"
        + "             OR (LEFT(SIYOM001.BLOCK_ID,1) NOT BETWEEN '0' AND '9')"
        + "           )"
        + " ) SIYOM001"
        // JOIN
        + " LEFT OUTER JOIN SIYOM002"
        + "   ON SIYOM002.BLOCK_ID = SIYOM001.BLOCK_ID"
        + " WHERE SIYO20012.SIYOSYO_NO = '" + SIYOSYO_NO + "'"
        + "   AND SIYOM002.PROD_INSTR_DISPLAY_FLG = '" + PROD_INSTR_DISPLAY_FLG + "'"
        + "   AND SIYOM002.KOUTEI_CD = '" + KOUTEI_CD + "'"
        + "   AND ( SIYOM002.TARGET_ITEM_1 = 'BIKO'"
        + "         OR SIYOM002.KOUTEI_CD = '910'"
        + "         OR SIYOM002.KOUTEI_CD = '009' )";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

function getTokusyuKoteiInit() {
    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];

    var sql = ""
        + " SELECT DISTINCT"
        + "     SIYO20012.SIYOSYO_NO"
        + "    ,SIYOM002.KOUTEI_CD"
        + " FROM SIYO20012"
        // --- SIYOSYO_MAIN_WORK の APPLY ---
        + " OUTER APPLY ("
        + "     SELECT TOP 1 *"
        + "     FROM SIYOSYO_MAIN_WORK"
        + "     WHERE SIYOSYO_NO = SIYO20012.SIYOSYO_NO"
        + " ) SIYOSYO_MAIN"
        // --- SIYOM001 の APPLY（先頭が数字かどうか＋TRHK_CD前方一致ロジックを統合） ---
        + " OUTER APPLY ("
        + "     SELECT TOP 1 *"
        + "     FROM SIYOM001"
        + "     WHERE SIYOM001.BLOCK_NM = SIYO20012.TEXT"
        + "       AND ("
        + "              ("
        + "                  -- 先頭が数字で、TRHK_CD一致が必要"
        + "                  LEFT(SIYOM001.BLOCK_ID,1) BETWEEN '0' AND '9'"
        + "                  AND SIYOSYO_MAIN.TRHK_CD IS NOT NULL"
        + "                  AND SIYOM001.BLOCK_ID LIKE SIYOSYO_MAIN.TRHK_CD + '%'"
        + "              )"
        + "              OR ("
        + "                  -- 先頭が数字でない場合はそのまま採用"
        + "                  LEFT(SIYOM001.BLOCK_ID,1) NOT BETWEEN '0' AND '9'"
        + "              )"
        + "           )"
        + " ) SIYOM001"
        // --- SIYOM002 との JOIN 部分 ---
        + " LEFT OUTER JOIN SIYOM002"
        + "   ON SIYOM002.BLOCK_ID = SIYOM001.BLOCK_ID"
        + " WHERE SIYO20012.SIYOSYO_NO = '" + SIYOSYO_NO + "'"
        + "   AND KOUTEI_CD IS NOT NULL"
        + " ORDER BY SIYOM002.KOUTEI_CD";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}


/**
 * 汎用コードマスタから作業サイズ名称に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertKizaiMaker010Code(name) {

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP1": extractBeforeComma(name),                  // 表示名称
        "SIKIBETU_CODE": "KIZAI_MAKER010"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['KEY_CODE'] : null;
}

/**
 * 汎用コードマスタから作業サイズ名称に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertTokusyuJkn(KEY_CODE) {

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "KEY_CODE": KEY_CODE,                  // 表示名称
        "SIKIBETU_CODE": "TOKUSYU_JKN"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['DSP2'] : null;
}

/**
 * 汎用コードマスタから作業サイズ名称に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertKizaiGrade010Code(name) {

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP1": extractBeforeComma(name),                  // 表示名称
        "SIKIBETU_CODE": "KIZAI_GRADE010"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['KEY_CODE'] : null;
}

/**
 * カンマの前の文字列を取り出す（全角カンマにも対応）
 *
 * @param {*} value - 入力値（nullや非文字列も許容）
 * @returns {string} カンマの前の部分（例："2"）
 */
function extractBeforeComma(value) {
    if (value == null) return "";
    var str = String(value);                    // 明示的に文字列化
    str = str.replace('，', ',');               // 全角カンマを半角に変換
    var parts = str.split(',');
    return parts.length > 0 ? parts[0] : "";
}

function clearKoutei() {

    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_NO = lineDataMap['SIYOSYO_NO'];
    var SIYOSYO_SEQ = getSiyosyoSeq(SIYOSYO_NO);

    var delMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ

    }
    deleteByMapEx(TALON.getDbConfig(), "SIYO_SEIZO_JKN_HEADER", delMap, ['SIYOSYO_SEQ'], true)
    deleteByMapEx(TALON.getDbConfig(), "SIYO_SEIZO_JKN_MEISAI", delMap, ['SIYOSYO_SEQ'], true)
    deleteByMapEx(TALON.getDbConfig(), "HENKOBI_BIKO_WORK", delMap, ['SIYOSYO_SEQ'], true)
    deleteByMapEx(TALON.getDbConfig(), "KOUTEI_MEISAI_SIYOSYO_WORK", delMap, ['SIYOSYO_SEQ'], true)
    deleteByMapEx(TALON.getDbConfig(), "KOUTEI_MEISAI_KOUMOKU_WORK", delMap, ['SIYOSYO_SEQ'], true)
    deleteByMapEx(TALON.getDbConfig(), "SIYO_SEIZO_JKN_MEISAI2", delMap, ['SIYOSYO_SEQ'], true)
}