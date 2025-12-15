var _NEXT_KAKO_ID = saiHakoKako();

var lineDataMap = TALON.getBlockData_Card(1);
var KAKO_ID = _NEXT_KAKO_ID;
var KAKO_NO = lineDataMap['KAKO_NO'];
var TENPU_NAIYOU = lineDataMap['TENPU_NAIYOU'];
var KAKO_IRAI_SYO_KBN_NM = lineDataMap['KAKO_IRAI_SYO_KBN_NM'];
var KAKO_IRAI_SYO_KBN_NM2 = KAKO_NO + ' ' + KAKO_IRAI_SYO_KBN_NM;
var WORK_ID = lineDataMap['WORK_ID'];
var ROUTE_ID = lineDataMap['ROUTE_ID'];


// ワークフロー申請処理
// setWfsInfo(WORK_ID, KAKO_ID, KAKO_IRAI_SYO_KBN_NM, ROUTE_ID);
setFinalData(WORK_ID, KAKO_ID, ROUTE_ID, KAKO_IRAI_SYO_KBN_NM);

TALON.setSearchConditionData("KAKO_ID", _NEXT_KAKO_ID, "");

/**
 * 
 * WFS依頼自動データ作成
 */
function setWfsInfo(WORK_ID, KAKO_ID, OBJECT_NM, ROUTE_ID) {

    paramTbl =
        ['-funcname', 'WFS_T010'
            , '-condition', 'WORK_ID', '=', WORK_ID
            , '-condition', 'OBJECT_ID', '=', KAKO_ID
            , '-condition', 'OBJECT_NM', '=', OBJECT_NM
            , '-condition', 'ROUTE_ID', '=', ROUTE_ID
            , '-execute'];
    if (!TALON.callBATController(paramTbl)) {
        TALON.addErrorMsg("処理でエラーが発生しました");
        TALON.setIsSuccess(false);
    } else {
        TALON.setIsSuccess(true);

    }

}

function setFinalData(WORK_ID, KAKO_ID, ROUTE_ID, KAKO_IRAI_SYO_KBN_NM) {

    var authMapList = getWfsAuth(ROUTE_ID);
    if (!authMapList || authMapList.length === 0) {
        // 承認ルートが定義されていない場合は何もしない or エラー扱いにする
        // TALON.addErrorMsg("承認ルートが未設定です（ROUTE_ID=" + ROUTE_ID + "）");
        return;
    }

    var userDataMap = TALON.getUserInfoMap();
    var func_id = userDataMap['FUNC_ID'];
    var user_id = userDataMap['USER_ID'];
    var sysdate = new java.util.Date();
    var db = TALON.getDbConfig();

    for (var i = 0; i < authMapList.length; i++) {
        var authMap = authMapList[i];

        /*
        if (i == 0) {

            var sql = "UPDATE WFS_T_WORKFLOW "
                + "SET STATUS = '2', "
                + "SHONIN_ID = '" + user_id + "', "
                + "CURENT_FLG = '0' "
                + "WHERE WORK_ID = '" + WORK_ID + "'"
                + "AND OBJECT_ID = '" + KAKO_ID + "'"
                + "AND STEP = '" + 2 + "'"
            TalonDbUtil.update(db, sql);
            continue;
        }
        */

        // 最終ステップのみフラグON
        var isLast = (i === authMapList.length - 1);

        var insMap = {
            WORK_ID: WORK_ID,
            OBJECT_ID: KAKO_ID,
            // STEP: 1 が起票済み想定なら 2 から開始でOK
            STEP: i + 1,
            OBJECT_NM: KAKO_IRAI_SYO_KBN_NM,
            ROUTE_ID: ROUTE_ID,
            // ★ログインユーザーをセット（必要に応じて authMap["USR_ID"] に変更）
            USR_ID: user_id,
            STATUS: isLast ? "4" : "2",
            LVL: authMap["LVL"],
            APP_MEMO: "",
            RES_MEMO: "",
            REJECT_KBN: "2",
            CURENT_FLG: isLast ? "1" : "0",
            CREATED_DATE: sysdate,
            CREATED_BY: user_id,
            CREATED_PRG_NM: func_id,
            UPDATED_DATE: sysdate,
            UPDATED_BY: user_id,
            UPDATED_PRG_NM: func_id,
            MODIFY_COUNT: 0,
            SHONIN_ID: isLast ? null : user_id,  // ここも仕様によっては authMap["USR_ID"] にした方が良いかも
            ACTIVE_FLG: "1",
            HOLD_FLG: null
        };

        insertByMapEx(db, "WFS_T_WORKFLOW", insMap, true);
    }
}


function getWfsAuth(ROUTE_ID) {

    if (!ROUTE_ID) {
        TALON.addErrorMsg("ROUTE_ID が未指定です");
        TALON.setIsSuccess(false);
        return [];
    }

    try {
        return selectList(
            TALON.getDbConfig(),
            "WFS_M_AUTH",
            null,
            { ROUTE_ID: ROUTE_ID },
            "LVL ASC"
        );
    } catch (e) {
        TALON.addErrorMsg("承認権限取得処理でエラー: " + e.message);
        TALON.setIsSuccess(false);
        return [];
    }
}



/**
 * 再発行処理（加工依頼の複製＋明細・経費・ワークフローの複製）
 */

function saiHakoKako() {
    var conn = TALON.getDbConfig();
    var userDataMap = TALON.getUserInfoMap();
    var _USER_ID = userDataMap['USER_ID'];
    var _PRG_NM = "NIPPO_INPUT_15";

    // 加工依頼IDの取得と削除
    var lineDataMap = TALON.getBlockData_Card(1);
    var _KAKO_ID = lineDataMap['KAKO_ID'];
    delWfs_kako(_KAKO_ID);

    // 新規IDの発番
    var _NEXT_KAKO_ID = TALON.getNumberingData('TID', 1)[0];

    // NP_T_KAKO ヘッダコピー
    insertKakoHeader(_KAKO_ID, _NEXT_KAKO_ID, _USER_ID, _PRG_NM);

    // 明細コピー
    copyTableById('NP_T_INPUT_COMMON', 'KAKO_ID', _KAKO_ID, _NEXT_KAKO_ID);

    // 経費コピー
    copyTableById('NP_T_KAKO_KEIHI_MEISAI', 'KAKO_ID', _KAKO_ID, _NEXT_KAKO_ID);

    // 検索条件と完了メッセージ設定
    TALON.setSearchConditionData("KAKO_ID", _NEXT_KAKO_ID, "");
    TALON.addMsg("再発行処理が完了しました。\n最終承認を実施し、発注書を再送してください。");
    TALON.setIsSuccess(true);

    return _NEXT_KAKO_ID;
}

/**
 * NP_T_KAKO 単票の再発行 INSERT（最新ID＋SUB_NO更新付き）
 */

function insertKakoHeader(_KAKO_ID, _NEXT_KAKO_ID, _USER_ID, _PRG_NM) {
    var conn = TALON.getDbConfig();

    var columns = [
        "KAKO_ID", "KAKO_NO", "MAIL_SEND_STATUS", "KAKO_IRAI_SYO_KBN", "SUB_NO",
        "NOUHINKIJITU_DT", "SYUKKA_DT", "ITAKU_DT", "GAITYUSAKI", "TYOKUSO",
        "NOUHINSAKI", "TENPU_NAIYOU", "MAIL_DVS", "MAIL_DVS2", "MAIL_DVS3",
        "TOKI_JIKO", "BIKO", "KEIHI_MEISAI",
        "CREATED_DATE", "CREATED_BY", "CREATED_PRG_NM",
        "UPDATED_DATE", "UPDATED_BY", "UPDATED_PRG_NM",
        "MODIFY_COUNT"
    ];

    var insertClause = "INSERT INTO NP_T_KAKO (\n    " + columns.join(",\n    ") + "\n)";
    var selectClause = [
        "'" + _NEXT_KAKO_ID + "' AS KAKO_ID",
        "NP_T_KAKO.KAKO_NO",
        "'0' AS MAIL_SEND_STATUS",
        "NP_T_KAKO.KAKO_IRAI_SYO_KBN",
        "FORMAT(SUB_NO + 1, 'D2') AS SUB_NO",
        "NP_T_KAKO.NOUHINKIJITU_DT",
        "NP_T_KAKO.SYUKKA_DT",
        "NP_T_KAKO.ITAKU_DT",
        "NP_T_KAKO.GAITYUSAKI",
        "NP_T_KAKO.TYOKUSO",
        "NOUHINSAKI", "TENPU_NAIYOU", "MAIL_DVS", "MAIL_DVS2", "MAIL_DVS3",
        "NP_T_KAKO.TOKI_JIKO", "NP_T_KAKO.BIKO", "NP_T_KAKO.KEIHI_MEISAI",
        "SYSDATETIME() AS CREATED_DATE", "'" + _USER_ID + "' AS CREATED_BY", "'" + _PRG_NM + "' AS CREATED_PRG_NM",
        "SYSDATETIME() AS UPDATED_DATE", "'" + _USER_ID + "' AS UPDATED_BY", "'" + _PRG_NM + "' AS UPDATED_PRG_NM",
        "0 AS MODIFY_COUNT"
    ];

    var sql = insertClause + "\nSELECT\n    " + selectClause.join(",\n    ") + "\n" +
        "FROM NP_T_KAKO\n" +
        "INNER JOIN (\n" +
        "    SELECT KAKO_NO, MAX(KAKO_ID) AS MAX_ID\n" +
        "    FROM NP_T_KAKO\n" +
        "    GROUP BY KAKO_NO\n" +
        ") NP_T_KAKO_MAX ON NP_T_KAKO_MAX.MAX_ID = NP_T_KAKO.KAKO_ID\n" +
        "WHERE KAKO_ID = '" + _KAKO_ID + "'";

    var iCount = TalonDbUtil.insert(conn, sql);
    if (iCount !== 1) {
        TALON.addErrorMsg("再発行処理が失敗しました。 対象件数：" + iCount + "件");
        TALON.setIsSuccess(false);
    }
}

/**
 * 汎用：指定IDで絞ったデータを別IDに差し替えて登録（ID再採番）
 */

function copyTableById(tableName, keyColumn, oldId, newId) {
    var conn = TALON.getDbConfig();
    var whereMap = {};
    whereMap[keyColumn] = oldId;
    var list = selectList(conn, tableName, null, whereMap, null);

    for (var i = 0; i < list.length; i++) {
        var map = list[i];
        var ID = map['ID'];
        var NEW_ID = TALON.getNumberingData('TID', 1)[0];
        map['ID'] = NEW_ID;
        map[keyColumn] = newId;

        if (tableName === "NP_T_INPUT_COMMON") {
            copyNpBiko(ID, NEW_ID);
        }

        insertByMapEx(conn, tableName, map, true);
    }
}

/**
 * NP_T_KAKO_BIKO の対応する備考情報を ID 連動でコピー
 */

function copyNpBiko(ID, NEW_ID) {
    var conn = TALON.getDbConfig();
    var tableName = "NP_T_KAKO_BIKO";
    var whereMap = { ID: ID };
    var map = selectOne(conn, tableName, null, whereMap, null);

    if (map) {
        map['ID'] = NEW_ID;
        insertByMapEx(conn, tableName, map, true);
    }
}

/**
 * ワークフロー削除
 */

function delWfs_kako(KAKO_ID) {
    var conn = TALON.getDbConfig();
    var whereMap = { OBJECT_ID: KAKO_ID };
    deleteByMapEx(conn, 'WFS_T_WORKFLOW', whereMap, ['OBJECT_ID'], true);
}