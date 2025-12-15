var EXECUTE_KEY_SELECT = 'select';
var EXECUTE_KEY_UPDATE = 'update';
var EXECUTE_KEY_INSERT = 'insert';
var EXECUTE_KEY_DELETE = 'delete';

/**
 * yyyy/MN/dd の日付取得
 * @returns 
 */
function getDt() {

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var dates = now.getDate();
    var target_dt = year + "/" + zeropadding(month, 2) + "/" + zeropadding(dates, 2);

    return target_dt;
}

/**
 * yyyy/MN/dd の日付取得
 * @returns 
 */
function getTime() {

    var now = new Date();
    var hour = now.getHours();
    var min = now.getMinutes();

    return zeropadding(hour, 2) + ":" + zeropadding(min, 2);
}


/**
 * 指定された関数IDに対応するSQL文（BODY_SQL）を取得する。
 *
 * TLN_M_GENERAL_FUNC_SQL テーブルから FUNC_ID をキーに検索し、
 * 登録されているBODY_SQLを返却する。
 *
 * @param {string} func_id - SQL定義関数ID
 * @returns {string|null} 該当するSQL文（BODY_SQL）。なければ null。
 */
function getBodySql(func_id) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        FUNC_ID: func_id
    };

    var map = selectOne(conn, 'TLN_M_GENERAL_FUNC_SQL', ['BODY_SQL'], whereMap, null);
    return map ? map['BODY_SQL'] : null;
}

/**
 * 指定された桁数でゼロパディングを行う。
 *
 * 例：zeropadding(5, 3) → "005"
 *
 * @param {number|string} target - 対象の値（数値または文字列）
 * @param {number} ketasu - 桁数（パディング後の長さ）
 * @returns {string} ゼロパディングされた文字列
 */
function zeropadding(target, ketasu) {
    var str = String(target);
    while (str.length < ketasu) {
        str = '0' + str;
    }
    return str;
}


//日付型項目への MAP 更新時の変換
function dateConvertMapData(obj) {
    var toStr = Object.prototype.toString;
    var tType = toStr.call(obj).slice(8, -1).toUpperCase();
    switch (tType) {
        case 'STRING':
            if (obj.split(" ").length == 1) {
                //YYYY/MM/DD を想定
                var y = parseInt(obj.split("/")[0]) - 1900;
                var m = parseInt(obj.split("/")[1]) - 1;
                var d = parseInt(obj.split("/")[2]) + 0;
                var sDate = new java.util.Date(y, m, d);
            } else {
                //YYYY/MM/DD HH:MI:SS を想定
                var val1 = obj.split(" ")[0];
                var val2 = obj.split(" ")[1];
                var y = parseInt(val1.split("/")[0]) - 1900;
                var m = parseInt(val1.split("/")[1]) - 1;
                var d = parseInt(val1.split("/")[2]) + 0;
                var h = parseInt(val2.split(":")[0]);
                var f = parseInt(val2.split(":")[1]);
                var s = parseInt(val2.split(":")[2]);
                var sDate = new java.util.Date(y, m, d, h, f, s);
            }
            break;
        case 'JAVA.SQL.TIMESTAMP':
            var sDate = new java.util.Date(
                (obj.getYear() + 1900),
                (obj.getMonth() + 1),
                (obj.getDate()),
                (obj.getHours()),
                (obj.getMinutes()),
                (obj.getSeconds())
            );

            break;
        case 'ORACLE.SQL.TIMESTAMP':
            var tmp = obj.timestampValue();
            var sDate = new java.util.Date(
                (tmp.getYear() + 1900),
                (tmp.getMonth() + 1),
                (tmp.getDate()),
                (tmp.getHours()),
                (tmp.getMinutes()),
                (tmp.getSeconds())
            );
            break;
        default:
            var sDate = obj;
            break;
    }
    return sDate;
}




/**
 * 
 * @param {*} LOT_NO 
 */
function getSiyosyoSeq3(LOT_NO) {

    var sql = "SELECT TOP 1 SIYOSYO_SEQ FROM O7ISCHEDULE WHERE LOT_NO ='" + LOT_NO + "'"

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

function getRenkeiInfo3(LOT_NO, KOUTEI_CD) {
    var sql = "SELECT TOP 1 NippouRenkeiSeqNO FROM T0000RK_NippouJisseki_Renkei WHERE LotNO ='" + LOT_NO + "' AND SagyoukuCD = '" + KOUTEI_CD + "'"

    return TalonDbUtil.select(TALON.getOtherDBConn("2"), sql)

}

function getFirstKoutei3(SIYOSYO_SEQ) {
    var sql = "SELECT TOP 1 KOUTEI_CD FROM KOUTEIJUN_KANRI WHERE SIYOSYO_SEQ ='" + SIYOSYO_SEQ + "' AND KOUTEI_JUN = 2 "

    return TalonDbUtil.select(TALON.getDbConfig(), sql);

}

/**
 * 半角カタカナを全角カタカナに変換する関数。
 * 入力された文字列中の半角カタカナを対応する全角カタカナに変換します。
 *
 * @param {String} str - 半角カタカナを含む文字列。
 * @returns {String} - 全角カタカナに変換された文字列。無効な入力には空文字列を返します。
 */
function kanaHalfToFull(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    var kanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        '｡': '。', '､': '、', 'ｰ': 'ー', '｢': '「', '｣': '」', '･': '・'
    };

    // 正規表現を使用して文字列中の半角カタカナを全角カタカナに置換
    var reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
    return str.replace(reg, function (match) {
        return kanaMap[match];
    })
        // 濁点と半濁点を全角に変換
        .replace(/ﾞ/g, '゛')
        .replace(/ﾟ/g, '゜');
}

/**
 * クエリ内の '?' を params 配列の値で順番に置換する関数。
 * クエリ内のプレースホルダー '?' を params 配列の要素に置き換えて、最終的なSQLクエリを生成します。
 * パラメータが null または undefined の場合は SQL の NULL に置換されます。
 * サポートされていないデータ型が渡された場合はエラーメッセージを追加し、処理を中断します。
 * 
 * @param {string} query - プレースホルダー '?' を含むSQLクエリ文字列。
 * @param {Array} params - クエリ内の '?' に対応する値の配列。文字列、数値、ブール値がサポートされています。
 * @returns {string} プレースホルダーを置換した最終的なSQLクエリ。エラーが発生した場合は空文字列を返します。
 */
function createQueryWithParams(query, params) {
    var placeholdersCount = (query.match(/\?/g) || []).length;
    if (placeholdersCount !== params.length) {
        // プレースホルダーの数とパラメータの数が一致しない場合
        TALON.addErrorMsg('プレースホルダーの数とパラメータの数が一致しません。クエリ: ' + query);
        TALON.setIsSuccess(false);
        return ''; // 空のクエリを返して処理を中断
    }

    // '?' をパラメータに置き換える
    var index = 0;
    return query.replace(/\?/g, function () {
        var value = params[index++]; // 順番にパラメータを取得

        // 値が null や undefined の場合は SQL の NULL に置換
        if (value === null || value === undefined) {
            return 'NULL';
        }

        // 値が文字列の場合、SQLインジェクションを防ぐためエスケープ処理を行いシングルクォートで囲む
        if (typeof value === 'string') {
            return "'" + value.replace(/'/g, "''") + "'"; // SQLインジェクション防止のためのエスケープ
        }

        // 数値やブール値はそのまま返す
        if (typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        // サポートされていないデータ型の場合、エラーメッセージを追加し処理を中断
        return value; // 空文字列を返して置き換え
    });
}

/**
 * SQLクエリの実行を統一的に扱う共通関数 (SELECT, UPDATE, INSERT, DELETE) + トランザクション管理
 * 
 * @param {Object} dbConnection - データベース接続情報
 * @param {string} query - プレースホルダーを含むSQLクエリ
 * @param {Array} params - プレースホルダーに対応するパラメータの配列
 * @param {string} queryType - クエリの種類 ('select', 'update', 'insert', 'delete')
 * @param {boolean} [isTransactional] - トランザクションを使用するかどうかのフラグ
 * @returns {Array|number|null} SELECTの場合は結果セットを返し、UPDATE, INSERT, DELETEの場合は処理件数を返す
 */
function executeQuery(dbConnection, query, params, queryType, isTransactional) {
    // デフォルト値の設定
    if (typeof isTransactional === 'undefined') {
        isTransactional = false;
    }

    try {
        // トランザクション開始（必要な場合）
        if (isTransactional) {
            TALON.getLogger().writeInfo('[TRANSACTION] トランザクションを開始します');
            TalonDbUtil.begin(dbConnection);
        }

        // パラメータをクエリに埋め込む
        var finalQuery = createQueryWithParams(query, params);
        TALON.getLogger().writeInfo('[SQL EXECUTE] 実行クエリ: ' + finalQuery); // クエリのログ

        var result;

        // クエリタイプに応じて実行処理を切り替える
        if (queryType === EXECUTE_KEY_SELECT) {
            result = TalonDbUtil.select(dbConnection, finalQuery);
        } else if (queryType === EXECUTE_KEY_UPDATE) {
            result = TalonDbUtil.update(dbConnection, finalQuery); // 処理件数を返す
        } else if (queryType === EXECUTE_KEY_INSERT) {
            result = TalonDbUtil.insert(dbConnection, finalQuery); // 処理件数を返す
        } else if (queryType === EXECUTE_KEY_DELETE) {
            result = TalonDbUtil.delete(dbConnection, finalQuery); // 処理件数を返す
        } else {
            throw new Error('Unsupported query type: ' + queryType);
        }

        // トランザクションのコミット（必要な場合）
        if (isTransactional) {
            TALON.getLogger().writeInfo('[TRANSACTION] トランザクションをコミットします');
            TalonDbUtil.commit(dbConnection);
        }

        return result; // SELECTの場合は結果セット、UPDATE, INSERT, DELETEの場合は処理件数を返す

    } catch (e) {
        // トランザクションのロールバック（必要な場合）
        if (isTransactional) {
            TALON.getLogger().writeInfo('[TRANSACTION] エラーが発生したためトランザクションをロールバックします: ' + e.toString());
            TalonDbUtil.rollback(dbConnection);
        }

        // エラーログ
        TALON.getLogger().writeInfo('[SQL ERROR] クエリ実行エラー: ' + e.toString());
        TALON.getLogger().writeInfo('[SQL ERROR] クエリ: ' + query);
        TALON.getLogger().writeInfo('[SQL ERROR] パラメータ: ' + JSON.stringify(params));

        throw e; // エラーを再スローして呼び出し元で処理
    }
}

/**
 * 半角カタカナを全角カタカナに変換する関数。
 * 入力された文字列中の半角カタカナを対応する全角カタカナに変換します。
 *
 * @param {String} str - 半角カタカナを含む文字列。
 * @returns {String} - 全角カタカナに変換された文字列。無効な入力には空文字列を返します。
 */
function kanaHalfToFull(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    var kanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        '｡': '。', '､': '、', 'ｰ': 'ー', '｢': '「', '｣': '」', '･': '・'
    };

    // 正規表現を使用して文字列中の半角カタカナを全角カタカナに置換
    var reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
    return str.replace(reg, function (match) {
        return kanaMap[match];
    })
        // 濁点と半濁点を全角に変換
        .replace(/ﾞ/g, '゛')
        .replace(/ﾟ/g, '゜');
}



/**
 * 日付と時間を yyyy/MM/dd hh:mm:ss 形式にフォーマットする
 *
 * @param {java.util.Date|string} END_DT - 日付オブジェクト or yyyy/MM/dd 形式の文字列
 * @param {string} END_JIKAN - hh:mm 形式の時間文字列
 * @returns {string} yyyy/MM/dd hh:mm:ss 形式の文字列
 */
function formatDateTime(END_DT, END_JIKAN) {
    var dateStr;
    var SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

    // END_DT が java.util.Date の場合、フォーマット変換
    if (END_DT instanceof java.util.Date) {
        var dateFormat = new SimpleDateFormat("yyyy/MM/dd");
        dateStr = dateFormat.format(END_DT);
    } else {
        dateStr = String(END_DT); // すでに yyyy/MM/dd 形式ならそのまま
    }

    return dateStr + " " + String(END_JIKAN) + ":00";
}

/**
 * 現在のデータが対象の工程コードに該当するかを判定します。
 * 
 * @param {Object} renkeiMap - 連携管理データマップ（工程コードなどの情報を含む）
 * @returns {Boolean} - 該当する場合は`true`、該当しない場合は`false`
 */
function isCurrentData(renkeiMap) {
    var userInfo = TALON.getUserInfoMap();
    var sql = "SELECT COUNT(*) AS CNT FROM COM_M_KOUTEI " +
        "WHERE TARGET_FUNC_ID = '" + userInfo['FUNC_ID'] + "' " +
        "AND KOUTEI_CD = '" + renkeiMap['SAGYO_KU'] + "'";
    var count = TalonDbUtil.select(TALON.getDbConfig(), sql)[0]['CNT'];
    return count === 0; // 該当する場合は`true`、該当しない場合は`false`
}


/**
 * 現在時刻をHHMM形式で取得します。
 * 
 * @returns {String} 現在時刻（HHMM形式）
 */
function getCurrentTime() {
    var sysDate = new Date();
    var hours = sysDate.getHours();
    var minutes = sysDate.getMinutes();
    return (hours < 10 ? '0' : '') + hours + (minutes < 10 ? '0' : '') + minutes;
}


/**
 * ユーザー情報を取得する
 *
 * @returns {Object} ユーザー情報（FUNC_ID, USER_ID）
 */
function getUserInfo() {
    var userData = TALON.getUserInfoMap();
    return {
        func_id: userData['FUNC_ID'],
        user_id: userData['USER_ID']
    };
}


/**
 * 汎用マスタ（TLN_M_HANYO_CODE）から表示用名称（DSP1）を取得します。
 *
 * @param {string} SIKIBETU_CODE - 識別コード
 * @param {string} KEY_CODE - キーコード
 * @returns {string|null} - DSP1の値（該当データがない場合は null）
 */
function _getHanyoMst(SIKIBETU_CODE, KEY_CODE) {
    var conn = TALON.getDbConfig();
    var tableName = "TLN_M_HANYO_CODE";
    var columns = ["KEY_CODE", "DSP1", "DSP2", "DSP3", "DSP4", "DSP5", "DSP_NO1"];
    var whereMap = {
        SIKIBETU_CODE: SIKIBETU_CODE,
        KEY_CODE: KEY_CODE
    };

    var row = selectOne(conn, tableName, columns, whereMap, null);
    return row ? row["DSP1"] : null;
}


function transferSingle(blockIndex, seqSiyosyo, seqKoutei, gyousu, listNameData, nameJkn) {

    var USER_ID = TALON.getUserInfoMap()['USER_ID'];
    TalonDbUtil.insert(TALON.getDbConfig(), "INSERT INTO KOUTEI_MEISAI_KOUMOKU(SIYOSYO_SEQ, KOUTEI_SEQ, GYOUSU, TOUROKU_ID, TOUROKU_DT, KOUSIN_ID, KOUSIN_DT) VALUES ('" + seqSiyosyo + "', '" + seqKoutei + "', " + gyousu + ", '" + USER_ID + "', SYSDATETIME(), '" + USER_ID + "', SYSDATETIME()) ");

    var lineDataMap = TALON.getBlockData_Card(blockIndex);
    for (var i = 0; i < 5; i++) {
        var nameData = listNameData[i];
        var value = lineDataMap[nameData];
        if (!nameData || !value) {
            continue;
        }
        TalonDbUtil.update(TALON.getDbConfig(), 'UPDATE KOUTEI_MEISAI_KOUMOKU SET DATA0' + (i + 1) + ' = \'' + value + '\' WHERE SIYOSYO_SEQ = \'' + seqSiyosyo + '\' AND KOUTEI_SEQ = \'' + seqKoutei + '\'');
    }

    var jkn = lineDataMap[nameJkn];
    TalonDbUtil.update(TALON.getDbConfig(), 'UPDATE KOUTEI_MEISAI_KOUMOKU SET TOKUSYU_JOKEN = \'' + jkn + '\' WHERE SIYOSYO_SEQ = \'' + seqSiyosyo + '\' AND KOUTEI_SEQ = \'' + seqKoutei + '\'');

}


function deleteKoumoku(SIYOSYO_SEQ, KOUTEI_SEQ) {
    TalonDbUtil.delete(TALON.getDbConfig(), "DELETE FROM KOUTEI_MEISAI_KOUMOKU WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ + "' AND KOUTEI_SEQ = '" + KOUTEI_SEQ + "' ");
}


function transferSiyoCommon() {

    var lineDataMap = TALON.getConditionData();
    var SIYOSYO_SEQ = lineDataMap['SIYOSYO_SEQ'];
    var KOUTEI_SEQ = lineDataMap['KOUTEI_SEQ'];
    TalonDbUtil.delete(TALON.getDbConfig(), "DELETE FROM KOUTEI_MEISAI_KOUMOKU WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ + "' AND KOUTEI_SEQ = '" + KOUTEI_SEQ + "' ");


    transferSingle(2, SIYOSYO_SEQ, KOUTEI_SEQ, 1, 'DATA0001', 'TOKUSYU_JOKEN00');
    transferSingle(2, SIYOSYO_SEQ, KOUTEI_SEQ, 2, 'DATA0101', 'TOKUSYU_JOKEN01');
    transferSingle(2, SIYOSYO_SEQ, KOUTEI_SEQ, 3, 'DATA0201', 'TOKUSYU_JOKEN02');

    transferMultiple(3, SIYOSYO_SEQ, KOUTEI_SEQ, 4, 20, 1, ['DATA01'], undefined);
    transferKoutei(SIYOSYO_SEQ, KOUTEI_SEQ);
}

function checkCount(listIndexBlock, countMax) {
    var counter = 0;
    for (var i = 0; i < listIndexBlock.length; i++) {
        var indexBlock = listIndexBlock[i];
        var itemBlockList = TALON.getBlockData_List(indexBlock);
        if (itemBlockList) {
            counter += itemBlockList.length;
        }
        TALON.getLogger().writeInfo('[行数確認]counter ' + counter);
    }
    return counter > countMax;
}



/**
 * テーブルのカラム名リストを取得
 * @param DBConn 接続先
 * @returns tableName テーブル名
 */
function _getColList(DBConn, tableName) {
    var sql = ""
        + " SELECT "
        + " COLUMN_NAME "
        + " ,DATA_TYPE "
        + " ,CHARACTER_MAXIMUM_LENGTH "
        + " ,IS_NULLABLE "
        + " FROM  "
        + " INFORMATION_SCHEMA.COLUMNS "
        + " WHERE "
        + " TABLE_NAME = '" + tableName + "'"
        + " AND TABLE_SCHEMA = 'dbo'";

    var mapList = TalonDbUtil.select(DBConn, sql);

    var colList = [];
    for (var i = 0; i < mapList.size(); i++) {
        var map = mapList.get(i);
        colList.push(String(map.get("COLUMN_NAME")));
    }

    return colList;
}

/***☆ モジュール用プライベート関数　☆***/

/**
 * 登録用の初期データを設定
 *
 * @param {Object} map - 初期化対象のマップ
 * @returns {Object} - 初期化後のマップ（同一オブジェクト）
 */
function _setInsInitData(map) {
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var user_id = userData['USER_ID'];
    var sysdate = new java.util.Date();

    // 登録・更新時の共通情報を設定
    map['FUNC_ID'] = func_id;
    map['CREATED_DATE'] = sysdate;
    map['CREATED_BY'] = user_id;
    map['CREATED_PRG_NM'] = func_id;
    map['UPDATED_DATE'] = sysdate;
    map['UPDATED_BY'] = user_id;
    map['UPDATED_PRG_NM'] = func_id;
    map['MODIFY_COUNT'] = 0;

    return map;
}

/**
 * 登録用の初期データを設定
 *
 * @returns {Object} - 初期化後のマップ（同一オブジェクト）
 */
function _setInsInitDataNonMap() {

    var map = new Array();
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var user_id = userData['USER_ID'];
    var sysdate = new java.util.Date();

    // 登録・更新時の共通情報を設定
    map['FUNC_ID'] = func_id;
    map['CREATED_DATE'] = sysdate;
    map['CREATED_BY'] = user_id;
    map['CREATED_PRG_NM'] = func_id;
    map['UPDATED_DATE'] = sysdate;
    map['UPDATED_BY'] = user_id;
    map['UPDATED_PRG_NM'] = func_id;
    map['MODIFY_COUNT'] = 0;

    return map;
}

/**
 * 更新用のデータを設定
 *
 * @param {Object} map - 更新対象のマップ
 * @returns {Object} - 更新情報を追加したマップ（同一オブジェクト）
 */
function _setUpdInitData(map) {
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var user_id = userData['USER_ID'];
    var sysdate = new java.util.Date();

    // 更新時の共通情報を設定
    map['UPDATED_DATE'] = sysdate;
    map['UPDATED_BY'] = user_id;
    map['UPDATED_PRG_NM'] = func_id;

    return map;
}

/**
 * テーブルのカラム名リストを取得
 * @param {java.sql.Connection} DBConn - 接続先
 * @param {string} tableName - 対象テーブル名（大文字英数字とアンダースコアのみ）
 * @returns {Array.<string>} カラム名リスト
 */
function _getColList(DBConn, tableName) {

    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
        throw new Error("Invalid table name: " + tableName);
    }
    var sql = [
        "SELECT",
        " COLUMN_NAME",
        " ,DATA_TYPE",
        " ,CHARACTER_MAXIMUM_LENGTH",
        " ,IS_NULLABLE",
        "FROM INFORMATION_SCHEMA.COLUMNS",
        "WHERE TABLE_NAME = '" + tableName + "'",
        "AND TABLE_SCHEMA = 'dbo'"
    ].join(" ");

    var mapList = TalonDbUtil.select(DBConn, sql);
    var colList = [];

    for (var i = 0; i < mapList.size(); i++) { // ここは環境による
        var map = mapList.get(i);
        colList.push(String(map.get("COLUMN_NAME")));
    }

    return colList;
}

/**
 * SQLパラメータの安全性をチェックする（シングルクォート禁止）
 *
 * @param {string} param - SQLに渡すパラメータ
 * @throws {Error} 不正な値が渡された場合に例外をスロー
 */
function chkSqlParam(param) {
    if (param == null) {
        return; // null/undefinedなら無視（必要ならエラー化も可）
    }

    var strParam = String(param);

    if (strParam.indexOf("'") !== -1) {
        TALON.addErrorMsg("引数の受け渡し値が不正です。 param=[" + strParam + "]");
        TALON.setIsSuccess(false);
        throw new Error("SQLパラメータに不正な文字が含まれています。");
    }
}

/***☆ 一意になるキー項目で特定テーブルを検索する機能群 ☆***/

/**
 * 指定された仕様書SEQに対応する仕様書メイン情報を取得
 *
 * @param {string|number} SIYOSYO_SEQ - 対象の仕様書SEQ
 * @returns {Object|null} 仕様書メイン情報（存在しない場合は null）
 */
function getSiyosyoMain(SIYOSYO_SEQ) {

    chkSqlParam(SIYOSYO_SEQ);
    var whereMap = {}
    whereMap['SIYOSYO_SEQ'] = SIYOSYO_SEQ;
    return selectOne(TALON.getDbConfig(), "SIYOSYO_MAIN", null, whereMap, null)
}

/**
 * 指定された仕様書SEQに対応する仕様書メイン情報を取得
 *
 * @param {string|number} SIYOSYO_SEQ - 対象の仕様書SEQ
 * @returns {Object|null} 仕様書メイン情報（存在しない場合は null）
 */
function getSiyosyoMainWork(SIYOSYO_SEQ) {

    chkSqlParam(SIYOSYO_SEQ);
    var whereMap = {}
    whereMap['SIYOSYO_SEQ'] = SIYOSYO_SEQ;
    return selectOne(TALON.getDbConfig(), "SIYOSYO_MAIN_WORK", null, whereMap, null)
}


/***☆ 共通部品 ☆***/
/**
 * 作業区に紐づく工程マスタの行を取得する。
 *
 * @param {string} SAGYO_KU - 作業区コード
 * @returns {Object|null} 工程マスタ情報（存在しない場合はnull）
 */
function getKouteiMst(SAGYO_KU) {
    var whereMap = {}
    whereMap['KOUTEI_CD'] = SAGYO_KU;
    return selectOne(TALON.getDbConfig(), "COM_M_KOUTEI", null, whereMap, null);
}

/**
 * 仕様書SEQと工程コードに基づき、現在の工程順を取得する
 *
 * @param {string|number} SIYOSYO_SEQ - 仕様書SEQ
 * @param {string} koutei_cd - 工程コード
 * @returns {number} 工程順（存在しない場合は0）
 */
function _getCurrentKouteiJun(SIYOSYO_SEQ, koutei_cd) {
    chkSqlParam(String(SIYOSYO_SEQ));
    chkSqlParam(koutei_cd);

    var whereMap = {
        "SIYOSYO_SEQ": SIYOSYO_SEQ,
        "KOUTEI_CD": koutei_cd
    };

    var record = selectOne(TALON.getDbConfig(), "KOUTEIJUN_KANRI", ["KOUTEI_JUN"], whereMap, null);
    if (!record) {
        return 0;
    }

    return Number(record['KOUTEI_JUN']);
}

/**
 * SQL Server向けに単一レコードをSELECTする
 * 
 * @param {Object} conn - DB接続設定
 * @param {string} tableName - テーブル名
 * @param {Array<string>} [columns] - 取得カラム（nullまたは空なら *）
 * @param {Object} whereMap - WHERE条件（必須）
 * @param {string} [orderBy] - ORDER BY句（省略可能）
 * @returns {Object|null} 取得できたレコード、なければnull
 */
function selectOne(conn, tableName, columns, whereMap, orderBy) {
    var sql = buildSimpleSelectSQL(tableName, columns, whereMap, orderBy, 1);
    var list = TalonDbUtil.select(conn, sql);
    if (!list || list.length === 0) {
        return null;
    }
    return list[0];
}

/**
 * SQL Server向けに複数レコードをSELECTする
 * 
 * @param {Object} conn - DB接続設定
 * @param {string} tableName - テーブル名
 * @param {Array<string>} [columns] - 取得カラム（nullまたは空なら *）
 * @param {Object} whereMap - WHERE条件（必須）
 * @param {string} [orderBy] - ORDER BY句（省略可能）
 * @returns {Array<Object>} 取得できたレコードリスト（0件なら空配列）
 */
function selectList(conn, tableName, columns, whereMap, orderBy) {
    var sql = buildSimpleSelectSQL(tableName, columns, whereMap, orderBy, null); // TOP制限なし
    var list = TalonDbUtil.select(conn, sql);
    return list || [];
}

/**
 * 単純なSELECT文（SQL Server向け / WHERE必須 / 実パラメータ埋め込み / SQL文字列を直接返却）
 *
 * @param {string} tableName - テーブル名
 * @param {Array<string>} [columns] - 取得カラムリスト（nullまたは空なら *）
 * @param {Object} whereMap - WHERE条件（必須、JavaのMapにも対応）
 * @param {string} [orderBy] - ORDER BY句
 * @param {number} [top] - 取得件数制限（TOP句）
 * @returns {string} 完成したSQL文字列
 */
function buildSimpleSelectSQL(tableName, columns, whereMap, orderBy, top) {
    if (!tableName) {
        throw new Error("テーブル名は必須です。");
    }
    if (isEmptyMap(whereMap)) {
        throw new Error("WHERE条件が必須です。");
    }

    var isNumeric = function (value) {
        if (typeof value === "number") return true;
        if (value === null || value === undefined) return false;
        try {
            var clsName = value.getClass().getName();
            return clsName === "java.math.BigDecimal"
                || clsName === "java.lang.Integer"
                || clsName === "java.lang.Long"
                || clsName === "java.lang.Double";
        } catch (e) {
            return false;
        }
    };

    var selectClause = "SELECT ";
    if (top && typeof top === "number") {
        selectClause += "TOP " + top + " ";
    }

    selectClause += (!columns || columns.length === 0) ? "*" : columns.join(", ");
    var sql = selectClause + " FROM " + tableName;

    var whereParts = [];

    var keyIter = getMapKeys(whereMap);
    for (var i = 0; i < keyIter.length; i++) {
        var key = keyIter[i];
        var value = whereMap[key];

        if (value === null || value === undefined) {
            whereParts.push(key + " IS NULL");
        } else if (isNumeric(value)) {
            whereParts.push(key + " = " + String(value));
        } else {
            var escaped = String(value).replace(/'/g, "''");
            whereParts.push(key + " = '" + escaped + "'");
        }
    }

    sql += " WHERE " + whereParts.join(" AND ");

    if (orderBy) {
        sql += " ORDER BY " + orderBy;
    }

    return sql;
}

/**
 * Mapが空かどうかを判定（Java Map対応）
 * @param {Object} map
 * @returns {boolean}
 */
function isEmptyMap(map) {
    if (!map) return true;
    if (typeof map.size === "function") {
        return map.size() === 0;
    }
    if (typeof map.keySet === "function" && typeof map.keySet().isEmpty === "function") {
        return map.keySet().isEmpty();
    }
    return Object.keys(map).length === 0;
}

/**
 * Java MapまたはJSオブジェクトのキー一覧を配列で取得
 * @param {Object} map
 * @returns {Array<string>}
 */
function getMapKeys(map) {
    if (typeof map.keySet === "function" && typeof map.get === "function") {
        var iter = map.keySet().iterator();
        var result = [];
        while (iter.hasNext()) {
            var key = iter.next();
            result.push(String(key));
        }
        return result;
    }
    return Object.keys(map);
}

/**
 * 指定したテーブルと条件に基づいて件数（COUNT）を取得します。
 *
 * @param {Object} conn - TALONのDBコネクションオブジェクト
 * @param {string} tableName - 対象のテーブル名
 * @param {Object} whereMap - WHERE句の条件（キー: カラム名、値: 条件値）
 * @returns {number} 件数（取得できなかった場合は0）
 */
function getCount(conn, tableName, whereMap) {
    if (!conn) {
        TALON.addErrorMsg("getCount: DBコネクションが未指定です。");
        return 0;
    }

    if (!tableName || typeof tableName !== 'string') {
        TALON.addErrorMsg("getCount: テーブル名が不正です。");
        return 0;
    }

    var whereSql = "";
    var keys = Object.keys(whereMap || {});
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var val = String(whereMap[key]).replace(/'/g, "''"); // SQLインジェクション対策
        if (i > 0) {
            whereSql += " AND ";
        }
        whereSql += key + " = '" + val + "'";
    }

    var sql = "SELECT COUNT(*) AS CNT FROM " + tableName;
    if (whereSql !== "") {
        sql += " WHERE " + whereSql;
    }

    var result = TalonDbUtil.select(conn, sql);

    if (!result || result.length === 0) {
        return 0;
    }

    var cnt = result[0]["CNT"];
    return cnt != null ? Number(cnt) : 0;
}

/**
 * 指定テーブルに1件のレコードを挿入する（拡張版、TALONログ対応）
 *
 * @param {Object} conn - DBコネクション（TALON.getDbConfig()などで取得）
 * @param {string} tableName - 挿入対象のテーブル名
 * @param {Object} map - 挿入する1件分のデータマップ
 * @param {boolean} [enableLog=false] - ログ出力を行うか（trueで出力）
 * @returns {boolean} 成功時は true、失敗時は例外をスロー
 * @throws {Error} 挿入エラーが発生した場合
 */
function insertByMapEx(conn, tableName, map, enableLog) {
    var logger = TALON.getLogger();

    if (isEmptyMap(map)) {
        if (enableLog) {
            logger.writeDebug("[SKIP] insert対象マップが空です → テーブル: " + tableName);
        }
        return false;
    }

    chkSqlParam(tableName);

    try {
        var colList = _getColList(conn, tableName);

        if (enableLog) {
            logger.writeDebug("[INFO] insert開始 → テーブル: " + tableName);
        }

        TalonDbUtil.insertByMap(conn, tableName, map, colList);

        if (enableLog) {
            logger.writeDebug("[SUCCESS] insert完了 → 1件挿入");
        }

        return true;

    } catch (e) {
        logger.writeDebug("[ERROR] insert失敗 → テーブル: " + tableName + " / エラー: " + e.message);
        throw e;
    }
}

/**
 * JavaScript または Java Map が空かどうか判定
 *
 * @param {Object} map - 対象マップ
 * @returns {boolean} 空なら true
 */
function isEmptyMap(map) {
    if (!map) return true;

    // JavaのMapなら isEmpty() を使う
    if (typeof map.isEmpty === 'function') {
        return map.isEmpty();
    }

    // JavaScriptのObjectなら Object.keys()
    return Object.keys(map).length === 0;
}

/**
 * SQL用に文字列をエスケープする（シングルクォート対応）
 *
 * @param {string} str - エスケープ対象文字列
 * @returns {string} エスケープ済み文字列
 */
function escapeSqlString(str) {
    if (str === null || str === undefined) {
        return str;
    }
    if (typeof str !== "string") {
        str = String(str);
    }
    return str.replace(/'/g, "''");
}

/**
 * 指定テーブルの1件レコードを更新する共通関数（TALONログ対応）
 * ※ where句の値は updateMap に含める前提で、キー名のみを別指定します。
 *
 * @param {Object} conn - DBコネクション（例：TALON.getDbConfig()）
 * @param {string} tableName - 更新対象のテーブル名
 * @param {Object} updateMap - 更新対象の値（キー：カラム名、値：更新内容＋where句の条件値）
 * @param {Array<string>} whereKeys - WHERE句のキー名（updateMapに対応するカラム名の配列）
 * @param {boolean} [enableLog=false] - ログ出力を行うか（trueでTALONログ出力）
 * @returns {number} 更新件数（通常1件）
 * @throws {Error} 実行時にエラーが発生した場合は throw
 */
function updateByMapEx(conn, tableName, updateMap, whereKeys, enableLog) {
    var logger = TALON.getLogger();

    if (isEmptyMap(updateMap)) {
        if (enableLog) {
            logger.writeDebug("[SKIP] insert対象マップが空です → テーブル: " + tableName);
        }
        return 0;
    }

    chkSqlParam(tableName);

    try {
        var colList = _getColList(conn, tableName);

        var whereList = [];
        for (var i = 0; i < whereKeys.length; i++) {
            whereList.push([null, '=', whereKeys[i]]);
        }

        if (enableLog) {
            logger.writeDebug("[INFO] update開始 → テーブル: " + tableName + " 条件キー: " + JSON.stringify(whereKeys));
        }

        var count = TalonDbUtil.updateByMap(conn, tableName, updateMap, colList, whereList);

        if (enableLog) {
            logger.writeDebug("[SUCCESS] update完了 → " + count + " 件 テーブル: " + tableName);
        }

        return count;

    } catch (e) {
        logger.writeDebug("[ERROR] update失敗 → テーブル: " + tableName + " / エラー: " + e.message);
        throw e;
    }
}

/**
 * 指定テーブルから1件のレコードを削除する（TALONログ対応）
 *
 * @param {Object} conn - DB接続オブジェクト（例：TALON.getDbConfig()）
 * @param {string} tableName - 削除対象のテーブル名
 * @param {Object} map - WHERE条件に使う値（カラム名と値のペア）
 * @param {Array<string>} whereKeys - WHERE条件とするカラム名一覧
 * @param {boolean} [enableLog=false] - true の場合はログ出力あり
 * @returns {number} 削除件数
 */
function deleteByMapEx(conn, tableName, map, whereKeys, enableLog) {
    var logger = TALON.getLogger();

    if (isEmptyMap(map)) {
        if (enableLog) {
            logger.writeDebug("[SKIP] insert対象マップが空です → テーブル: " + tableName);
        }
        return 0;
    }

    chkSqlParam(tableName);

    try {
        // whereList構築（値は map から取得、TALON仕様）
        var whereList = [];
        for (var i = 0; i < whereKeys.length; i++) {
            whereList.push([null, '=', whereKeys[i]]);
        }

        if (enableLog) {
            logger.writeDebug("[INFO] delete開始 → テーブル: " + tableName + " 条件キー: " + JSON.stringify(whereKeys));
        }

        var count = TalonDbUtil.deleteByMap(conn, tableName, map, whereList);

        if (enableLog) {
            logger.writeDebug("[SUCCESS] delete完了 → " + count + " 件 テーブル: " + tableName);
        }

        return count;

    } catch (e) {
        logger.writeDebug("[ERROR] delete失敗 → テーブル: " + tableName + " / エラー: " + e.message);
        throw e;
    }
}

/**
 * 層数が奇数の場合に +1 して偶数に補正する。
 *
 * @param {number} sousu - 層数
 * @returns {number} 偶数化された層数
 */
function _adjustSousuToEven(sousu) {
    if (sousu % 2 !== 0) {
        return sousu + 1;
    }
    return sousu;
}
/**
 * 当日日付を指定フォーマット（yyyy/MM/ddまたはyyyy-MM-dd）で取得する
 * 
 * @param {string} separator - 区切り文字（"/" または "-"）
 * @returns {string} フォーマット済み日付文字列
 */
function getTodayFormattedDate(separator) {
    separator = separator || "/"; // デフォルトは "/"

    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = ('0' + (today.getMonth() + 1)).slice(-2); // 月は0始まりなので+1
    var dd = ('0' + today.getDate()).slice(-2);

    return yyyy + separator + mm + separator + dd;
}


/**
 * 任意の開始日から終了日までの日付リストを指定フォーマット（yyyy/MM/ddまたはyyyy-MM-dd）で取得する
 * 
 * @param {string} startDateStr - 開始日（"yyyy/MM/dd"または"yyyy-MM-dd"形式）
 * @param {string} endDateStr - 終了日（"yyyy/MM/dd"または"yyyy-MM-dd"形式）
 * @param {string} separator - 出力時の区切り文字（"/" または "-"）
 * @returns {Array<string>} 日付文字列リスト
 * @throws {Error} 日付のパース失敗、開始日＞終了日の場合は例外
 */
function getDatesBetween(startDateStr, endDateStr, separator) {
    separator = separator || "/"; // デフォルトは"/"

    function parseDate(str) {
        var parts = str.split(/\/|-/); // "/"か"-"で分割
        if (parts.length !== 3) {
            throw new Error("Invalid date format: " + str);
        }
        return new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
    }

    var startDate = parseDate(startDateStr);
    var endDate = parseDate(endDateStr);

    if (startDate > endDate) {
        throw new Error("開始日は終了日より前である必要があります。");
    }

    var result = [];
    var current = new Date(startDate);

    while (current <= endDate) {
        var yyyy = current.getFullYear();
        var mm = ('0' + (current.getMonth() + 1)).slice(-2);
        var dd = ('0' + current.getDate()).slice(-2);
        result.push(yyyy + separator + mm + separator + dd);

        current.setDate(current.getDate() + 1); // 1日進める
    }

    return result;
}

/**
 * TPIM0002（メール設定マスタ）から指定CONFIG_IDの構成を1件取得します。
 *
 * @param {string} configId CONFIG_ID（主キー）
 * @returns {Object|null} 結果行（Map形式）、見つからなければ null
 */
function getMailConfigMst(configId) {

    var tableName = "TPIM0002";
    var columns = ["*"];
    var whereMap = {
        "CONFIG_ID": configId
    };

    return selectOne(TALON.getDbConfig(), tableName, columns, whereMap, null);
}


/**
 * マップに安全に値を設定（null/undefined → 空文字）
 */
function putMapValue(map, key, value) {
    map[key] = (value === null || value === undefined) ? "" : String(value);
}

function checkByteLength(str, maxBytes) {

    if (!str) {
        return;    // 引数がない場合は正常
    }

    // SJISやShift_JIS的な考え方：全角2バイト、半角1バイトで計算
    var totalBytes = 0;
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        // 半角英数字・記号（ASCII）: 0x00〜0x7F → 1バイト
        // 半角カナ: 0xFF61〜0xFF9F → 1バイト
        if ((code >= 0x00 && code <= 0x7F) || (code >= 0xFF61 && code <= 0xFF9F)) {
            totalBytes += 1;
        } else {
            totalBytes += 2; // それ以外は全角とみなす
        }
    }

    if (totalBytes > maxBytes) {
        throw new Error("文字列が" + maxBytes + "バイトを超えています（" + totalBytes + "バイト）: " + str);
    }

    return;
}


// === 内部定数 ===
var ALGORITHM = 'AES';
var TRANSFORMATION = 'AES/CBC/PKCS5Padding';
var CHARSET = 'UTF-8';

var CIPHER_KEY = [67, -60, 14, 20, -28, -3, 77, 49, 9, -1, -109, 76, 57, -79, -1, 108, 108, 119, -13, 115, -28, 31, 30, -127, -61, 76, 85, 65, -26, -49, 18, 106];
var INIT_VECTOR = [113, 74, 3, -76, 55, -83, 101, 2, 45, 41, 23, -44, 110, 69, -9, -50];

var SECRET_KEY = new javax.crypto.spec.SecretKeySpec(CIPHER_KEY, ALGORITHM);
var IV_PARAM = new javax.crypto.spec.IvParameterSpec(INIT_VECTOR);

// === 内部用 共通処理 ===
function _encryptAES(plainText, key, iv) {
    var cipher = javax.crypto.Cipher.getInstance(TRANSFORMATION);
    cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, key, iv);
    return cipher.doFinal(plainText.getBytes(CHARSET));
}

function _decryptAES(encryptedBytes, key, iv) {
    var cipher = javax.crypto.Cipher.getInstance(TRANSFORMATION);
    cipher.init(javax.crypto.Cipher.DECRYPT_MODE, key, iv);
    return cipher.doFinal(encryptedBytes);
}

// === 外部向けAPI（シンプル）===

/**
 * テキストを暗号化してバイト配列として返す
 * @param {string} text 平文テキスト
 * @returns {byte[]} 暗号バイト列
 */
function encryptText(text) {
    return _encryptAES(text, SECRET_KEY, IV_PARAM);
}

/**
 * 暗号バイト列を復号して文字列で返す
 * @param {byte[]} encrypted 暗号バイト列
 * @returns {string} 復号後の文字列
 */
function decryptText(encrypted) {
    var decryptedBytes = _decryptAES(encrypted, SECRET_KEY, IV_PARAM);
    return new java.lang.String(decryptedBytes, CHARSET);
}

function decodeBase64(base64) {
    var encryptedBytes = java.util.Base64.getDecoder().decode(base64);
    return decryptText(encryptedBytes);
}

function getEncryptedTokenFromTable() {
    var conn = TALON.getDbConfig();
    var whereMap = { ID: '1' }; // 条件は任意
    var map = selectOne(conn, 'SIYOM011', null, whereMap);

    return map ? map['API_TOKEN'] : null; // 暗号化済byte[]
}

function setSeizoSashizuData() {

}

/**
 * 指定IDに該当するNIPPO_LOGIC_VIEWの1件データを取得する。
 *
 * @param {string|number} ID - 対象のID
 * @returns {Object|null} 該当レコード（存在しない場合は null）
 */
function _getNippoData(ID) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        ID: ID
    };

    return selectOne(conn, 'NIPPO_LOGIC_VIEW', null, whereMap, null);
}

/**
 * 日報情報を取得
 * @param ID 
 */
function getNippoData(ID) {
    chkSqlParam(ID);
    var whereMap = {}
    whereMap['ID'] = ID;
    return selectOne(TALON.getDbConfig(), "NP_T_INPUT_COMMON", null, whereMap, null);
}

/**
 * 次工程情報を取得
 *
 * @param {string|number} ID - 対象ID
 * @returns {Object|null} 次工程情報（存在しない場合はnull）
 */
function getHikitugiData(ID) {

    chkSqlParam(ID);
    var conn = TALON.getDbConfig();
    var whereMap = {}
    whereMap['ID'] = ID;
    return selectList(conn, "NIPPO_HIKITUGI_VIEW", null, whereMap, null);
}

/**
 * 工程進捗を更新する
 *
 * @param {string} LOT_NO - 対象のロット番号
 * @param {string} END_DT - 完了日 (フォーマット: yyyy/MM/dd)
 * @param {string} END_JIKAN - 完了時間 (フォーマット: hh:mm)
 * @param {number} GOUKAKU_PCS - 合格数 (数値)
 */
function setKoteiShincyoku() {
    var mapColumnList = getTargetKoteiCd();

    if (mapColumnList.length === 0) {

        return
    }

    var mapColumn = mapColumnList[0]

    var lineDataMap = TALON.getTargetData();
    var LOT_NO = lineDataMap['LOT_NO']
    var END_DT = lineDataMap['END_DT']
    var END_JIKAN = lineDataMap['END_JIKAN']
    var GOUKAKU_PCS = lineDataMap['GOUKAKU_PCS_SUU']

    if (!END_DT || !END_JIKAN) {

        return
    }

    var DSP2 = mapColumn['DSP2']
    var DSP3 = mapColumn['DSP3']

    var targetMap = new Array();

    var userInfoMap = TALON.getUserInfoMap();
    var funcid = userInfoMap['FUNC_ID'];
    if (funcid === 'NIPPO_INPUT_00') {
        targetMap[DSP2] = new java.util.Date();

        var sql = " SELECT TOP 1 TOUNYU_PCS_SUU FROM NP_T_TEHAI_JOHO WHERE LOT_NO = '" + LOT_NO + "'"
        var TOUNYU_PCS_SUU = TalonDbUtil.select(TALON.getDbConfig(), sql)[0]['TOUNYU_PCS_SUU'];

        targetMap[DSP3] = (isNaN(TOUNYU_PCS_SUU) ? 0 : TOUNYU_PCS_SUU)
    } else {

        targetMap[DSP2] = formatDateTime(END_DT, END_JIKAN)
        targetMap[DSP3] = (isNaN(GOUKAKU_PCS) ? 0 : GOUKAKU_PCS)
    }

    targetMap['LOT_NO'] = LOT_NO;
    var whereList = new Array();
    whereList.push([null, '=', 'LOT_NO']);

    updNP_T_KOTEI_KANRIbyMap(targetMap, whereList)

}

/**
 * 
 * @param kouteiMap 
 */
function insKouteiBaseInfo(kouteiMap, SIYOSYO_SEQ) {

    var sql = " SELECT COUNT(*) CNT FROM NP_T_KOTEI_KANRI WHERE LOT_NO ='" + kouteiMap['ﾛｯﾄ№'] + "'"
    var CNT = TalonDbUtil.select(TALON.getDbConfig(), sql)[0]['CNT'];

    if (CNT > 0) {

        return
    }

    kouteiMap['LOT_NO'] = kouteiMap['ﾛｯﾄ№'];
    kouteiMap['SIYOSYO_SEQ'] = SIYOSYO_SEQ;

    var col = [
        'LOT_NO'
        , 'NP1_SAGYO_DT'
        , 'NP2_SAGYO_DT'
        , 'NP3_SAGYO_DT'
        , 'NP4_SAGYO_DT'
        , 'NP5_SAGYO_DT'
        , 'NP6_SAGYO_DT'
        , 'NP7_SAGYO_DT'
        , 'NP8_SAGYO_DT'
        , 'NP9_SAGYO_DT'
        , 'NP10_SAGYO_DT'
        , 'NP11_SAGYO_DT'
        , 'NP12_SAGYO_DT'
        , 'NP13_SAGYO_DT'
        , 'NP14_SAGYO_DT'
        , 'NP15_SAGYO_DT'
        , 'NP16_SAGYO_DT'
        , 'NP17_SAGYO_DT'
        , 'NP18_SAGYO_DT'
        , 'NP19_SAGYO_DT'
        , 'NP20_SAGYO_DT'
        , 'NP21_SAGYO_DT'
        , 'NP22_SAGYO_DT'
        , 'NP23_SAGYO_DT'
        , 'NP24_SAGYO_DT'
        , 'NP25_SAGYO_DT'
        , 'NP26_SAGYO_DT'
        , 'NP27_SAGYO_DT'
        , 'NP28_SAGYO_DT'
        , 'NP29_SAGYO_DT'
        , 'NP30_SAGYO_DT'
        , 'NP1_TONYU_SUU'
        , 'NP2_TONYU_SUU'
        , 'NP3_TONYU_SUU'
        , 'NP4_TONYU_SUU'
        , 'NP5_TONYU_SUU'
        , 'NP6_TONYU_SUU'
        , 'NP7_TONYU_SUU'
        , 'NP8_TONYU_SUU'
        , 'NP9_TONYU_SUU'
        , 'NP10_TONYU_SUU'
        , 'NP11_TONYU_SUU'
        , 'NP12_TONYU_SUU'
        , 'NP13_TONYU_SUU'
        , 'NP14_TONYU_SUU'
        , 'NP15_TONYU_SUU'
        , 'NP16_TONYU_SUU'
        , 'NP17_TONYU_SUU'
        , 'NP18_TONYU_SUU'
        , 'NP19_TONYU_SUU'
        , 'NP20_TONYU_SUU'
        , 'NP21_TONYU_SUU'
        , 'NP22_TONYU_SUU'
        , 'NP23_TONYU_SUU'
        , 'NP24_TONYU_SUU'
        , 'NP25_TONYU_SUU'
        , 'NP26_TONYU_SUU'
        , 'NP27_TONYU_SUU'
        , 'NP28_TONYU_SUU'
        , 'NP29_TONYU_SUU'
        , 'NP30_TONYU_SUU'
        , 'CREATED_DATE'
        , 'CREATED_BY'
        , 'CREATED_PRG_NM'
        , 'UPDATED_DATE'
        , 'UPDATED_BY'
        , 'UPDATED_PRG_NM'
        , 'MODIFY_COUNT'
        , 'SIYOSYO_SEQ'
        , 'NP0_SAGYO_DT'
        , 'NP0_TONYU_SUU'
        , 'AVI1_SAGYO_DT'
        , 'AVI1_TONYU_SUU'
        , 'AVI2_SAGYO_DT'
        , 'AVI2_TONYU_SUU'
        , 'ASTER_SYUKKA_DT'
        , 'ASTER_IRAI_DT'
        , 'ASTER_UKEIRE_DT'
        , '基準日'
        , '受注伝票番号'
        , '客先注番'
        , '出荷予定日'
        , '出荷指示番号'
        , '出荷予定数'
        , '投入日'
        , 'ﾛｯﾄ№'
        , '得意先CD'
        , '得意先名'
        , '新規･ﾘﾋﾟｰﾄ'
        , 'ｺｰｽ'
        , '品目CD'
        , '品目名'
        , 'ﾜｰｸｻｲｽﾞ'
        , '層数名'
        , '表面処理'
        , 'Pcs/ｼｰﾄ'
        , '現在庫数(PCS)'
        , '計画良品数(PCS)'
        , '計画不良数(PCS)'
        , '計画投入数(PCS)'
        , '投入PN数'
        , '投入㎡数'
        , '引当数(PCS)'
        , '仕様書No'
        , '検査装置'
        , 'ピン間'
        , 'ホルダー'
    ]

    TalonDbUtil.insertByMap(TALON.getDbConfig(), 'NP_T_KOTEI_KANRI', kouteiMap, col);
}

/**
 * 機能IDとロット紐づいたデータを抽出する。
 * 
 * @param {*} LOT_NO 
 * @param {*} func_id 
 */
function setIjoData(LOT_NO, func_id) {

    var traceFunc_id = getTargetId(func_id)

    if (!traceFunc_id) {

        return;
    }

    // 書込み処理
    setDaihyoLotInfo(LOT_NO, traceFunc_id, func_id);
    setKanrenLotInfo(LOT_NO, traceFunc_id, func_id);
}


/**
 * 指定された機能ID (func_id) に対応するターゲットID (KEY_CODE) を取得する。
 * 
 * <p>
 * この関数は、マスタテーブル 'TLN_M_HANYO_CODE' を検索し、<br>
 * 'SIKIBETU_CODE' が 'VIEW_TARGETFUNC_ID'、かつ 'DSP2' が引数 func_id に一致するレコードを取得します。<br>
 * 該当レコードが存在する場合はその 'KEY_CODE' を返却し、存在しない場合は null を返します。
 * </p>
 *
 * @param {string} func_id 検索対象の機能ID
 * @returns {string|null} 対応するターゲットID (KEY_CODE)、存在しない場合は null
 */
function getTargetId(func_id) {
    var whereMap = {
        'SIKIBETU_CODE': 'VIEW_TARGETFUNC_ID',
        'DSP2': func_id
    };

    var result = selectOne(TALON.getDbConfig(), 'TLN_M_HANYO_CODE', null, whereMap, null);
    return result ? result['KEY_CODE'] : null;
}


/**
 * 代表ロットに紐づく情報を書き込み
 * @param {*} LOT_NO 
 * @param {*} func_id 
 */
function setKanrenLotInfo(LOT_NO, func_id, func_id2) {

    var sql = ""
        + " SELECT "
        + "     RS_T_IJO_HOKOKUSYO.ID "
        + "     ,RS_T_IJO_TAISHO.LOT_NO "
        + " FROM "
        + "     RS_T_IJO_HOKOKUSYO "
        + " INNER JOIN RS_T_IJO_TAISHO "
        + "     ON RS_T_IJO_TAISHO.IJO_NO = RS_T_IJO_HOKOKUSYO.IJO_NO "
        + " INNER JOIN RS_T_IJO_EIKYO "
        + "     ON RS_T_IJO_EIKYO.IJO_NO = RS_T_IJO_HOKOKUSYO.IJO_NO "
        + "     AND RS_T_IJO_EIKYO.TAISYO_KOTEI LIKE '%" + func_id + "%' "
        + " WHERE "
        + "     RS_T_IJO_TAISHO.LOT_NO = '" + LOT_NO + "'"
        + " AND NOT EXISTS( SELECT 'X' FROM NP_T_IJO_KAKUNIN WHERE ID = RS_T_IJO_HOKOKUSYO.ID AND FUNC_ID = '" + func_id2 + "')"

    setNP_T_IJO_KAKUNIN(sql);
}

/**
 * 関連ロットに紐づく情報を書き込み
 * @param {*} LOT_NO 
 * @param {*} func_id 
 */
function setDaihyoLotInfo(LOT_NO, func_id, func_id2) {

    var sql = ""
        + " SELECT "
        + "     RS_T_IJO_HOKOKUSYO.ID "
        + "     ,RS_T_IJO_HOKOKUSYO.LOT_NO "
        + " FROM "
        + "     RS_T_IJO_HOKOKUSYO "
        + " INNER JOIN RS_T_IJO_EIKYO "
        + "     ON RS_T_IJO_EIKYO.IJO_NO = RS_T_IJO_HOKOKUSYO.IJO_NO "
        + "     AND RS_T_IJO_EIKYO.TAISYO_KOTEI LIKE '%" + func_id + "%' "
        + " WHERE "
        + "     RS_T_IJO_HOKOKUSYO.LOT_NO = '" + LOT_NO + "'"
        + " AND NOT EXISTS( SELECT 'X' FROM NP_T_IJO_KAKUNIN WHERE ID = RS_T_IJO_HOKOKUSYO.ID AND FUNC_ID = '" + func_id2 + "')"

    setNP_T_IJO_KAKUNIN(sql);
}



/**
 * 異常確認データ書き込み
 * @param {*} sql 
 * @returns 
 */
function setNP_T_IJO_KAKUNIN(sql) {

    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    if (mapList.length == 0) {

        return;
    }

    for (var i = 0; i < mapList.length; i++) {

        var map = mapList[i];
        insNP_T_IJO_KAKUNIN(map)
    }

}

/**
 * 異常確認情報をテーブル 'NP_T_IJO_KAKUNIN' に書き込む。
 * 
 * <p>
 * 入力マップ (map) を初期化し、'NP_T_IJO_KAKUNIN' テーブルにレコード挿入します。<br>
 * 挿入時にはログ出力 (enableLog=true) を有効にします。
 * </p>
 *
 * @param {Object} map 登録対象のデータマップ
 */
function insNP_T_IJO_KAKUNIN(map) {
    var insMap = _setInsInitData(map);
    var tableName = 'NP_T_IJO_KAKUNIN';
    var conn = TALON.getDbConfig();
    insertByMapEx(conn, tableName, insMap, true);
}


/**
 * 日報初期化処理（検索前）
 * 
 * IDとロット番号から状態を判断し、検索条件を設定します。
 * 検索一覧画面からの遷移や、初期状態、再作チェックなどに応じて制御を行います。
 */
function commonNippoInit_kensakumae() {
    var initMap = TALON.getConditionData();
    var ID = initMap['ID'];
    var SEARCH_LOT_NO = initMap['SEARCH_LOT_NO'];
    var func_id = TALON.getUserInfoMap()['FUNC_ID'];
    TALON.putBindValue('SEARCH_FUNC_ID', func_id);

    if (ID && SEARCH_LOT_NO) {
        setIjoData(SEARCH_LOT_NO, func_id);
        return;
    }

    var LOT_NO = getLotNoFromBlock();
    TALON.setSearchConditionData("SEARCH_LOT_NO", LOT_NO, "");

    if (isAVI(func_id)) {
        var id = getLatestId("NP_T_MOKUSHI", "LOT_NO = '" + LOT_NO + "'");
        if (id) {
            TALON.setSearchConditionData("ID", id, "");
            TALON.setSearchConditionData("PID", id, "");
            return;
        }
    }

    setIjoData(LOT_NO, func_id);

    if (isEtOrAOI(func_id)) {
        if (existsSaisaku(LOT_NO) && checkUnfinishedSaisaku(LOT_NO, func_id)) return;
    }

    var map3 = getLatestInputCommon(func_id, LOT_NO);
    if (!map3) return;

    var END_DT = map3['END_DT'];
    var END_JIKAN = map3['END_JIKAN'];
    var CREATED_PRG_NM = map3['CREATED_PRG_NM'] || map3['BEFORE_CREATED_PRG_NM'];

    if (map3['CREATED_PRG_NM'] == 'NIPPO_INPUT_23' && func_id == 'NIPPO_INPUT_23') {
        return;
    }

    if (!END_DT || !END_JIKAN) {
        if (func_id === CREATED_PRG_NM) {
            TALON.setSearchConditionData("ID", map3['ID'], "");
        }
        return;
    }
}


/**
 * ブロックデータまたはリクエストパラメータからLOT_NOを取得します。
 * 
 * @returns {string|null} LOT_NO値
 */
function getLotNoFromBlock() {
    var map = TALON.getBlockData_Card(2);
    var lotNo = map['LOT_NO'];
    if (!lotNo) {
        lotNo = TALON.getBlockRequestParameter('2_LOT_NO');
    }
    return lotNo || null;
}

/**
 * 対象機能IDがAVI（29系）であるかを判定します。
 * 
 * @param {string} func_id - 機能ID
 * @returns {boolean} AVI対象か
 */
function isAVI(func_id) {
    return func_id === 'NIPPO_INPUT_29_AVI' || func_id === 'NIPPO_INPUT_29';
}

/**
 * 対象機能IDがEt/AOI入力対象かを判定します。
 * 
 * @param {string} func_id - 機能ID
 * @returns {boolean} 対象か
 */
function isEtOrAOI(func_id) {
    return func_id === 'NIPPO_INPUT_01' || func_id === 'NIPPO_INPUT_02';
}

/**
 * 再作データが存在するかを確認します。
 * 
 * @param {string} lotNo - ロット番号
 * @returns {boolean} 再作データの有無
 */
function existsSaisaku(lotNo) {
    var sql = "SELECT TOP 1 1 FROM NP_T_KIZAI_HARAIDASHI WHERE LOT_NO = '" + lotNo + "' AND SAISAKU_FLG = '1' AND SAISAKU_ZUMI_FLG = '1'";
    var list = TalonDbUtil.select(TALON.getDbConfig(), sql);
    return list.length > 0;
}

/**
 * 再作データにおける未完了の入力データがあるかを確認します。
 * 
 * @param {string} lotNo - ロット番号
 * @param {string} func_id - 現在の機能ID
 * @returns {boolean} 未完了の再作データがあり、かつ処理が必要な場合 true
 */
function checkUnfinishedSaisaku(lotNo, func_id) {
    var sql = "SELECT TOP 1 ID, CREATED_PRG_NM, END_DT, END_JIKAN FROM NP_T_INPUT_COMMON " +
        "WHERE LOT_NO = '" + lotNo + "' AND CHK_DELETE IS NULL AND CREATED_PRG_NM IN ('NIPPO_INPUT_01','NIPPO_INPUT_02','NIPPO_INPUT_03') " +
        "AND CHK_SAISAKU = '1' ORDER BY ID DESC";
    var list = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (list.length === 0) return false;

    var data = list[0];
    if (!data['END_DT'] || !data['END_JIKAN']) {
        if (func_id === data['CREATED_PRG_NM']) {
            TALON.setSearchConditionData("ID", data['ID'], "");
        }
        return true;
    }
    return false;
}


/**
 * 機能IDとLOT_NOに応じた最新入力データを取得します。
 * 
 * @param {string} func_id - 機能ID
 * @param {string} lotNo - ロット番号
 * @returns {Object|null} 入力データマップ（存在しない場合 null）
 */
function getLatestInputCommon(func_id, lotNo) {
    var sql;
    if (isTargetFuncId(func_id)) {
        sql = "SELECT ID, END_DT, END_JIKAN, CREATED_PRG_NM FROM NP_T_INPUT_COMMON " +
            "WHERE LOT_NO = '" + lotNo + "' AND CREATED_PRG_NM = '" + func_id + "' AND CHK_DELETE IS NULL ORDER BY ID DESC";
    } else {
        sql = getBodySql('SUB_NIPPO_HIKITUGI') +
            " WHERE LOT_NO = '" + lotNo + "' ORDER BY BEFORE_KOUTEI_JUN DESC, ID DESC";
    }
    var list = TalonDbUtil.select(TALON.getDbConfig(), sql);
    return list.length > 0 ? list[0] : null;
}

/**
 * 特定の機能IDが対象に含まれるかを判定します。
 * （内層露光〜プレス系）
 * 
 * @param {string} func_id - 機能ID
 * @returns {boolean} 対象かどうか
 */
function isTargetFuncId(func_id) {
    var targetList = [
        'NIPPO_INPUT_23', 'NIPPO_INPUT_26', 'NIPPO_INPUT_27',
        'NIPPO_INPUT_28', 'NIPPO_INPUT_29', 'NIPPO_INPUT_29_AVI',
        'NIPPO_INPUT_30', 'NIPPO_INPUT_31', 'NIPPO_INPUT_32'
    ];
    for (var i = 0; i < targetList.length; i++) {
        if (targetList[i] === func_id) {
            return true;
        }
    }
    return false;
}

/**
 * 指定されたテーブル・条件に対して最新のIDを取得します。
 * 
 * @param {string} table - 対象テーブル名
 * @param {string} whereClause - WHERE句の条件（"..."の形で渡す）
 * @returns {string|null} ID値（存在しない場合は null）
 */
function getLatestId(table, whereClause) {
    var sql = "SELECT ID FROM " + table + " WHERE " + whereClause + " ORDER BY ID DESC";
    var list = TalonDbUtil.select(TALON.getDbConfig(), sql);
    return list.length > 0 ? list[0]['ID'] : null;
}


/**
 * 初物画面の検索前初期化処理
 *
 * - 「確定」ボタン押下時は何もしない
 * - 版数アップから来た場合はSEARCH_HANSUUを+1して初期化
 * - 検索一覧から来た場合は何もしない
 * - それ以外はLOT_NOを元に検索条件を設定する
 */
function commonNippoInit_kensakumae_hatsumono() {

    if (TALON.getButtonName() === '確定') {
        // 確定はtriggerとしない
        return;
    }

    var cardMap = TALON.getBlockData_Card(1);
    var HANSUU = cardMap['HANSUU'] || TALON.getBlockRequestParameter('1_HANSUU');

    if (HANSUU) {
        var nextHansuu = parseInt(HANSUU, 10) + 1;
        TALON.setSearchConditionData("SEARCH_HANSUU", nextHansuu, "");
        TALON.setSearchConditionData("ID", "", "");
        return;
    }

    var initMap = TALON.getConditionData();
    var ID = initMap['ID'];
    var SEARCH_LOT_NO = initMap['SEARCH_LOT_NO'];

    if (ID && SEARCH_LOT_NO) {
        // 検索一覧から来た場合
        return;
    }

    var LOT_NO = cardMap['LOT_NO'] || TALON.getBlockRequestParameter('1_LOT_NO');
    TALON.setSearchConditionData("SEARCH_LOT_NO", LOT_NO, "");
}

/**
 * 初物初期値設定処理
 *
 * - 「確定」ボタン押下時は処理を行わない
 * - 検索一覧画面から遷移した場合も処理を行わない
 * - SEARCH_HANSUUがある場合はSUB_LOTINFO2からデータ取得し、HANSUUを上書き
 * - ない場合はSUB_HATSUMONO → なければSUB_LOTINFO2から取得
 * - 取得したデータを検索結果エリア（表示リスト）に1件セット
 *
 * @param {string} x - 初物区分（HATSUMONO_KBN）指定値
 */
function setHatumono(x) {
    if (TALON.getButtonName() === '確定') {
        return; // 確定はtriggerとしない
    }

    var initMap = TALON.getConditionData();
    var SEARCH_HANSUU = initMap['SEARCH_HANSUU'];
    var SEARCH_LOT_NO = initMap['SEARCH_LOT_NO'];
    var ID = initMap['ID'];

    if (ID && SEARCH_LOT_NO) {
        return; // 検索一覧から来た場合
    }

    var conn = TALON.getDbConfig(); // DB接続設定を一時変数に
    var map = null;
    var sql, sql1, mapList;

    if (SEARCH_HANSUU) {
        sql = getBodySql('SUB_LOTINFO2');
        sql1 = sql + " AND NP_T_TEHAI_RENKEI_KANRI.LOT_NO = '" + SEARCH_LOT_NO + "' ";
        mapList = TalonDbUtil.select(conn, sql1);
        if (mapList.length > 0) {
            map = mapList[0];
            map['HANSUU'] = SEARCH_HANSUU;
        }
    } else {
        sql = getBodySql('SUB_HATSUMONO');
        sql1 = sql + " WHERE LOT_NO = '" + SEARCH_LOT_NO + "' AND HATSUMONO_KBN = '" + x + "' ORDER BY HANSUU DESC, ID DESC ";
        mapList = TalonDbUtil.select(conn, sql1);

        if (mapList.length > 0) {
            map = mapList[0];
        } else {
            sql = getBodySql('SUB_LOTINFO2');
            sql1 = sql + " AND NP_T_TEHAI_RENKEI_KANRI.LOT_NO = '" + SEARCH_LOT_NO + "' ";
            mapList = TalonDbUtil.select(conn, sql1);
            if (mapList.length > 0) {
                map = mapList[0];
            }
        }
    }

    if (map) {
        TALON.setSearchedDisplayList(1, [map]);
    }
}

/**
 * 指定されたLOT_NOに対応する指図書情報を
 * SIYO_T_SEIZOSASHIZUSYO テーブルに登録します。
 *
 * 1. SUB_SASHIZUSYO SQLで対象指図データを取得
 * 2. SIYO_T_SEIZOSASHIZUSYOから該当LOT_NOを削除（ログ対応）
 * 3. insertByMapExで1件挿入（ログ対応）
 *
 * @param {string} LOT_NO - 対象のロット番号
 */
function setSashizuData(LOT_NO) {
    var conn = TALON.getDbConfig(); // DB接続設定の取得

    var sql = getBodySql('SUB_SASHIZUSYO');
    sql = sql + " WHERE O7ISCHEDULE.LOT_NO = '" + LOT_NO + "'";

    var siyoMapList = TalonDbUtil.select(conn, sql);
    if (siyoMapList.length === 0) {
        return; // データがなければ何もしない
    }

    var siyoMap = siyoMapList[0];

    // 削除用キー設定
    var deleteKeys = ['LOT_NO'];

    // トランザクション処理開始
    TalonDbUtil.begin(conn);
    try {
        deleteByMapEx(conn, 'SIYO_T_SEIZOSASHIZUSYO', siyoMap, deleteKeys, true);
        insertByMapEx(conn, 'SIYO_T_SEIZOSASHIZUSYO', siyoMap, true);
        TalonDbUtil.commit(conn);
    } catch (e) {
        TalonDbUtil.rollback(conn);
        throw e;
    }
}

/**
 * 
 */
function createKizaiData() {


}


/**
 * 基材ロット情報を更新する処理。
 *
 * カード1のブロックデータから LOT_NO と KIZAI_LOT を取得し、
 * NP_T_KIZAI_HARAIDASHI テーブルの KIZAI_LOT_NO を更新する。
 * ※ ログ出力あり、WHERE条件は LOT_NO。
 */
function updKizaiLot() {
    var map = TALON.getBlockData_Card(1);
    var LOT_NO = map['LOT_NO'];
    var KIZAI_LOT = map['KIZAI_LOT'];

    var conn = TALON.getDbConfig();

    var updateMap = {
        LOT_NO: LOT_NO,
        KIZAI_LOT_NO: KIZAI_LOT
    };
    var whereKeys = ['LOT_NO'];

    updateByMapEx(conn, 'NP_T_KIZAI_HARAIDASHI', updateMap, whereKeys, true);
}

/**
 * 準備実績データの有無をチェックする。
 *
 * 指定されたLOT_NOに対し、作業区コード '010' のデータが
 * T0000RK_NippouJisseki_Renkei に存在するかどうかを確認し、
 * 存在する場合は true を返す。
 *
 * @param {string} LOT_NO - チェック対象のロット番号
 * @returns {boolean} データが存在すれば true、存在しなければ false
 */
function chkJunbiData(LOT_NO) {
    var conn = TALON.getOtherDBConn("2");

    var whereMap = {
        LotNO: LOT_NO,
        SagyoukuCD: '010'
    };

    var count = getCount(conn, 'T0000RK_NippouJisseki_Renkei', whereMap);
    return count > 0;
}

/**
 * 装構成管理テーブルに指定された仕様書SEQのデータが存在するかをチェックする。
 *
 * 件数が1件以上存在する場合は true、存在しない場合は false を返す。
 *
 * @param {number|string} SIYOSYO_SEQ - 対象の仕様書SEQ
 * @returns {boolean} データが存在すれば true、存在しなければ false
 */
function chkSoukouseiUmu(SIYOSYO_SEQ) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ
    };

    var count = getCount(conn, 'SOUKOUSEI_KANRI', whereMap);
    return count > 0;
}

/**
 * ロット番号からの検索処理
 * 検索前JSに配置してください。
 * @returns 
 */
function searchLotNoNippo() {

    if (TALON.getButtonName() != '検索') {

        // 検索以外はtriggerとしない
        return;
    }

    var lineDataMap = TALON.getConditionData();
    var ID = lineDataMap['ID'];
    //IDから検索場合
    if (ID) {
        return;
    }

    var map = TALON.getBlockData_Card(2);

    var LOT_NO = null;
    if (map) {
        LOT_NO = map['LOT_NO'];
        if (map['TANTO_SYA_CD']) {
            var TANTO_SYA_CD = map['TANTO_SYA_CD'];
        }
        if (map['USER_NM']) {
            var USER_NM = map['USER_NM'];
        }

    } else {
        LOT_NO = TALON.getBlockRequestParameter('2_LOT_NO');
        var TANTO_SYA_CD = TALON.getBlockRequestParameter('2_TANTO_SYA_CD');
        if (TANTO_SYA_CD) {
            var sql = "SELECT USER_NM FROM COM_M_USER WHERE USER_ID = '" + TANTO_SYA_CD + "' ";
            var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (itemSelectList.length > 0) {
                var map = itemSelectList[0];
                var USER_NM = map['USER_NM'];
            }
        }
        if (!LOT_NO || LOT_NO == "") {
            var lineDataMap = TALON.getConditionData();
            LOT_NO = lineDataMap['SEARCH_LOT_NO']
        }
    }


    if (!LOT_NO) {


        // ロット番号が存在しない場合は処理を行わない
        return;
    }

    setRenkeiKariData(LOT_NO)
    var userData = TALON.getUserInfoMap();
    var FUNC_ID = userData['FUNC_ID'];
    var sql = "SELECT FUNC_NM FROM TLN_M_GENERAL_FUNC WHERE FUNC_ID = '" + FUNC_ID + "'";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var map1 = mapList[0];
    var FUNC_NM = map1['FUNC_NM'];

    sql = getBodySql('SUB_NIPPO');
    var sql1 = sql + " WHERE LOT_NO = '" + LOT_NO + "' AND CHK_DELETE IS NULL";
    mapList = TalonDbUtil.select(TALON.getDbConfig(), sql1);
    map1 = mapList[0];
    var LOT_CNT = map1['CNT'];

    if (LOT_CNT == 0) {

        var NEXT_KOUTEI_CD = getSYOKIKOUTEI_CD(LOT_NO);
        if (!NEXT_KOUTEI_CD) {
            TALON.setIsSuccess(false);
            return;
        }
        var isKouteiChk = kouteiChk_INIT(NEXT_KOUTEI_CD);

        if (!((NEXT_KOUTEI_CD == '020' || NEXT_KOUTEI_CD == '021' || NEXT_KOUTEI_CD == '022' || NEXT_KOUTEI_CD == '023') && FUNC_ID == 'NIPPO_INPUT_01')) {

            if (!isKouteiChk) {
                TALON.addErrorMsg("ロット番号 " + LOT_NO + " の初期工程ではありません。ご確認ください。'")
                TALON.setIsSuccess(false);
                return;
            }
        }

        if (NEXT_KOUTEI_CD == '040') {

            if (!isKouteiChk) {

                TALON.addErrorMsg("ロット番号 " + LOT_NO + " の初期工程は内層工程です。指図書をご確認ください。'")
                TALON.setIsSuccess(false);
                return;
            }

        } else {


            var siyosyoMapList = getSisyoSyoInfo(LOT_NO);

            if (siyosyoMapList.length == 0) {

                TALON.addErrorMsg("仕様書情報を更新中です。数分後再実施をお願いします。");
                TALON.setIsSuccess(false);
                return;
            }

            var map2 = siyosyoMapList[0];
            var SIYOSYO_SEQ = map2['SIYOSYO_SEQ'];

            if (chkSoukouseiUmu(SIYOSYO_SEQ)) {

                if (!kizaiJunbiUmu(LOT_NO)) {

                    return;
                }


            } else {

                TALON.addMsg("指図書上層構成情報が存在しません。内部でのご確認をお願いいたします。 実績登録は可能です。");

            }
        }

        var siyosyoMapList = getSisyoSyoInfo(LOT_NO);

        if (siyosyoMapList.length == 0) {

            TALON.addErrorMsg("仕様書情報を更新中です。数分後再実施をお願いします。");
            TALON.setIsSuccess(false);
            return;
        }


        var map2 = siyosyoMapList[0];

        var CURRENT_KOUTEI_CD = map2['CURRENT_KOUTEI_CD'];

        while (!CURRENT_KOUTEI_CD) {
            batRenkeiKanri(LOT_NO);

            var siyosyoMapList = getSisyoSyoInfo(LOT_NO);

            if (siyosyoMapList.length > 0) {
                map2 = siyosyoMapList[0];

                // CURRENT_KOUTEI_CD を更新する（取得方法に応じて適宜変更）
                CURRENT_KOUTEI_CD = map2.CURRENT_KOUTEI_CD;
            }
        }

        var SIYOSYO_SEQ = map2['SIYOSYO_SEQ'];


        map2['ID'] = TALON.getNumberingData('TID', 1)[0];
        map2['START_DT'] = getDt();
        map2['START_JIKAN'] = getTime();
        map2['SETUBI_SYU'] = getZenkaiSetsubiSyu();
        map2['HONJITSU_SAGYO_M2_SUU'] = getHonjituSagyo();
        map2['SAGYO_KU'] = NEXT_KOUTEI_CD;

        if (TANTO_SYA_CD) {
            map2['TANTO_SYA_CD'] = TANTO_SYA_CD;
        }
        if (USER_NM) {
            map2['USER_NM'] = USER_NM;
        }

        map2['JITU_SAGYO_PN_SUU'] = map2['TOUNYU_SU'];
        map2['JITU_SAGYO_M2_SUU'] = (map2['GOUKAKU_M2_SUU'] / map2['GOUKAKU_PN_SUU']) * map2['TOUNYU_SU'];
        map2['JITUSAGYO_PCS_SUU'] = map2['TOUNYU_SU'] * map2['MENTUKESU1'] * map2['MENTUKESU2'];
        map2['OLD_SAGYO_PN_SUU'] = map2['SAGYO_PN_SUU'];
        map2['OLD_GOUKAKU_PN_SUU'] = map2['GOUKAKU_PN_SUU'];
        map2['OLD_SAGYO_PCS_SUU'] = map2['SAGYO_PCS_SUU'];
        map2['OLD_GOUKAKU_PCS_SUU'] = map2['GOUKAKU_PCS_SUU'];
        TALON.setSearchConditionData("LOT_NO", LOT_NO, "");
        map2['CHK_SAISAKU'] = 0;
        var arr = [map2];
        TALON.setSearchedDisplayList(2, arr);

        setKizaiJunbiList(LOT_NO);

    } else {

        if (FUNC_ID == 'NIPPO_INPUT_01'
            || FUNC_ID == 'NIPPO_INPUT_02'

        ) {
            //再作の場合
            if (searchLotNoNippoSaisaku(LOT_NO, FUNC_ID, TANTO_SYA_CD, USER_NM)) {
                return;
            }
        }

        //240430 仕様データの取得
        var siyosyoMapList = getSisyoSyoInfo(LOT_NO);

        if (siyosyoMapList.length == 0) {

            TALON.addErrorMsg("仕様書情報を更新中です。数分後再実施をお願いします。");
            TALON.setIsSuccess(false);
            return;
        }

        var map2 = siyosyoMapList[0];

        // 前工程情報の取得
        var sql3 = getBodySql('SUB_NIPPO_HIKITUGI');
        sql3 = sql3 + " WHERE LOT_NO = '" + LOT_NO + "' ORDER BY BEFORE_KOUTEI_JUN DESC, ID DESC ";
        var mapList3 = TalonDbUtil.select(TALON.getDbConfig(), sql3);

        var map3 = mapList3[0];
        var SIYOSYO_SEQ = map3['SIYOSYO_SEQ'];
        var NEXT_KOUTEI_CD = map3['NEXT_KOUTEI_CD'];
        var CREATED_PRG_NM = map3['BEFORE_CREATED_PRG_NM'];
        var CURRENT_KOUTEI_CD = map3['CURRENT_KOUTEI_CD'];
        if (!CURRENT_KOUTEI_CD) {
            if (
                FUNC_ID != 'NIPPO_INPUT_23' //整面
                && FUNC_ID != 'NIPPO_INPUT_26' //仕様検査
                && FUNC_ID != 'NIPPO_INPUT_27' //最終検査
                && FUNC_ID != 'NIPPO_INPUT_28' //検査加工
                && FUNC_ID != 'NIPPO_INPUT_29' //目視
                && FUNC_ID != 'NIPPO_INPUT_29_AVI' //目視
                && FUNC_ID != 'NIPPO_INPUT_30' //
                && FUNC_ID != 'NIPPO_INPUT_31' //修正工程
                && FUNC_ID != 'NIPPO_INPUT_32' //レーザー捺印作業
            ) {
                TALON.addErrorMsg("ロット番号 " + LOT_NO + " の終工程で入力されていました、ご確認ください。")
                TALON.setIsSuccess(false);
                return;
            }
        } else {
            var SAGYO_KU = CURRENT_KOUTEI_CD;
        }

        var userData = TALON.getUserInfoMap();
        var END_DT = map3['END_DT'];
        var END_JIKAN = map3['END_JIKAN'];

        if (FUNC_ID == 'NIPPO_INPUT_27') {
            if (!kouteiChk_27(LOT_NO)) {
                TALON.setIsSuccess(false);
                return;
            }
        } else {

            if (!((CURRENT_KOUTEI_CD == '020' || CURRENT_KOUTEI_CD == '021' || CURRENT_KOUTEI_CD == '022' || CURRENT_KOUTEI_CD == '023') && FUNC_ID == 'NIPPO_INPUT_01')) {

                var isKouteiNow = kouteiChk_Zenkoutei(CURRENT_KOUTEI_CD, CREATED_PRG_NM, FUNC_ID, LOT_NO);
                if (!isKouteiNow) {

                    if (CREATED_PRG_NM == FUNC_ID || CREATED_PRG_NM.equals(FUNC_ID)) {

                        TALON.addErrorMsg("既に当工程は入力済みです。ご確認ください。")
                        TALON.setIsSuccess(false);
                        return;

                    } else {

                        TALON.addErrorMsg("現工程は" + FUNC_NM + "工程ではありません、ご確認ください。")
                        TALON.setIsSuccess(false);
                        return;
                    }

                }
            }
        }

        if (CREATED_PRG_NM != "NIPPO_INPUT_28") {
            if (!END_JIKAN || !END_DT) {
                TALON.addErrorMsg("前工程情報での終了日付、終了時間いずれかが入力されていません。")
                TALON.setIsSuccess(false);
                return;
            }
        }

        map3['ID'] = TALON.getNumberingData('TID', 1)[0];
        map3['START_DT'] = getDt();
        map3['START_JIKAN'] = getTime();
        map3['END_DT'] = null;
        map3['END_JIKAN'] = null;
        map3['SETUBI_SYU'] = getZenkaiSetsubiSyu();
        map3['CHK_SAISAKU'] = 0;

        //240430 作業M2数の取得
        map3['SAGYO_M2_SUU'] = (map2['GOUKAKU_M2_SUU'] / map2['GOUKAKU_PCS_SUU']) * map3['GOUKAKU_PCS_SUU'];
        map3['GOUKAKU_M2_SUU'] = map3['SAGYO_M2_SUU'];


        if (FUNC_ID == 'NIPPO_INPUT_23') {
            var SAGYO_KU = '400';
        }
        if (FUNC_ID == 'NIPPO_INPUT_26') {
            var SAGYO_KU = '390';
        }
        if (FUNC_ID == 'NIPPO_INPUT_27') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_28') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_29') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_29_AVI') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_30') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_31') {
            var SAGYO_KU = '450';
        }
        if (FUNC_ID == 'NIPPO_INPUT_32') {
            var SAGYO_KU = '450';
        }
        map3['HONJITSU_SAGYO_M2_SUU'] = getHonjituSagyo();
        if (TANTO_SYA_CD) {
            map3['TANTO_SYA_CD'] = TANTO_SYA_CD;
        }
        if (USER_NM) {
            map3['USER_NM'] = USER_NM;
        }

        if (FUNC_ID == 'NIPPO_INPUT_23'
            || FUNC_ID == 'NIPPO_INPUT_26'
            || FUNC_ID == 'NIPPO_INPUT_27'
            || FUNC_ID == 'NIPPO_INPUT_28'
            || FUNC_ID == 'NIPPO_INPUT_29'
            || FUNC_ID == 'NIPPO_INPUT_29_AVI'
            || FUNC_ID == 'NIPPO_INPUT_30'
            || FUNC_ID == 'NIPPO_INPUT_31'
            || FUNC_ID == 'NIPPO_INPUT_32') {
            map3['NEXT_KOUTEI_JUN'] = map3['CURRENT_KOUTEI_JUN'];
            map3['NEXT_KOUTEI_CD'] = map3['CURRENT_KOUTEI_CD'];
            map3['CURRENT_KOUTEI_JUN'] = map3['BEFORE_KOUTEI_JUN'];
            map3['CURRENT_KOUTEI_CD'] = SAGYO_KU;
        }

        map3['SAGYO_KU'] = SAGYO_KU;
        map3['OLD_SAGYO_PN_SUU'] = map3['SAGYO_PN_SUU'];
        map3['OLD_GOUKAKU_PN_SUU'] = map3['GOUKAKU_PN_SUU'];
        map3['OLD_SAGYO_PCS_SUU'] = map3['SAGYO_PCS_SUU'];
        map3['OLD_GOUKAKU_PCS_SUU'] = map3['GOUKAKU_PCS_SUU'];

        //外層ETの場合、銅厚の取得
        if ((CURRENT_KOUTEI_CD == '160') || (CURRENT_KOUTEI_CD == '161')) {
            var map4 = getEtDouatsu(LOT_NO);
            if (map4) {
                map3['ET_DOUATSU_MAX'] = map4['ET_DOUATSU_MAX'];
                map3['ET_DOUATSU_MIN'] = map4['ET_DOUATSU_MIN'];
            }
        }

        var userData = TALON.getUserInfoMap();
        var FUNC_ID = userData['FUNC_ID'];
        if (FUNC_ID) {

            //外層ETの場合に、設備種の取得
            if (FUNC_ID == "NIPPO_INPUT_11" || FUNC_ID.equals("NIPPO_INPUT_11")) {
                map3['ET_SPEED'] = null;
                if (SAGYO_KU == "161" || SAGYO_KU.equals("161")) {

                    map3['SETUBI_SYU'] = "999";
                } else {
                    //map3['SETUBI_SYU'] = "054";
                    map3['SETUBI_SYU'] = null;
                }
            }


            //内層ETの場合に、内層初物有無の取得
            if (FUNC_ID == "NIPPO_INPUT_02" || FUNC_ID.equals("NIPPO_INPUT_02")) {

                sql = "SELECT COUNT(*) CNT FROM NP_T_HATSUMONO_INPUT WHERE LOT_NO ='" + LOT_NO + "' AND HATSUMONO_KBN = '1'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_HATSUMONO_NAISO'] = "無";
                } else {
                    map3['HAS_HATSUMONO_NAISO'] = "有";
                }
            }
            //内層検査の場合に、ドリル折れ有無と内層初物有無の取得
            if (FUNC_ID == "NIPPO_INPUT_03" || FUNC_ID.equals("NIPPO_INPUT_03")) {
                sql = "SELECT COUNT(*) CNT FROM NP_T_DRILL WHERE LOT_NO ='" + LOT_NO + "'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                var CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_DRILL'] = "無";
                } else {
                    map3['HAS_DRILL'] = "有";
                }

                sql = "SELECT COUNT(*) CNT FROM NP_T_HATSUMONO_INPUT WHERE LOT_NO ='" + LOT_NO + "' AND HATSUMONO_KBN = '1'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_HATSUMONO_NAISO'] = "無";
                } else {
                    map3['HAS_HATSUMONO_NAISO'] = "有";
                }
            }
            //外層ETの場合に、外層初物有無の取得
            if (FUNC_ID == "NIPPO_INPUT_11" || FUNC_ID.equals("NIPPO_INPUT_11")) {

                sql = "SELECT COUNT(*) CNT FROM NP_T_HATSUMONO_INPUT WHERE LOT_NO ='" + LOT_NO + "' AND HATSUMONO_KBN = '2'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_HATSUMONO_GAISO'] = "無";
                } else {
                    map3['HAS_HATSUMONO_GAISO'] = "有";
                }
            }
            //中間検査の場合に、ドリル折れ有無と外層初物有無の取得
            if (FUNC_ID == "NIPPO_INPUT_12" || FUNC_ID.equals("NIPPO_INPUT_12")) {
                sql = "SELECT COUNT(*) CNT FROM NP_T_DRILL WHERE LOT_NO ='" + LOT_NO + "'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                var CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_DRILL'] = "無";
                } else {
                    map3['HAS_DRILL'] = "有";
                }

                sql = "SELECT COUNT(*) CNT FROM NP_T_HATSUMONO_INPUT WHERE LOT_NO ='" + LOT_NO + "' AND HATSUMONO_KBN = '2'"
                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                map = mapList[0];
                CNT = map['CNT'];
                if (CNT == 0) {
                    map3['HAS_HATSUMONO_GAISO'] = "無";
                } else {
                    map3['HAS_HATSUMONO_GAISO'] = "有";
                }
            }
        }

        if (FUNC_ID == 'NIPPO_INPUT_26') {

            map3['SETUBI_SYU'] = '999'
            sql = "SELECT SIYO_KENSA_FILE_PATH, KENSA_FILE_PATH FROM COM_M_HINMOKU WHERE HINMOKU_CD ='" + map3['HINMOKU_CD'] + "' ";
            mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                map = mapList[0];
                map3['SIYO_KENSA_IMAGE'] = map['SIYO_KENSA_FILE_PATH'];
                map3['KENSA_IMAGE'] = map['KENSA_FILE_PATH'];
            }
        }

        if (FUNC_ID == 'NIPPO_INPUT_32') {

            sql = "SELECT NATSUIN_FILE_PATH FROM COM_M_HINMOKU WHERE HINMOKU_CD ='" + map3['HINMOKU_CD'] + "' ";
            mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                map = mapList[0];
                map3['NATSUIN_IMAGE'] = map['NATSUIN_FILE_PATH'];
            }
        }

        //240304 修正箇所 外層回路露光作業 画面デフォルト値の設定
        if (FUNC_ID == 'NIPPO_INPUT_10') {
            map3['SETUBI_SYU'] = "014";
            map3['DF_SYU'] = "7";
        }

        //240329 修正箇所 シルク印刷画面 画面インクロットのデフォルト値の設定
        if (FUNC_ID == 'NIPPO_INPUT_10') {
            if (!map3['INK_LOT_NO']) {
                map3['INK_LOT_NO'] = "1";
            }
        }

        //240304 修正箇所 穴埋め作業 画面インクロットのデフォルト値の設定
        if (FUNC_ID == 'NIPPO_INPUT_10') {
            if (!map3['INK_LOT_NO']) {
                map3['INK_LOT_NO'] = "2";
            }
        }

        var arr = [map3];
        TALON.setSearchedDisplayList(2, arr);
        setKizaiJunbiList(LOT_NO);
    }
}


function searchLotNoNippoSaisaku(LOT_NO, FUNC_ID, TANTO_SYA_CD, USER_NM) {

    // 対象画面が内層露光、Etかつ再作データがある場合は再度新規登録を行う。
    // 再作時の考慮 再作の場合return true

    var sql = " SELECT SUM(SAISAKU_TOUNYU_SU) AS SAISAKU_TOUNYU_SU FROM NP_T_KIZAI_HARAIDASHI INNER JOIN "
        + " ( SELECT LOT_NO ,SOUKOUSEI_HINMOKU_NAME ,MAX(KIZAI_ID) KIZAI_ID FROM NP_T_KIZAI_HARAIDASHI "
        + " WHERE SAISAKU_FLG = '1' AND SAISAKU_ZUMI_FLG = '1' AND  LOT_NO = '"
        + LOT_NO
        + "' GROUP BY LOT_NO ,SOUKOUSEI_HINMOKU_NAME) A ON NP_T_KIZAI_HARAIDASHI.KIZAI_ID = A.KIZAI_ID "
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    if (mapList.length != 0) {
        var map = mapList[0];
        if (map['SAISAKU_TOUNYU_SU']) {
            // 再作データが存在しているかつ、終了日が登録されているかをチェック
            //240321 再作のロジック修正 02のデータがあるか
            var sql2 = " SELECT NP_T_INPUT_COMMON.*, ISNULL(NP_T_INPUT_COMMON.LINE_HABA, SIYOSYO_MAIN.LINE_KANKAKU) AS LINE_HABA FROM NP_T_INPUT_COMMON INNER JOIN SIYOSYO_MAIN ON SIYOSYO_MAIN.SIYOSYO_SEQ = NP_T_INPUT_COMMON.SIYOSYO_SEQ WHERE NP_T_INPUT_COMMON.LOT_NO = '"
                + LOT_NO + "' AND NP_T_INPUT_COMMON.CREATED_PRG_NM = 'NIPPO_INPUT_02' AND (NP_T_INPUT_COMMON.CHK_SAISAKU = '1') AND CHK_DELETE IS NULL ORDER BY NP_T_INPUT_COMMON.ID DESC ";
            var mapList2 = TalonDbUtil.select(TALON.getDbConfig(), sql2);
            //240321 再作のロジック修正
            if (mapList2.length > 0) {
                var map2 = mapList2[0];
                if (!map2['END_DT'] || !map2['END_JIKAN']) {
                    //240321　終了日か終了時間が無い場合　本工程も02の場合　既に検索前に設置したので　こちら本工程01の場合だけ
                    TALON.addMsg("再作分の内層ET作業の終了日付、終了時間いずれかが入力されていません。");
                    return true;
                } else {
                    //240321 再作の02が完了した　もう再作ではないと考えられる
                    return false;
                }
            } else {
                //240321 再作分01のデータがあるか
                var sql1 = " SELECT NP_T_INPUT_COMMON.*, ISNULL(NP_T_INPUT_COMMON.LINE_HABA, SIYOSYO_MAIN.LINE_KANKAKU) AS LINE_HABA FROM NP_T_INPUT_COMMON INNER JOIN SIYOSYO_MAIN ON SIYOSYO_MAIN.SIYOSYO_SEQ = NP_T_INPUT_COMMON.SIYOSYO_SEQ WHERE NP_T_INPUT_COMMON.LOT_NO = '"
                    + LOT_NO + "' AND NP_T_INPUT_COMMON.CREATED_PRG_NM = 'NIPPO_INPUT_01' AND NP_T_INPUT_COMMON.CHK_SAISAKU = '1' AND (NP_T_INPUT_COMMON.CHK_DELETE IS NULL OR NP_T_INPUT_COMMON.CHK_DELETE <> '1') ORDER BY NP_T_INPUT_COMMON.ID DESC ";
                var mapList1 = TalonDbUtil.select(TALON.getDbConfig(), sql1);


                if (mapList1.length > 0) {
                    var map1 = mapList1[0];
                    //240321　終了日か終了時間が無い場合
                    if (!map1['END_DT'] || !map1['END_JIKAN']) {
                        TALON.addMsg("再作分の内層露光作業の終了日付、終了時間いずれかが入力されていません。");
                        return true;
                    } else {
                        //240321　01で重複登録場合
                        if (FUNC_ID == "NIPPO_INPUT_01") {
                            TALON.addErrorMsg("本工程で入力されていました、ご確認ください。")
                            TALON.setIsSuccess(false);
                            return true;
                        } else {
                            //240321 01→02の場合
                            map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                            map1['START_DT'] = getDt();
                            map1['START_JIKAN'] = getTime();
                            map1['TANTO_SYA_CD'] = null;
                            map1['END_DT'] = null;
                            map1['END_JIKAN'] = null;
                            map1['SETUBI_SYU'] = getZenkaiSetsubiSyu();
                            map1['CHK_SAISAKU'] = 1;
                            map1['OLD_SAGYO_PN_SUU'] = map1['SAGYO_PN_SUU'];
                            map1['OLD_GOUKAKU_PN_SUU'] = map1['GOUKAKU_PN_SUU'];
                            map1['OLD_SAGYO_PCS_SUU'] = map1['SAGYO_PCS_SUU'];
                            map1['OLD_GOUKAKU_PCS_SUU'] = map1['GOUKAKU_PCS_SUU'];

                            //内層ETの場合に、内層初物有無の取得
                            if (FUNC_ID == "NIPPO_INPUT_02" || FUNC_ID.equals("NIPPO_INPUT_02")) {

                                sql = "SELECT COUNT(*) CNT FROM NP_T_HATSUMONO_INPUT WHERE LOT_NO ='" + LOT_NO + "' AND HATSUMONO_KBN = '1'"
                                mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                                map = mapList[0];
                                CNT = map['CNT'];
                                if (CNT == 0) {
                                    map1['HAS_HATSUMONO_NAISO'] = "無";
                                } else {
                                    map1['HAS_HATSUMONO_NAISO'] = "有";
                                }
                            }


                            var arr = [map1];
                            TALON.setSearchedDisplayList(2, arr);
                            setKizaiJunbiList(LOT_NO);
                            return true;
                        }
                    }
                } else {
                    //240312 再作未登録場合
                    if (FUNC_ID == 'NIPPO_INPUT_01') {

                        var siyosyoMapList = getSisyoSyoInfo(LOT_NO);

                        var NEXT_KOUTEI_CD = getSYOKIKOUTEI_CD(LOT_NO);
                        if (!NEXT_KOUTEI_CD) {
                            TALON.setIsSuccess(false);
                            return true;
                        }

                        var map1 = siyosyoMapList[0];
                        map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                        map1['START_DT'] = getDt();
                        map1['START_JIKAN'] = getTime();
                        map1['SETUBI_SYU'] = getZenkaiSetsubiSyu();
                        map1['HONJITSU_SAGYO_M2_SUU'] = getHonjituSagyo();
                        map1['SAGYO_KU'] = NEXT_KOUTEI_CD;
                        //map1['ET_SPEED'] = 0;
                        map1['CHK_SAISAKU'] = 1;


                        //再作の場合は、作業PNと作業㎡数は0とし、実作業に値を反映
                        map1['JITU_SAGYO_PN_SUU'] = map['SAISAKU_TOUNYU_SU'];
                        map1['JITU_SAGYO_M2_SUU'] = (map1['GOUKAKU_M2_SUU'] / map1['GOUKAKU_PN_SUU']) * map['SAISAKU_TOUNYU_SU'];
                        map1['JITUSAGYO_PCS_SUU'] = map['SAISAKU_TOUNYU_SU'] * map1['MENTUKESU1'] * map1['MENTUKESU2'];
                        map1['SAGYO_PN_SUU'] = 0;
                        map1['SAGYO_M2_SUU'] = 0;
                        map1['SAGYO_PCS_SUU'] = 0;
                        map1['GOUKAKU_PN_SUU'] = 0;
                        map1['GOUKAKU_M2_SUU'] = 0;
                        map1['GOUKAKU_PCS_SUU'] = 0;
                        map1['FURYO_PN_SUU'] = 0;
                        map1['FURYO_PCS_SUU'] = 0;

                        if (TANTO_SYA_CD) {
                            map1['TANTO_SYA_CD'] = TANTO_SYA_CD;
                        }
                        if (USER_NM) {
                            map1['USER_NM'] = USER_NM;
                        }

                        map1['OLD_SAGYO_PN_SUU'] = map1['SAGYO_PN_SUU'];
                        map1['OLD_GOUKAKU_PN_SUU'] = map1['GOUKAKU_PN_SUU'];
                        map1['OLD_SAGYO_PCS_SUU'] = map1['SAGYO_PCS_SUU'];
                        map1['OLD_GOUKAKU_PCS_SUU'] = map1['GOUKAKU_PCS_SUU'];
                        TALON.setSearchConditionData("LOT_NO", LOT_NO, "");
                        var arr = [map1];
                        TALON.setSearchedDisplayList(2, arr);

                        setKizaiJunbiList(LOT_NO);

                        return true;
                    } else {

                        TALON.addMsg("再作分の内層露光作業が未登録です。登録をお願いいたします。");
                        TALON.setIsSuccess(false);
                        return true;

                    }
                }
            }
        }
    }
    //20240313 今回の修正箇所　この場合、共通に戻します
    return false;
}

/**
 * 基材準備データ設定
 * @param {*} LOT_NO 
 */
function setKizaiJunbiList(LOT_NO) {

    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];

    if (func_id == 'NIPPO_INPUT_01') {

        // TODO コア材のみ
        var haraidashiSQL = getBodySql('SUB_HARAIDASHI_NO_DISP');
        haraidashiSQL = haraidashiSQL + " WHERE LOT_NO = '" + LOT_NO + "' AND SYURUI IS NOT NULL AND KIZAI_SYURUI = 'コア' AND CHK = '1'"
        var haraidashiList = TalonDbUtil.select(TALON.getDbConfig(), haraidashiSQL);
        TALON.setSearchedDisplayList(4, haraidashiList);

    }

    if (func_id == 'NIPPO_INPUT_02') {

        // TODO コア材とダミー材
        var haraidashiSQL = getBodySql('SUB_HARAIDASHI_NO_DISP');
        haraidashiSQL = haraidashiSQL + " WHERE LOT_NO = '" + LOT_NO + "' AND SYURUI IS NOT NULL AND ( KIZAI_SYURUI = 'コア' OR KIZAI_SYURUI = 'ダミー' ) AND CHK = '1'"
        var haraidashiList = TalonDbUtil.select(TALON.getDbConfig(), haraidashiSQL);
        TALON.setSearchedDisplayList(5, haraidashiList);
    }

}



/**
 * ドリル折れデータを表示リストに設定する。
 *
 * 対象機能が NIPPO_INPUT_08 の場合、LOT_NO を条件に
 * NIPPO_DRILL_RENRAKU SQLを実行し、カード8に表示リストを設定する。
 *
 * @param {string} LOT_NO - 対象のロット番号
 */
function setDrillData(LOT_NO) {
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];

    if (func_id === 'NIPPO_INPUT_08') {
        var conn = TALON.getDbConfig();
        var sql = getBodySql('NIPPO_DRILL_RENRAKU') + " WHERE LOT_NO = '" + String(LOT_NO).replace(/'/g, "''") + "'";
        var drillList = TalonDbUtil.select(conn, sql);
        TALON.setSearchedDisplayList(8, drillList);
    }
}


/**
 * 工程コード取得
 * @param {*} SIYOSYO_SEQ 
 */
function getKotei_cd(SIYOSYO_SEQ, LOT_NO) {

    var KOTEI_CD_M = getKotei_cd();

    var mapList = getkotei_info(SIYOSYO_SEQ, KOTEI_CD_M);

    if (mapList.length == 1) {

        return mapList[0]['KOUTEI_CD'];
    }


    for (var i = 0; i < mapList.length; i++) {

        var map = maplist[i];
        var KOUTEI_CD = map['KOUTEI_CD'];
        var sql = "SELECT SAGYO_KU FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO + "' AND SAGYO_KU = '" + KOUTEI_CD + "' AND CHK_DELETE IS NULL";
        var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (itemSelectList.length == 0) {

            return KOUTEI_CD;
        }

    }
}

/**
 * 製造指図書の準備工程をのぞいた仕様書情報を取得する。
 * @param {*} LOT_NO 
 */
function getSisyoSyoInfo(LOT_NO) {

    // 仕様書情報を取得(個別記載はNG)
    var sql = getBodySql('SUB_SIYOSYO');
    sql = sql + " AND NP_T_TEHAI_RENKEI_KANRI.LOT_NO ='" + LOT_NO + "'"
    var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    return itemSelectList;
}

/**
 * 製造指図書の準備工程をのぞいた仕様書情報を取得する。
 * @param {*} LOT_NO 
 */
function getTehaiJoho(LOT_NO) {

    // 仕様書情報を取得(個別記載はNG)
    var sql = getBodySql('SUB_SIYOSYO');
    sql = sql + " AND NP_T_TEHAI_RENKEI_KANRI.LOT_NO ='" + LOT_NO + "'"
    var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    return itemSelectList;
}

/**
 * 初期工程コードを取得する。
 * @param {*} LOT_NO 
 */
function getSYOKIKOUTEI_CD(LOT_NO) {

    // 仕様書情報を取得(個別記載はNG)
    var sql = getBodySql('SUB_SYOKI_KOUTEI');
    sql = sql + " WHERE O7ISCHEDULE.LOT_NO ='" + LOT_NO + "'"
    var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (itemSelectList.length == 0) {

        TALON.addErrorMsg("対象のロット番号が仕様書DB上にまだ存在しておりません  " + LOT_NO);
        return null;

    } else {
        var map = itemSelectList[0];
        var KOUTEI_CD = map['KOUTEI_CD'];

        return KOUTEI_CD;
    }
}


/**
 * 基材準備有無
 * @param {*} LOT_NO 
 */
function kizaiJunbiUmu(LOT_NO) {

    var junbi_sql = getBodySql('SUB_KIAI_JUNBIZUMI');
    junbi_sql = junbi_sql + " WHERE LOT_NO ='" + LOT_NO + "' AND CHK ='1' ";
    var junbimapList = TalonDbUtil.select(TALON.getDbConfig(), junbi_sql);


    if (junbimapList.length == 0) {

        TALON.addErrorMsg("基材の払出が完了していないロットNoです。準備工程の入力を行ってください。", '1_LOT_NO');
        TALON.setIsSuccess(false);
        return false;

    }

    return true;
}

/**
 * ユーザーの機能IDに対応する工程コード（KOTEI_CD）を取得する。
 *
 * 対象テーブル：TLN_M_HANYO_CODE  
 * 条件：SIKIBETU_CODE = 'SAGYOUKU' AND KEY_CODE = ユーザーのFUNC_ID
 *
 * @returns {string|null} 工程コード（存在しない場合は null）
 */
function getKotei_cd() {
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIKIBETU_CODE: 'SAGYOUKU',
        KEY_CODE: func_id
    };

    var map = selectOne(conn, 'TLN_M_HANYO_CODE', ['DSP2'], whereMap, null);
    return map ? map['DSP2'] : null;
}

/**
 * 工程順取得
 * 将来的には
 * @param {*} SIYOSYO_SEQ 
 * @param {*} KOTEI_CD_M 
 */
function getkotei_jun(SIYOSYO_SEQ, KOTEI_CD_M) {

    // ２工程以上ある場合を考慮する。
    var sql4 = getBodySql('SUB_KOTEIJUN');
    sql4 = sql4 + " WHERE SIYOSYO_SEQ =" + SIYOSYO_SEQ + " AND KOUTEI_CD_M = '" + KOTEI_CD_M + "' ORDER BY KOUTEI_JUN";
    var koteiMapList = TalonDbUtil.select(TALON.getDbConfig(), sql4);
    var koteiMap = koteiMapList[0];
    var KOTEI_JUN = koteiMap['KOUTEI_JUN'];

    return KOTEI_JUN;
}


/**
 * 工程順取得
 * 将来的には
 * @param {*} SIYOSYO_SEQ 
 * @param {*} KOTEI_CD_M 
 */
function getkotei_info(SIYOSYO_SEQ, KOTEI_CD_M) {

    // ２工程以上ある場合を考慮する。
    var sql4 = getBodySql('SUB_KOTEIJUN');
    sql4 = sql4 + " WHERE SIYOSYO_SEQ =" + SIYOSYO_SEQ + " AND KOUTEI_CD_M = '" + KOTEI_CD_M + "' ORDER BY KOUTEI_JUN";
    var koteiMapList = TalonDbUtil.select(TALON.getDbConfig(), sql4);

    return koteiMapList;
}

/**
 * リスト情報設定対象ブロック情報を初期化
 * @param {*}  
 */
function setTargetListClear() {


    if (TALON.getButtonName() != '確定') {

        return;
    }

    var userData = TALON.getUserInfoMap();
    var FUNC_ID = userData['FUNC_ID'];

    if (FUNC_ID) {
        if (FUNC_ID == 'NIPPO_INPUT_09' || FUNC_ID.equals('NIPPO_INPUT_09')) {
            TALON.setSearchConditionData("PID", "", "");

        }
    }

    var map = TALON.getBlockData_Card(2);


    var mapNew = new Array();
    var list = new Array();
    if (FUNC_ID != 'NIPPO_INPUT_27') {
        if (map['TANTO_SYA_CD']) {
            mapNew['TANTO_SYA_CD'] = map['TANTO_SYA_CD'];
        }
        if (map['USER_NM']) {
            mapNew['USER_NM'] = map['USER_NM'];
        }
        if (map['SAGYO_SYA_NM']) {
            mapNew['SAGYO_SYA_NM'] = map['SAGYO_SYA_NM'];
        }
        if (map['KENSA_TNT_CD']) {
            mapNew['KENSA_TNT_CD'] = map['KENSA_TNT_CD'];
        }
        if (map['KENSA_TNT_NM']) {
            mapNew['KENSA_TNT_NM'] = map['KENSA_TNT_NM'];
        }
    }

    mapNew['ID'] = map['ID'];
    mapNew['START_DT'] = map['START_DT'];
    mapNew['START_JIKAN'] = map['START_JIKAN'];

    if (map['AOI_SAGYOSYA_CD']) {
        mapNew['AOI_SAGYOSYA_CD'] = map['AOI_SAGYOSYA_CD'];
    }

    if (map['AOI_NM']) {
        mapNew['AOI_NM'] = map['AOI_NM'];
    }

    if (map['AOI_NAME']) {
        mapNew['AOI_NAME'] = map['AOI_NAME'];
    }

    if (map['ANAAKE_SAGYOSYA']) {
        mapNew['ANAAKE_SAGYOSYA'] = map['ANAAKE_SAGYOSYA'];
    }

    if (map['ANAAKE_SAGYOSYA_NM']) {
        mapNew['ANAAKE_SAGYOSYA_NM'] = map['ANAAKE_SAGYOSYA_NM'];
    }

    if (map['INK_LOT_NO']) {
        mapNew['INK_LOT_NO'] = map['INK_LOT_NO'];
    }


    list.push(mapNew);

    var list2 = new Array();
    var mapNew2 = new Array();
    list2.push(mapNew2);
    TALON.setSearchedDisplayList(2, list);
    TALON.setSearchedDisplayList(3, list2);
    TALON.setSearchedDisplayList(4, list2);
    TALON.setSearchedDisplayList(5, list2);
    TALON.setSearchedDisplayList(6, list2);
    TALON.setSearchedDisplayList(7, list2);

    TALON.setSearchConditionData("ID", "", "");

}



/**
 * 同一行程の前回の設備種情報を取得する。
 */
function getZenkaiSetsubiSyu() {

    var userData = TALON.getUserInfoMap();
    var USER_ID = userData['USER_ID'];
    var FUNC_ID = userData['FUNC_ID'];
    var sql = "SELECT TOP 1 SETUBI_SYU FROM NP_T_INPUT_COMMON WHERE  ( CREATED_BY = '" + USER_ID + "' OR UPDATED_BY = '" + USER_ID + "' ) AND CREATED_PRG_NM = '" + FUNC_ID + "' AND CHK_DELETE IS NULL";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    if (mapList.length == 0) {

        return null;
    }

    return mapList[0];

}

/**
 * 不良情報を NP_T_FURYO テーブルに1件登録する。
 * 
 * カード1のLOT_NOと、カード2の不良情報（FURYO_CD）を用いて、
 * 必須項目が揃っていれば連番を発番し、不良データを登録する。
 */
function setFuryoData() {
    var conn = TALON.getDbConfig();

    var furyoMap = TALON.getBlockData_Card(2);
    var map = TALON.getBlockData_Card(1);

    if (!map['LOT_NO'] || !furyoMap['FURYO_CD']) {
        return; // 必須項目がない場合はスキップ
    }

    furyoMap['ID'] = TALON.getNumberingData('TID', 1)[0];
    furyoMap['LOT_NO'] = map['LOT_NO'];

    insertByMapEx(conn, 'NP_T_FURYO', furyoMap, true); // ログ出力ありで登録
}

/**
 * SIYO_KOTEI_SITEIMEKKI テーブルから、指定された仕様書SEQと工程コードに対応する
 * 任意の1カラムの値を取得する汎用ヘルパー関数。
 *
 * @param {number|string} siyosyoSeq - 仕様書SEQ
 * @param {string} koteiCd - 工程コード（例：'130', '110' など）
 * @param {string} colName - 取得したいカラム名（例：'SITEIMEKKIATSU', 'KASANE'）
 * @returns {*} 指定カラムの値。該当しない場合は null を返す。
 */
function getSiyoKoteiValue(siyosyoSeq, koteiCd, colName) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIYOSYO_SEQ: siyosyoSeq,
        KOUTEI_CD: koteiCd
    };

    var map = selectOne(conn, 'SIYO_KOTEI_SITEIMEKKI', [colName], whereMap, null);
    if (!map) {
        TALON.addErrorMsg("仕様書工程情報が取得できません。SEQ: " + siyosyoSeq + " / 工程: " + koteiCd);
        return null;
    }

    return map[colName];
}


/**
 * 指定された仕様書SEQの「穴あけ」工程に対する重ね枚数（KASANE）を取得する。
 *
 * 対象テーブル：SIYO_KOTEI_SITEIMEKKI  
 * 条件：SIYOSYO_SEQ = 指定値, KOUTEI_CD = '110'
 * ※ 該当データが存在しない場合はTALONエラーメッセージを出力し null を返却。
 *
 * @param {number|string} SIYOSYO_SEQ - 仕様書SEQ
 * @returns {number|null} 重ね枚数（KASANE）、存在しない場合は null
 */
function getKasaneMaisu(SIYOSYO_SEQ) {

    return getSiyoKoteiValue(SIYOSYO_SEQ, "110", "KASANE");
}

/**
 * 指定された仕様書SEQに対応するメッキ厚を取得する（パネル向け）。
 *
 * 条件：SIYOSYO_SEQ = 指定値、KOUTEI_CD = '130' の行を1件取得。
 * 該当レコードが存在しない場合はエラーメッセージを追加し、nullを返却。
 *
 * @param {number|string} SIYOSYO_SEQ - 仕様書SEQ
 * @returns {string|null} 指定メッキ厚（SITEIMEKKIATSU）、存在しなければ null
 */
function getSiteiMekkiAtsu(SIYOSYO_SEQ) {

    return getSiyoKoteiValue(SIYOSYO_SEQ, "130", "SITEIMEKKIATSU");
}


/**
 * 指定された仕様書SEQに対応する仕様書主情報を1件取得する。
 *
 * @param {number|string} SIYOSYO_SEQ - 仕様書SEQ
 * @returns {Object|null} 該当する仕様書情報（SIYOSYO_MAINの1レコード）、なければ null
 */
function getSisyoSyoInfo_light(SIYOSYO_SEQ) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIYOSYO_SEQ: SIYOSYO_SEQ
    };

    return selectOne(conn, 'SIYOSYO_MAIN', null, whereMap, null);
}



/**
 * 指定されたET動圧に対応するスピード（DSP2）を取得する。
 *
 * TLN_M_HANYO_CODE_MAIN テーブルから、
 * SIKIBETU_CODE='ET_DOUATSU' かつ KEY_CODE=ET_DOUATSU の行を1件取得し、
 * 対応する DSP2（スピード値）を返す。
 *
 * @param {string} ET_DOUATSU - ET動圧コード（KEY_CODE）
 * @returns {string|null} DSP2値（該当なしの場合は null）
 */
function getEtSpeed(ET_DOUATSU) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        SIKIBETU_CODE: 'ET_DOUATSU',
        KEY_CODE: ET_DOUATSU
    };

    var map = selectOne(conn, 'TLN_M_HANYO_CODE_MAIN', ['DSP1', 'DSP2'], whereMap, null);
    return map ? map['DSP2'] : null;
}


/**
 * 指定されたLOT_NOに対応するET銅厚（MAX/MIN）情報を取得する。
 *
 * 対象テーブル：NP_T_INPUT_COMMON  
 * 条件：LOT_NO, SAGYO_KU = '130', CHK_DELETE IS NULL  
 * 戻り値：1件のオブジェクト（ET_DOUATSU_MAX, ET_DOUATSU_MIN）または null
 *
 * @param {string} LOT_NO - 対象ロット番号
 * @returns {Object|null} 銅厚情報（ET_DOUATSU_MAX, ET_DOUATSU_MIN）、なければ null
 */
function getEtDouatsu(LOT_NO) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        LOT_NO: LOT_NO,
        SAGYO_KU: '130',
        CHK_DELETE: null
    };

    return selectOne(conn, 'NP_T_INPUT_COMMON', ['ET_DOUATSU_MAX', 'ET_DOUATSU_MIN'], whereMap, null);
}

/**
 * 本日の作業㎡数
 */
function getHonjituSagyo() {

    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];

    var sql = ""
        + " SELECT dbo.RITA_HONJITU_SAGYOM2_SUU('" + func_id + "') AS  HONJITSU_SAGYO_M2_SUU "

    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (mapList.length == 0) {

        return;
    }

    var map = mapList[0];
    var HONJITSU_SAGYO_M2_SUU = map['HONJITSU_SAGYO_M2_SUU'];

    if (!HONJITSU_SAGYO_M2_SUU) {

        return 0;
    }

    return HONJITSU_SAGYO_M2_SUU;

}


/**
 * 工程チェック処理（初期化用）
 *
 * 現在のユーザー機能IDに対して、指定された工程コード（KOUTEI_CD）が
 * COM_M_KOUTEI テーブルに存在するかを確認し、存在すれば true、なければ false を返す。
 *
 * @param {string} KOUTEI_CD - チェック対象の工程コード
 * @returns {boolean} 工程が対象機能に紐づいていれば true、なければ false
 */
function kouteiChk_INIT(KOUTEI_CD) {
    var conn = TALON.getDbConfig();
    var func_id = TALON.getUserInfoMap()['FUNC_ID'];

    var whereMap = {
        KOUTEI_CD: KOUTEI_CD,
        TARGET_FUNC_ID: func_id
    };

    var count = getCount(conn, 'COM_M_KOUTEI', whereMap);
    return count > 0;
}


/**
 * 工程チェック（前工程と現在の機能IDから整合性を判定する）
 *
 * - 特定の工程ペアは例外的にtrue/falseを返す
 * - 対象機能IDが重複登録されていればfalse（登録済エラーメッセージ付き）
 * - 通常は COM_M_KOUTEI に該当レコードがあれば true、なければ false を返す
 *
 * @param {string} KOUTEI_CD - 工程コード
 * @param {string} CREATED_PRG_NM - 前工程の機能ID
 * @param {string} func_id - 現在の機能ID
 * @param {string} LOT_NO - ロット番号
 * @returns {boolean} true: 工程整合OK、false: 不整合 or 重複登録
 */
function kouteiChk_Zenkoutei(KOUTEI_CD, CREATED_PRG_NM, func_id, LOT_NO) {
    // 特例1: 内層露光 → Et
    if (CREATED_PRG_NM === 'NIPPO_INPUT_01') {
        if (func_id === 'NIPPO_INPUT_01') return false;
        if (func_id === 'NIPPO_INPUT_02') return true;
    }

    // 特例2: ソルダーレジスト研磨 → 露光
    if (CREATED_PRG_NM === 'NIPPO_INPUT_13') {
        if (func_id === 'NIPPO_INPUT_13') return false;
        if (func_id === 'NIPPO_INPUT_14') return true;
    }

    // 重複登録チェック対象機能ID一覧
    var dupCheckTarget = {
        'NIPPO_INPUT_23': true,
        'NIPPO_INPUT_26': (CREATED_PRG_NM !== 'NIPPO_INPUT_24' && CREATED_PRG_NM !== 'NIPPO_INPUT_25'),
        'NIPPO_INPUT_28': true,
        'NIPPO_INPUT_29': true,
        'NIPPO_INPUT_29_AVI': true,
        'NIPPO_INPUT_30': true,
        'NIPPO_INPUT_31': true,
        'NIPPO_INPUT_32': true
    };

    if (dupCheckTarget[func_id]) {
        var conn = TALON.getDbConfig();
        var whereMap = {
            CREATED_PRG_NM: func_id,
            CHK_DELETE: null,
            LOT_NO: LOT_NO
        };
        var count = getCount(conn, 'NP_T_INPUT_COMMON', whereMap);
        if (count > 0) {
            TALON.addErrorMsg("既に当工程は登録済みです。ご確認ください。");
            return false;
        }
        return true;
    }

    // 通常の工程マスタチェック
    var conn = TALON.getDbConfig();
    var masterWhere = {
        KOUTEI_CD: KOUTEI_CD,
        TARGET_FUNC_ID: func_id
    };

    var masterCount = getCount(conn, 'COM_M_KOUTEI', masterWhere);
    return masterCount > 0;
}


/**
 * 工程進捗状況管理テーブルにデータ登録.
 */
function insertKOUTEI_SINTYOKU() {


}

/**
 * 検索ボタンか確定ボタンが押下された場合True
 */
function isClickKensakuKakutei() {

    var buttonName = TALON.getButtonName();
    if (buttonName != '検索' && buttonName != '確定') {
        return false;
    }

    return true;
}

/**
 * 検索対象検索
 * @returns 
 */
function getKENSAKU_TAISYO(SEARCH) {

    var sql = "SELECT * FROM TLN_M_HANYO_CODE_MAIN WHERE SIKIBETU_CODE = 'KENSAKU_TAISYO' AND KEY_CODE ='" + SEARCH + "' ORDER BY UPDATED_DATE DESC";

    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}


function ijyou() {

    if (TALON.getButtonName() != '検索') {
        return;
    }

    //LOT_NOの取得
    var map = TALON.getBlockData_Card(2);
    var LOT_NO = null;
    if (map) {
        LOT_NO = map['LOT_NO'];

    } else {
        var lineDataMap = TALON.getConditionData();
        LOT_NO = lineDataMap['SEARCH_LOT_NO']
    }

    if (!LOT_NO) {
        // ロット番号が存在しない場合は処理を行わない
        return;
    }

    //本日報画面のTARGET_FUNCの取得
    var nowUserData = TALON.getUserInfoMap();
    var func_id = nowUserData['FUNC_ID'];

    var sql = "SELECT KEY_CODE FROM TLN_M_HANYO_CODE_MAIN WHERE SIKIBETU_CODE = 'SAGYOUKU_2' AND DSP2 = '" + func_id + "'";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (mapList.length == 0) {
        return;
    }
    var map = mapList[0];
    if (map) {
        var KEY_CODE = map['KEY_CODE'];
        sql = "SELECT COUNT(*) CNT FROM RS_T_IJO_HOKOKUSYO WHERE LOT_NO = '" + LOT_NO + "' AND TAISYOUGAMEN like '%" + KEY_CODE + "%' AND EXISTS(SELECT 'X' FROM WFS_T_WORKFLOW WHERE OBJECT_ID = RS_T_IJO_HOKOKUSYO.ID AND WORK_ID = RS_T_IJO_HOKOKUSYO.WORK_ID)";
        mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        map = mapList[0];
        var CNT = map['CNT'];
    }
    if (CNT) {
        if (CNT > 0) {
            TALON.addErrorMsg("異常報告書を確認してください。")
        }
    }
}

function ijyouCheck() {

    if (TALON.getButtonName() != '確定') {
        return;
    }
}

function claimGazo(x) {

    var buttonName = TALON.getButtonName();
    if (buttonName != '検索' && buttonName != '確定') {
        return;
    }

    var itemBlockList = TALON.getBlockData_List(x);

    if (!itemBlockList) {

        return;

    }

    if (itemBlockList.length > 0) {
        var newList = [];
        for (var i = 0; i < itemBlockList.length; i++) {
            var lineDataMap = itemBlockList[i];
            if (buttonName == '確定') {
                lineDataMap['KAKUNIN'] = '1';
            } else {
                lineDataMap['KAKUNIN'] = '0';
            }
            newList.push(lineDataMap);
        }
        TALON.setSearchedDisplayList(x, newList);
    }
}

function afterOBIC() {
    var map = TALON.getBlockData_Card(2);
    var LOT_NO = map['LOT_NO'];
    var SAGYO_KU = map['SAGYO_KU'];
    var ID = map['ID'];

    if (!LOT_NO || !SAGYO_KU || !ID) {
        return;
    }
    var LotKey = LOT_NO + ID;

    var CHK_DELETE = TALON.getBlockRequestParameter('2_CHK_DELETE');
    if (!CHK_DELETE) {
        var CHK_DELETE = map['CHK_DELETE'];
    }

    var sql = "SELECT COUNT(*) CNT FROM T0000RK_NippouJisseki_Renkei WHERE LotKey = '"
        + LotKey + "' AND ShoriKBN <> 'DELETE'";
    var mapList = TalonDbUtil.select(TALON.getOtherDBConn("2"), sql);
    var map1 = mapList[0];
    var CNT = map1['CNT'];

    if (CNT == 1) {

        sql = "UPDATE T0000RK_NippouJisseki_Renkei SET ShoriKBN = 'INSERT' WHERE LotKey = '" + LotKey + "'";
        TalonDbUtil.begin(TALON.getOtherDBConn("2"));
        TalonDbUtil.update(TALON.getOtherDBConn("2"), sql);
        TalonDbUtil.commit(TALON.getOtherDBConn("2"));
    }

    if (CHK_DELETE) {
        if (CHK_DELETE == "1" || CHK_DELETE.equals("1")) {

            sql = "SELECT COUNT(*) CNT FROM T0000RK_NippouJisseki_Renkei WHERE LotKey = '" + LotKey + "'";
            mapList = TalonDbUtil.select(TALON.getOtherDBConn("2"), sql);
            map1 = mapList[0];
            CNT = map1['CNT'];
            if (CNT == 0) {
                return;
            }

            sql = "UPDATE T0000RK_NippouJisseki_Renkei SET ShoriKBN = 'DELETE' WHERE LotKey = '" + LotKey + "'";
            TalonDbUtil.begin(TALON.getOtherDBConn("2"));
            TalonDbUtil.update(TALON.getOtherDBConn("2"), sql);
            TalonDbUtil.commit(TALON.getOtherDBConn("2"));
        }
    }
}

/**
 * 指定されたロット番号とIDに基づいて、入力データを取得し、マッピング情報を更新する関数。
 * 
 * @param {*} LOT_NO - 検索対象のロット番号。
 * @param {*} ID - 除外するID。
 * @param {*} CURRENT_KOUTEI_JUN - 現在の工程順。
 * @param {*} map - 更新対象のマッピング情報。
 * @returns {*} - 更新されたマッピング情報。
 */
function getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map) {
    // 定数の定義
    var TOP_LIMIT = 1; // 取得する件数
    var TABLE_NAME = "NP_T_INPUT_COMMON"; // テーブル名
    var USER_TABLE_NAME = "COM_M_USER"; // ユーザーテーブル名
    var SQL_WHERE_CLAUSE = " WHERE LOT_NO = '";
    var SQL_JOIN_CLAUSE = " INNER JOIN " + USER_TABLE_NAME + " ON " +
        TABLE_NAME + ".TANTO_SYA_CD = " + USER_TABLE_NAME + ".USER_ID";

    // SQLクエリの構築
    var sql = ""
        + "SELECT TOP " + TOP_LIMIT + " ID AS ID "
        + "FROM " + TABLE_NAME
        + SQL_WHERE_CLAUSE + LOT_NO + "'"
        + " AND ID <> '" + ID + "'"
        + " AND CHK_DELETE IS NULL"
        + " AND TANTO_SYA_CD IS NOT NULL"
        + " AND CURRENT_KOUTEI_JUN < " + CURRENT_KOUTEI_JUN
        + " ORDER BY ID DESC";

    // クエリ実行と結果の取得
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

    // 結果が空の場合、引数の map を返す
    if (!mapList || mapList.length === 0) {
        return map;
    }

    // 取得したIDを元に、詳細情報を取得するSQLの構築
    var map2 = mapList[0];
    var ID2 = map2.ID;

    var sql2 = "SELECT " + TABLE_NAME + ".*, " + USER_TABLE_NAME + ".USER_NM "
        + "FROM " + TABLE_NAME
        + SQL_JOIN_CLAUSE
        + " WHERE ID = '" + ID2 + "'"
        + " AND CHK_DELETE IS NULL";

    var mapList3 = TalonDbUtil.select(TALON.getDbConfig(), sql2);

    // 結果が空の場合、引数の map を返す
    if (!mapList3 || mapList3.length === 0) {
        return map;
    }

    // 取得したデータに CURRENT_KOUTEI_JUN を追加
    var map3 = mapList3[0];
    map3.CURRENT_KOUTEI_JUN = CURRENT_KOUTEI_JUN;

    // 更新されたマップを返す
    return map3;
}



/**
 * デスミア対象の過去工程について、SAGYO_KUを切り替えて日報データを作成します。
 *
 * @param {Object} map - 元となる日報マップ（getNippoMapNonId済）
 * @param {number} currentKouteiJun - 現在の工程順（数値）
 * @param {string} siyosyoSeq - 仕様書SEQ
 */
function insertDesmiaForPreviousSteps(map, currentKouteiJun, siyosyoSeq) {
    for (var offset = 1; offset <= 3; offset++) {
        var targetJun = currentKouteiJun - offset;
        var kouteiCd = getKouteiCd(siyosyoSeq, targetJun);
        if (!kouteiCd) continue;

        map['SAGYO_KU'] = kouteiCd;
        map['CREATED_PRG_NM'] = "NIPPO_INPUT_33";

        var inserted = insOther(map);
        insOtherOBIC(inserted);
    }
}

function insDesmia() {
    if (!(TALON.isInsert() || TALON.isUpdate())) return;

    var ID = TALON.getTargetData()['ID'];
    if (!ID) return;

    var map = selectOne(
        TALON.getDbConfig(),
        "NP_T_INPUT_COMMON INNER JOIN COM_M_USER ON NP_T_INPUT_COMMON.TANTO_SYA_CD = COM_M_USER.USER_ID",
        "NP_T_INPUT_COMMON.*, COM_M_USER.USER_NM",
        { ID: ID, CHK_DELETE: null },
        null
    );
    if (!map || !map['END_DT'] || !map['END_JIKAN'] || !map['CURRENT_KOUTEI_JUN']) return;

    var LOT_NO = map['LOT_NO'];
    var CURRENT_KOUTEI_JUN = parseInt(map['CURRENT_KOUTEI_JUN']);
    map = getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map);
    map['FURYO_PCS_SUU'] = 0;
    map['KAKO_ID'] = null;

    insertDesmiaForPreviousSteps(map, CURRENT_KOUTEI_JUN, map['SIYOSYO_SEQ']);
}


/**
 * デスミア加工情報を自動生成します。
 * 
 * 対象作業区が 130～135 の場合に、直前工程（最大3工程分）に対して
 * 日報データを複製し、工程CDを変更した上で挿入処理を行います。
 * 
 * TALON.isInsert() または TALON.isUpdate() の場合に実行されます。
 */
function insDesmiaKako() {
    if (!(TALON.isInsert() || TALON.isUpdate())) return;

    var lineDataMap = TALON.getTargetData();
    var ID = lineDataMap['ID'];
    if (!ID) return;

    var SAGYO_KU = lineDataMap['SAGYO_KU'];
    if (!SAGYO_KU || !['130', '131', '132', '133', '134', '135'].includes(SAGYO_KU)) return;

    var map = selectOne(TALON.getDbConfig(), "NP_T_INPUT_COMMON", "*", { ID: ID, CHK_DELETE: null }, null);
    if (!map || !map['END_DT'] || !map['END_JIKAN'] || !map['CURRENT_KOUTEI_JUN']) return;

    var LOT_NO = map['LOT_NO'];
    var CURRENT_KOUTEI_JUN = parseInt(map['CURRENT_KOUTEI_JUN']);
    map = getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map);
    map['USER_NM'] = TALON.getUserInfoMap()['USER_NM'];
    map['FURYO_PCS_SUU'] = 0;
    map['KAKO_ID'] = null;

    insertDesmiaForPreviousSteps(map, CURRENT_KOUTEI_JUN, map['SIYOSYO_SEQ']);
}


function junbiOBICNippo() {

    // 廃止
}



function tyuiKankiHyouji() {
    var lineDataMap = TALON.getConditionData();

    var ADD_SQL = lineDataMap['ADD_SQL'];
    var sql = getBodySql('TYUIKANKI_HYOUJI2');
    sql = sql + ADD_SQL + "  ORDER BY LOT_NO DESC";

    var listDisp = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var colList = _getColList(TALON.getDbConfig(), 'COM_T_TYUI_HYOJI');


    TalonDbUtil.begin(TALON.getDbConfig());
    TalonDbUtil.delete(TALON.getDbConfig(), 'DELETE FROM COM_T_TYUI_HYOJI')
    TalonDbUtil.insertByArray(TALON.getDbConfig(), 'COM_T_TYUI_HYOJI', listDisp, colList);
    TalonDbUtil.commit(TALON.getDbConfig());
}


function kouteiChk_27(LOT_NO) {
    //仕様検査の有無
    var sql = "SELECT COUNT(*) CNT FROM NP_T_INPUT_COMMON WHERE CREATED_PRG_NM = 'NIPPO_INPUT_26' AND CHK_DELETE IS NULL"
        + " AND LOT_NO = '" + LOT_NO + "' ";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var map = mapList[0];
    var CNT = map['CNT'];
    if (CNT == 0) {
        TALON.addErrorMsg("仕様検査機能で入力していません、ご確認ください。")
        return false;
    }

    //重複登録
    var sql = "SELECT COUNT(*) CNT FROM NP_T_INPUT_COMMON WHERE CREATED_PRG_NM = 'NIPPO_INPUT_27' AND CHK_DELETE IS NULL "
        + " AND LOT_NO = '" + LOT_NO + "' ";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var map = mapList[0];
    var CNT = map['CNT'];
    if (CNT > 0) {
        TALON.addErrorMsg("既に当工程で入力済みです。ご確認ください。")
        return false;
    }

    return true;
}

/**
 * NP_T_INPUT_COMMON テーブルに指定された ID のレコードが存在するか確認する
 *
 * @param {string} ID - 確認対象のID
 * @returns {boolean} レコードが存在する場合 true、存在しない場合 false
 */
function isExistsCommon(ID) {
    var conn = TALON.getDbConfig();
    var whereMap = { ID: ID };
    return getCount(conn, "NP_T_INPUT_COMMON", whereMap) > 0;
}

function insDouatsu() {
    var Double = java.lang.Double;

    var itemBlockList = TALON.getBlockData_List(3);
    if (itemBlockList.length > 0) {
        var DOUATSU = TALON.getBlockRequestParameter('3_DOUATSU', 0);
        if (DOUATSU) {
            DOUATSU = Double.parseDouble(DOUATSU);
            var min = DOUATSU;
            var max = DOUATSU;
            var sum = DOUATSU;

            for (var i = 1; i < itemBlockList.length; i++) {
                var DOUATSU = TALON.getBlockRequestParameter('3_DOUATSU', i);
                if (DOUATSU) {
                    DOUATSU = Double.parseDouble(DOUATSU);
                    if (DOUATSU < min) {
                        min = DOUATSU;
                    }
                    if (DOUATSU > max) {
                        max = DOUATSU;
                    }
                    sum = sum + DOUATSU;
                } else {

                }
            }

            var ave = sum / (itemBlockList.length);

            var lineDataMap = TALON.getBlockData_Card(2)
            var ID = lineDataMap['ID'];
            if (isExistsCommon(ID)) {
                var map = {};
                var colList = [
                    'ID'
                    , 'JISSOKU_MEKKI_ATSU_MIN'
                    , 'JISSOKU_MEKKI_ATSU_MAX'
                    , 'JISSOKU_MEKKI_ATSU_AVE'
                    , 'ET_DOUATSU_MIN'
                    , 'ET_DOUATSU_MAX'
                    , 'UPDATED_DATE'
                ];
                var sysDate = new java.util.Date();
                var sysDate = new java.sql.Date(sysDate.getTime());
                map['ID'] = ID;
                map['JISSOKU_MEKKI_ATSU_MIN'] = min;
                map['JISSOKU_MEKKI_ATSU_MAX'] = max;
                map['JISSOKU_MEKKI_ATSU_AVE'] = ave;
                map['ET_DOUATSU_MIN'] = min;
                map['ET_DOUATSU_MAX'] = max;
                map['UPDATED_DATE'] = sysDate;

                var whereList = new Array();
                whereList.push([null, '=', 'ID']);

                TalonDbUtil.updateByMap(TALON.getDbConfig(), 'NP_T_INPUT_COMMON', map, colList, whereList);
            }
        } else {
        }
    }
}


function getFuryo(i) {

    var Integer = java.lang.Integer;

    var lineDataMap = TALON.getBlockData_Card(2);
    var ID = lineDataMap['ID'];
    var SAGYO_PCS_SUU = TALON.getBlockRequestParameter('2_SAGYO_PCS_SUU');
    var FURYO_PCS_SUU = 0;

    if (!SAGYO_PCS_SUU) {
        var SAGYO_PCS_SUU = lineDataMap['SAGYO_PCS_SUU'];
    }

    if (!SAGYO_PCS_SUU) {
        return;
    }

    var GOUKAKU_PCS_SUU = Integer.parseInt(SAGYO_PCS_SUU, 10);

    var itemBlockList = TALON.getBlockData_List(i);
    if (itemBlockList.length > 0) {
        for (var i = 0; i < itemBlockList.length; i++) {
            var MIRENKEI_FLG = TALON.getBlockRequestParameter('3_MIRENKEI_FLG', i);
            if (MIRENKEI_FLG) {
                if (MIRENKEI_FLG == "1" && MIRENKEI_FLG.equals("1")) {
                    continue;
                }
            }
            var FURYO_SUU = TALON.getBlockRequestParameter('3_FURYO_SUU', i);
            if (FURYO_SUU) {
                FURYO_SUU = Integer.parseInt(FURYO_SUU, 10);
            }
            var SYUSEI_SUU = TALON.getBlockRequestParameter('3_SYUSEI_SUU', i);
            if (SYUSEI_SUU) {
                SYUSEI_SUU = Integer.parseInt(SYUSEI_SUU, 10);
                if (FURYO_SUU) {
                    FURYO_SUU -= SYUSEI_SUU;
                }
            }
            if (FURYO_SUU) {
                FURYO_PCS_SUU += FURYO_SUU;
                GOUKAKU_PCS_SUU -= FURYO_SUU;
            }
        }
    }

    if (isExistsCommon(ID)) {
        var map = {};
        var colList = [
            'ID'
            , 'GOUKAKU_PCS_SUU'
            , 'FURYO_PCS_SUU'
            , 'UPDATED_DATE'
        ];
        var sysDate = new java.util.Date();
        var sysDate = new java.sql.Date(sysDate.getTime());
        map['ID'] = ID;
        map['GOUKAKU_PCS_SUU'] = GOUKAKU_PCS_SUU;
        map['FURYO_PCS_SUU'] = FURYO_PCS_SUU;
        map['UPDATED_DATE'] = sysDate;

        var whereList = new Array();
        whereList.push([null, '=', 'ID']);

        TalonDbUtil.updateByMap(TALON.getDbConfig(), 'NP_T_INPUT_COMMON', map, colList, whereList);
    }
}

function confirmDelete() {


    chkIjoHokokusyo()
    var map = TALON.getBlockData_Card(2);
    var CHK_DELETE = TALON.getBlockRequestParameter('2_CHK_DELETE');
    if (!CHK_DELETE) {
        var CHK_DELETE = map['CHK_DELETE'];
    }
    if (CHK_DELETE) {
        if (CHK_DELETE == "1" || CHK_DELETE.equals("1")) {
            var exec_flg = '0';
            var msg_id = TALON.getDialogRes().getMsgId();
            if (null == msg_id) {
                //最初の処理
                TALON.createConfirm('削除しても良いでしょうか？', 'MESSAGE_ID_000', 'START', null);
                //処理としては確定したくないので、フラグを立てて最後にROLLBACK させる
                exec_flg = '1';
            } else if ('MESSAGE_ID_000' == msg_id) {
                //設定したID が返ってきたので、クライアントからの返答ありとして以下に処理を記述
                exec_flg = '0';
            }
            if (exec_flg == '0') {
                var ID = map['ID'];
                var LOT_NO = map['LOT_NO'];
                if (!isNewest(ID, LOT_NO)) {
                    TALON.addErrorMsg("最新の工程ではありません。削除できません。");
                    TALON.setIsSuccess(false);
                }
            } else {
                TALON.setIsSuccess(false);
            }
        }
    }
}

/**
 * 異常報告書未確認チェック
 */
function chkIjoHokokusyo() {

    var map = TALON.getBlockData_Card(2);
    var LOT_NO = map['LOT_NO'];
    var END_DT = map['END_DT'];

    if (!END_DT) {

        return;
    }
    var sql = ""
        + " SELECT COUNT(*) CNT FROM NP_T_IJO_KAKUNIN INNER JOIN RS_T_IJO_HOKOKUSYO ON RS_T_IJO_HOKOKUSYO.ID = NP_T_IJO_KAKUNIN.ID WHERE NP_T_IJO_KAKUNIN.LOT_NO = '" + LOT_NO + "' AND KAKUNIN_CHK IS NULL AND EXISTS(SELECT 'X' FROM WFS_T_WORKFLOW WHERE OBJECT_ID = RS_T_IJO_HOKOKUSYO.ID AND WORK_ID = RS_T_IJO_HOKOKUSYO.WORK_ID)";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var CNT = mapList[0]['CNT']

    if (0 < CNT) {

        TALON.addErrorMsg("異常報告書を全て確認できていません、異常報告タブを確認してください。");
        TALON.setIsSuccess(false);
    }
}

function isNewest(ID, LOT_NO) {
    var sql = " SELECT ID FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO
        + "' AND CHK_DELETE IS NULL ORDER BY ID DESC "
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (mapList.length > 0) {
        map = mapList[0];
        if (map['ID']) {
            if (ID == map['ID'] || ID.equals(map['ID'])) {
                return true;
            }
        }
    }
    return false;
}

function confirmDeletePress() {
    var map = TALON.getTargetData();
    var PID = map['PID'];
    var LOT_NO = map['LOT_NO'];
    if (isNewestPress(PID, LOT_NO)) {
        deletePress(PID, LOT_NO);
    }

}


function isNewestPress(PID, LOT_NO) {
    var sql = " SELECT ID FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO
        + "' AND PID = '" + PID + "' AND CHK_DELETE IS NULL ORDER BY ID DESC "
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        if (map['ID']) {

            var sqlEnd = " SELECT END_DT, END_JIKAN FROM NP_T_INPUT_COMMON WHERE ID = '" + map['ID']
                + "' AND CHK_DELETE IS NULL ";
            var mapListEnd = TalonDbUtil.select(TALON.getDbConfig(), sqlEnd);
            if (mapListEnd.length > 0) {
                var mapEnd = mapListEnd[0];
                if (mapEnd['END_DT'] && mapEnd['END_JIKAN']) {
                    TALON.addErrorMsg("既に報告しました。削除できません。");
                    return false;
                }
            }
            var sqlNew = " SELECT ID FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO
                + "' AND CHK_DELETE IS NULL ORDER BY ID DESC ";
            var mapListNew = TalonDbUtil.select(TALON.getDbConfig(), sqlNew);
            if (mapListNew.length > 0) {
                var mapNew = mapListNew[0];
                if (mapNew['ID']) {
                    if (mapNew['ID'] != map['ID']) {
                        TALON.addErrorMsg("最新の工程ではありません。削除できません。");
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
    return true;
}

/**
 * プレス構成データと対応する作業データを論理削除（CHK_DELETE = '1'）
 *
 * @param {string} PID - プレス構成ID
 * @param {string} LOT_NO - ロット番号
 */
function deletePress(PID, LOT_NO) {
    var conn = TALON.getDbConfig();

    // 他ロットに存在するかチェック
    var sqlCNT = ""
        + "SELECT COUNT(*) CNT "
        + "FROM NP_T_PRESS_STRUCT_SINGLE S "
        + "INNER JOIN NP_T_INPUT_COMMON C ON S.PID = C.PID "
        + "WHERE S.PID = '" + PID + "' "
        + "AND C.LOT_NO <> '" + LOT_NO + "' "
        + "AND S.CHK_DELETE IS NULL "
        + "AND C.CHK_DELETE IS NULL";

    var countMap = selectOne(conn, null, sqlCNT, null, null);
    var CNT = countMap ? Number(countMap['CNT']) : 0;

    // 他ロットに存在しなければ、構成データを論理削除
    if (CNT === 0) {
        var map = { CHK_DELETE: '1', PID: PID };
        var whereKey = ['PID']
        updateByMapEx(conn, 'NP_T_PRESS_STRUCT_SINGLE', map, whereKey, true);
    }

    // NP_T_INPUT_COMMON の該当レコードを論理削除
    var sqlIDs = ""
        + "SELECT ID FROM NP_T_INPUT_COMMON "
        + "WHERE LOT_NO = '" + LOT_NO + "' "
        + "AND PID = '" + PID + "' "
        + "AND CHK_DELETE IS NULL";

    var mapList = TalonDbUtil.select(conn, sqlIDs);
    for (var i = 0; i < mapList.length; i++) {
        var ID = mapList[i]['ID'];
        if (ID) {
            var delMap = { CHK_DELETE: '1', ID: ID };
            var whereKey = ['ID']
            updateByMapEx(conn, 'NP_T_INPUT_COMMON', delMap, whereKey, true);
        }
    }
}


function insOtherKako() {

    //パネルメッキの場合に、フィルドメッキの登録
    //外形の場合に、Vカットの登録
    var lineDataMap = TALON.getBlockData_Card(1)
    var KAKO_IRAI_SYO_KBN = TALON.getBlockRequestParameter('1_KAKO_IRAI_SYO_KBN');
    if (!KAKO_IRAI_SYO_KBN) {
        KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
        if (!KAKO_IRAI_SYO_KBN) {
            return;
        }
    }

    //外注先の取得
    var GAITYUSAKI = TALON.getBlockRequestParameter('1_GAITYUSAKI');
    if (!GAITYUSAKI) {
        GAITYUSAKI = lineDataMap['GAITYUSAKI'];
        if (!GAITYUSAKI) {
            return;
        }
    }

    //240422 印刷追加
    if ((KAKO_IRAI_SYO_KBN == "01") || (KAKO_IRAI_SYO_KBN == "05") || (KAKO_IRAI_SYO_KBN == "07" && GAITYUSAKI == "89185000") || (KAKO_IRAI_SYO_KBN == "09" && GAITYUSAKI != "89023000") || (KAKO_IRAI_SYO_KBN == "13")) {
        var lineDataMap = TALON.getTargetData();
        var ID = lineDataMap['ID'];
        if (!ID) {
            return;
        }

        //金加工
        if (KAKO_IRAI_SYO_KBN == "01") {
            var sql = " SELECT * FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL ";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                var map1 = mapList[0];
                var HYOMEN_SYORI = map1['HYOMEN_SYORI'];
                //表面処理は鉛フリー
                if (HYOMEN_SYORI == "8" || HYOMEN_SYORI == "9" || HYOMEN_SYORI == "17") {
                    sql = getBodySql('SUB_NIPPO_HIKITUGI') + " WHERE NIPPO_HIKITUGI_VIEW.ID = '" + ID + "'";
                    mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                    if (mapList.length > 0) {
                        map = mapList[0];
                        CURRENT_KOUTEI_CD = map['CURRENT_KOUTEI_CD'];
                        //次工程が鉛フリー
                        if (CURRENT_KOUTEI_CD == "290" || CURRENT_KOUTEI_CD == "295" || CURRENT_KOUTEI_CD == "300") {
                            map1['SAGYO_KU'] = CURRENT_KOUTEI_CD;
                            map1['BEFORE_KOUTEI_JUN'] = map['BEFORE_KOUTEI_JUN'];
                            map1['BEFORE_KOUTEI_CD'] = map['BEFORE_KOUTEI_CD'];
                            map1['CURRENT_KOUTEI_JUN'] = map['CURRENT_KOUTEI_JUN'];
                            map1['CURRENT_KOUTEI_CD'] = CURRENT_KOUTEI_CD;
                            map1['NEXT_KOUTEI_JUN'] = map['NEXT_KOUTEI_JUN'];
                            map1['NEXT_KOUTEI_CD'] = map['NEXT_KOUTEI_CD'];
                            map1['END_DT'] = map['START_DT'];
                            map1['END_JIKAN'] = map['START_JIKAN'];
                            map1['CREATED_PRG_NM'] = "NIPPO_INPUT_19";
                            map1['TANKA'] = null;
                            map1['HACCHU_GAKU'] = null;
                            map1['SANSYO_HACCHU_GAKU'] = null;
                            map1['KAKO_ID'] = null;

                            // map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                            var userInfoMap = TALON.getUserInfoMap();
                            map1['USER_NM'] = userInfoMap['USER_NM'];

                            var map1 = insOther(map1);
                            insOtherOBIC(map1);
                        }
                    }
                }
            }
        }

        //レーザ穴あけ
        if (KAKO_IRAI_SYO_KBN == "05") {
            var sql = getBodySql('SUB_NIPPO_HIKITUGI') + " WHERE NIPPO_HIKITUGI_VIEW.ID = '" + ID + "'";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                var map = mapList[0];
                var CURRENT_KOUTEI_CD = map['CURRENT_KOUTEI_CD'];

                var CURRENT_SOSHO_KOUTEI_CD = map['CURRENT_SOSHO_KOUTEI_CD'];
                //次工程はレーザ穴あけではない場合
                if (CURRENT_SOSHO_KOUTEI_CD != "100") {
                    return;
                }

                var sql1 = "SELECT * FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";
                var mapList1 = TalonDbUtil.select(TALON.getDbConfig(), sql1);
                if (mapList1.length == 0) {
                    return;
                }
                var map1 = mapList1[0];

                var kouteijun = _getCurrentKouteiJun(map1['SIYOSYO_SEQ'], CURRENT_KOUTEI_CD);
                map1['SAGYO_KU'] = CURRENT_KOUTEI_CD;
                map1['BEFORE_KOUTEI_JUN'] = map['BEFORE_KOUTEI_JUN'];
                map1['BEFORE_KOUTEI_CD'] = map['BEFORE_KOUTEI_CD'];
                map1['CURRENT_KOUTEI_JUN'] = kouteijun;
                map1['CURRENT_KOUTEI_CD'] = CURRENT_KOUTEI_CD;
                map1['NEXT_KOUTEI_JUN'] = map['NEXT_KOUTEI_JUN'];
                map1['NEXT_KOUTEI_CD'] = map['NEXT_KOUTEI_CD'];
                map1['TANKA'] = null;
                map1['HACCHU_GAKU'] = null;
                map1['SANSYO_HACCHU_GAKU'] = null;

                map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                insOther(map1);
            }
        }

        //メッキ
        if (KAKO_IRAI_SYO_KBN == "07") {
            var sql = getBodySql('SUB_NIPPO_HIKITUGI') + " WHERE NIPPO_HIKITUGI_VIEW.ID = '" + ID + "'";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                var map = mapList[0];
                var CURRENT_KOUTEI_CD = map['CURRENT_KOUTEI_CD'];

                var CURRENT_SOSHO_KOUTEI_CD = map['CURRENT_SOSHO_KOUTEI_CD'];
                //次工程はメッキではない場合
                if (CURRENT_SOSHO_KOUTEI_CD != "130") {
                    return;
                }


                var sql1 = "SELECT * FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";
                var mapList1 = TalonDbUtil.select(TALON.getDbConfig(), sql1);
                if (mapList1.length == 0) {
                    return;
                }
                var map1 = mapList1[0];
                var kouteijun = _getCurrentKouteiJun(map1['SIYOSYO_SEQ'], CURRENT_KOUTEI_CD);

                map1['SAGYO_KU'] = CURRENT_KOUTEI_CD;
                map1['BEFORE_KOUTEI_JUN'] = map['BEFORE_KOUTEI_JUN'];
                map1['BEFORE_KOUTEI_CD'] = map['BEFORE_KOUTEI_CD'];
                map1['CURRENT_KOUTEI_JUN'] = kouteijun;
                map1['CURRENT_KOUTEI_CD'] = CURRENT_KOUTEI_CD;
                map1['NEXT_KOUTEI_JUN'] = map['NEXT_KOUTEI_JUN'];
                map1['NEXT_KOUTEI_CD'] = map['NEXT_KOUTEI_CD'];
                map1['TANKA'] = null;
                map1['HACCHU_GAKU'] = null;
                map1['SANSYO_HACCHU_GAKU'] = null;

                map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                insOther(map1);
            }
        }

        //Vカット
        if (KAKO_IRAI_SYO_KBN == "09") {
            var sql = getBodySql('SUB_NIPPO_HIKITUGI') + " WHERE NIPPO_HIKITUGI_VIEW.ID = '" + ID + "'";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                var map = mapList[0];
                var CURRENT_KOUTEI_CD = map['CURRENT_KOUTEI_CD'];
                var CURRENT_SOSHO_KOUTEI_CD = map['CURRENT_SOSHO_KOUTEI_CD'];
                //次工程はVカットではない場合
                if (CURRENT_SOSHO_KOUTEI_CD != "350") {
                    return;
                }
                var sql1 = "SELECT * FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";
                var mapList1 = TalonDbUtil.select(TALON.getDbConfig(), sql1);
                if (mapList1.length == 0) {
                    return;
                }
                var map1 = mapList1[0];
                map1['SAGYO_KU'] = CURRENT_KOUTEI_CD;
                map1['BEFORE_KOUTEI_JUN'] = map['BEFORE_KOUTEI_JUN'];
                map1['BEFORE_KOUTEI_CD'] = map['BEFORE_KOUTEI_CD'];
                map1['CURRENT_KOUTEI_JUN'] = map['CURRENT_KOUTEI_JUN'];
                map1['CURRENT_KOUTEI_CD'] = CURRENT_KOUTEI_CD;
                map1['NEXT_KOUTEI_JUN'] = map['NEXT_KOUTEI_JUN'];
                map1['NEXT_KOUTEI_CD'] = map['NEXT_KOUTEI_CD'];
                map1['CREATED_PRG_NM'] = 'NIPPO_INPUT_21';
                map1['UPDATED_PRG_NM'] = 'NIPPO_INPUT_21';
                map1['TANKA'] = null;
                map1['HACCHU_GAKU'] = null;
                map1['SANSYO_HACCHU_GAKU'] = null;
                map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                insOther(map1);
            }
        }

        //240422 印刷
        if (KAKO_IRAI_SYO_KBN == "13") {
            var sql = getBodySql('SUB_NIPPO_HIKITUGI') + " WHERE NIPPO_HIKITUGI_VIEW.ID = '" + ID + "'";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                var map = mapList[0];
                var sql1 = "SELECT * FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";
                var mapList1 = TalonDbUtil.select(TALON.getDbConfig(), sql1);
                if (mapList1.length == 0) {
                    return;
                }
                var map1 = mapList1[0];
                map1['SAGYO_KU'] = map['CURRENT_KOUTEI_CD'];
                map1['BEFORE_KOUTEI_JUN'] = map['BEFORE_KOUTEI_JUN'];
                map1['BEFORE_KOUTEI_CD'] = map['BEFORE_KOUTEI_CD'];
                map1['CURRENT_KOUTEI_JUN'] = map['CURRENT_KOUTEI_JUN'];
                map1['CURRENT_KOUTEI_CD'] = map['CURRENT_KOUTEI_CD'];
                map1['NEXT_KOUTEI_JUN'] = map['NEXT_KOUTEI_JUN'];
                map1['NEXT_KOUTEI_CD'] = map['NEXT_KOUTEI_CD'];
                map1['CREATED_PRG_NM'] = 'NIPPO_INPUT_14';
                map1['UPDATED_PRG_NM'] = 'NIPPO_INPUT_14';
                map1['TANKA'] = null;
                map1['HACCHU_GAKU'] = null;
                map1['SANSYO_HACCHU_GAKU'] = null;
                map1['ID'] = TALON.getNumberingData('TID', 1)[0];
                insOther(map1);
            }
        }
    }
}

/**
 * NP_T_INPUT_COMMON テーブルにレコードを挿入または更新する。
 *
 * <p>
 * 対象のロット・作業区・工程順・作成プログラム名に一致するレコードが存在すれば更新、存在しなければ新規登録を行う。
 * </p>
 *
 * @param {Object} map - 登録または更新するデータマップ（LOT_NO, SAGYO_KU, CURRENT_KOUTEI_JUN, CREATED_PRG_NM を含む必要がある）
 * @returns {Object} 処理後の map（ID が付与された状態）
 */
function insOther(map) {
    var conn = TALON.getDbConfig();

    // 既存レコードの存在チェック
    var whereMap = {
        LOT_NO: map['LOT_NO'],
        SAGYO_KU: map['SAGYO_KU'],
        CURRENT_KOUTEI_JUN: map['CURRENT_KOUTEI_JUN'],
        CREATED_PRG_NM: map['CREATED_PRG_NM']
    };

    var existsMap = selectOne(conn, 'NP_T_INPUT_COMMON', null, whereMap, null);

    if (existsMap) {
        map['ID'] = existsMap['ID'];
        whereKey = ['ID']
        updateByMapEx(conn, 'NP_T_INPUT_COMMON', map, whereKey, true);
    } else {
        map['ID'] = TALON.getNumberingData('TID', 1)[0];
        insertByMapEx(conn, 'NP_T_INPUT_COMMON', map, true);
    }

    return map;
}


function isExistsInfo() {
    var isRight = false;
    //var hasKeihi = false;
    var KAKO_IRAI_SYO_KBN = TALON.getBlockRequestParameter('1_KAKO_IRAI_SYO_KBN');
    if (!KAKO_IRAI_SYO_KBN) {
        var lineDataMap = TALON.getBlockData_Card(1);
        KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
        if (!KAKO_IRAI_SYO_KBN) {
            TALON.addErrorMsg("加工依頼区分を選択してください");
            TALON.setIsSuccess(false);
            return;
        }
    }
    var itemBlockList = TALON.getBlockData_List(4);
    if (itemBlockList.length > 0) {
        var lineDataMap = itemBlockList[0];
        var ID = lineDataMap['ID'];
        if (ID) {
            isRight = true;

        }
    }
    if (!isRight) {
        TALON.addErrorMsg("ロット情報が存在していません");
        TALON.setIsSuccess(false);
        return;
    }
}

function checkNippoKako() {
    //加工依頼区分の取得
    var KAKO_IRAI_SYO_KBN = TALON.getBlockRequestParameter('1_KAKO_IRAI_SYO_KBN');
    if (!KAKO_IRAI_SYO_KBN) {
        var lineDataMap = TALON.getBlockData_Card(1);
        KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
        if (!KAKO_IRAI_SYO_KBN) {
            return;
        }
    }

    var lineDataMap = TALON.getTargetData();
    var ID = lineDataMap['ID'];
    if (!ID) {
        return;
    }
    //ロット番号の取得
    var LOT_NO = lineDataMap['LOT_NO'];
    if (!LOT_NO) {
        return;
    }

    //検査加工の場合

    if (KAKO_IRAI_SYO_KBN == "03") {
        return;
    }

    if (KAKO_IRAI_SYO_KBN == "11") {
        KAKO_IRAI_SYO_KBN = "02";
    }

    //終了日有無のチェック
    var sql = " SELECT ID, END_DT, END_JIKAN, KAKO_ID,CREATED_PRG_NM FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO
        + "' AND CHK_DELETE IS NULL ORDER BY CURRENT_KOUTEI_JUN DESC, ID DESC ";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (mapList.length == 0) {
        TALON.addErrorMsg("ロット番号 " + LOT_NO + " の   前工程が完了していません。ご確認ください。");
        TALON.setIsSuccess(false);
        return;
    } else {
        var map = mapList[0];
        var isEnd = false;
        var CREATED_PRG_NM = map['CREATED_PRG_NM'];
        var END_DT = map['END_DT'];
        var END_JIKAN = map['END_JIKAN'];
        var KAKO_ID = map['KAKO_ID'];
        if (KAKO_ID) {
            sql = " SELECT TYOKUSO FROM NP_T_KAKO WHERE KAKO_ID = '" + KAKO_ID + "' ";
            mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            if (mapList.length > 0) {
                map = mapList[0];
                var TYOKUSO = map['TYOKUSO'];
                //前工程が直送分の場合
                if (TYOKUSO) {
                    if (TYOKUSO == "02") {
                        isEnd = true;
                    }
                }
            }
        }

        if (!isEnd) {
            if (CREATED_PRG_NM != "NIPPO_INPUT_28") {
                if (!END_DT || !END_JIKAN) {
                    TALON.addErrorMsg("ロット番号 " + LOT_NO + " の     前工程情報での終了日付、終了時間いずれかが入力されていません。ご確認ください。");
                    TALON.setIsSuccess(false);
                    return;
                }
            }
        }

    }

    //前工程のチェック
    var SAGYO_KU = lineDataMap['SAGYO_KU'];

    TALON.getLogger().writeInfo('[checkNippoKako SAGYO_KU ]' + SAGYO_KU)
    if (!SAGYO_KU) {
        TALON.addErrorMsg("ロット番号 " + LOT_NO + " の 前工程が完了していません。ご確認ください。");
        TALON.setIsSuccess(false);
    } else {
        TALON.getLogger().writeInfo('[checkNippoKako SAGYO_KU ]' + SAGYO_KU);
        var sql = "SELECT TOP 1 CURRENT_KOUTEI_CD FROM NIPPO_HIKITUGI_VIEW WHERE LOT_NO = '" + LOT_NO
            + "' ORDER BY BEFORE_KOUTEI_JUN DESC, ID DESC";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        TALON.getLogger().writeInfo('[checkNippoKako mapList ]' + mapList.length);
        if (mapList.length == 0) {
            // TALON.addErrorMsg("ロット番号 " + LOT_NO + " の " + CREATED_PRG_NM_NM + " 工程が完了していません。ご確認ください。'");
            TALON.addErrorMsg("ロット番号 " + LOT_NO + " の 前工程が完了していません。ご確認ください。'");
            TALON.setIsSuccess(false);
            return;
        } else {
            var map = mapList[0];
            var CURRENT_KOUTEI_CD = map['CURRENT_KOUTEI_CD'];
            if (SAGYO_KU != CURRENT_KOUTEI_CD) {
                TALON.addErrorMsg("ロット番号 " + LOT_NO + " の 前工程が完了していません。ご確認ください。'");
                TALON.setIsSuccess(false);
                return;
            }
        }
        var sql = "SELECT COUNT(*) CNT FROM TLN_M_HANYO_CODE INNER JOIN COM_M_KOUTEI ON TLN_M_HANYO_CODE.SIKIBETU_CODE = 'KAKO_IRAI_SYO_KBN' AND TLN_M_HANYO_CODE.KEY_CODE = COM_M_KOUTEI.KAKO_IRAI_SYO_KBN AND COM_M_KOUTEI.KOUTEI_CD = '"
            + SAGYO_KU + "' AND TLN_M_HANYO_CODE.KEY_CODE = '" + KAKO_IRAI_SYO_KBN + "'";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        var map = mapList[0];
        var CNT = map['CNT'];
        if (CNT == 0) {
            TALON.addErrorMsg("ロット番号 " + LOT_NO + " の  前工程が完了していません。ご確認ください。");
            TALON.setIsSuccess(false);
            return;
        }
    }

}


function updateNippoKako() {

    var userData = TALON.getUserInfoMap();
    var USER_ID = userData['USER_ID'];

    //加工依頼区分の取得
    var KAKO_IRAI_SYO_KBN = TALON.getBlockRequestParameter('1_KAKO_IRAI_SYO_KBN');
    if (!KAKO_IRAI_SYO_KBN) {
        var lineDataMap = TALON.getBlockData_Card(1);
        KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
        if (!KAKO_IRAI_SYO_KBN) {
            return;
        }
    }

    var sql = "SELECT DSP2 FROM TLN_M_HANYO_CODE WHERE TLN_M_HANYO_CODE.SIKIBETU_CODE = 'KAKO_IRAI_SYO_KBN' AND KEY_CODE = '" + KAKO_IRAI_SYO_KBN + "'";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (mapList.length > 0) {
        var map = mapList[0];
        var CREATED_PRG_NM = map['DSP2'];
    }

    var itemBlockList = TALON.getBlockData_List(4);

    for (var i = 0; i < itemBlockList.length; i++) {
        var lineDataMap = itemBlockList[i];
        //IDの取得
        var ID = lineDataMap['ID'];
        if (!ID) {
            continue;
        }

        //作業区の取得
        if (CREATED_PRG_NM == "NIPPO_INPUT_20") {
            var SAGYO_KU = TALON.getBlockRequestParameter('4_SAGYO_KU', i);
            if (SAGYO_KU) {
                if (SAGYO_KU == "350" || SAGYO_KU == "351") {
                    CREATED_PRG_NM == "NIPPO_INPUT_21";
                }
            }
        }

        var newMap = new Array();
        newMap['ID'] = ID;
        newMap['CREATED_PRG_NM'] = CREATED_PRG_NM;
        newMap['UPDATED_PRG_NM'] = CREATED_PRG_NM;
        newMap['TANTO_SYA_CD'] = USER_ID;
        newMap['ANAAKE_SAGYOSYA'] = USER_ID;
        newMap['AOI_SAGYOSYA_CD'] = USER_ID;

        var colList = [
            'ID'
            , 'CREATED_PRG_NM'
            , 'UPDATED_PRG_NM'
            , 'TANTO_SYA_CD'
            , 'ANAAKE_SAGYOSYA'
            , 'AOI_SAGYOSYA_CD'
        ];

        var whereList = new Array();
        whereList.push([null, '=', 'ID']);
        TalonDbUtil.updateByMap(TALON.getDbConfig(), 'NP_T_INPUT_COMMON', newMap, colList, whereList);
    }
}

/**
 * ガーディアンジャパンメール送信
 * 次工程が導通検査の場合、加工依頼書および発注書をガーディアンジャパン向けにメール送信する。
 * 呼び出されるタイミングは、加工依頼書、Vカットの受け入れ時または整面作業で次工程が導通である場合に呼び出される
 * 
 */
function sendMailGj() {

    var lineDataMap = TALON.getBlockData_Card(2);
    var ID = lineDataMap['ID'];
    if (ID) {
        mailSendGadhian(ID);
    }
}

/**
 * GJ単価情報取得 
 */
function getTankaGj() {

    var sql = getBodySql('SUB_SQL_HANYO');
    sql = sql + " WHERE SIKIBETU_CODE = 'GJ_TANKA'";

    TalonDbUtil.begin(TALON.getDbConfig());
    var tankaGj = TalonDbUtil.select(TALON.getDbConfig(), sql);
    TalonDbUtil.commit(TALON.getDbConfig());
    return tankaGj;
}


/**
 * ガーディアンジャパン発注金額情報を NP_T_GJ_HACCHU_RIREKI テーブルに登録する。
 *
 * <p>
 * 指定されたロット番号がすでに登録されていない場合にのみ、発注金額情報を新規登録する。
 * </p>
 *
 * @param {number} AVI_HACCHUKINGAKU - AVI 発注金額
 * @param {number} DENKI_HACCHUKINGAKU - 電気 発注金額
 * @param {string} LOT_NO - 対象ロット番号
 * @param {number} AVI_TANKA - AVI 単価
 * @param {number} DENKI - 電気コスト値
 * @param {number} M2SUU - 面積数
 */
function insGjHacchuInfo(AVI_HACCHUKINGAKU, DENKI_HACCHUKINGAKU, LOT_NO, AVI_TANKA, DENKI, M2SUU) {

    // 既に登録済みならスキップ
    if (isGjHacchu(LOT_NO)) {
        return;
    }

    var conn = TALON.getDbConfig();
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var user_id = userData['USER_ID'];
    var sysdate = new Date();

    var map = {
        LOT_NO: LOT_NO,
        AVI_HACCHUKINGAKU: AVI_HACCHUKINGAKU,
        DENKI_HACCHUKINGAKU: DENKI_HACCHUKINGAKU,
        AVI_TANKA: AVI_TANKA,
        DENKI: DENKI,
        M2_SUU: M2SUU,
        CREATED_DATE: sysdate,
        CREATED_BY: user_id,
        CREATED_PRG_NM: func_id,
        UPDATED_DATE: sysdate,
        UPDATED_BY: user_id,
        UPDATED_PRG_NM: func_id,
        MODIFY_COUNT: 0
    };

    insertByMapEx(conn, 'NP_T_GJ_HACCHU_RIREKI', map, true);
}

/**
 * 発注履歴が存在しているか確認
 * @param {*} LOT_NO 
 */
function isGjHacchu(LOT_NO) {

    var sql = ""
        + " SELECT "
        + "     COUNT(*) CNT "
        + " FROM NP_T_GJ_HACCHU_RIREKI"
        + " WHERE "
        + "     LOT_NO ='" + LOT_NO + "'";
    var CNT = TalonDbUtil.select(TALON.getDbConfig(), sql)[0]['CNT'];

    if (CNT == 0) {

        return false;

    }
    return true;
}


/**
 * ガーディアンジャパンメール送信
 */
function mailSendGadhian(ID) {

    var addressList = getAddressMailList('89100000');

    var ccList = [];
    var bccList = [];

    if (addressList.length == 0) {

        TALON.addMsg("外注先にメールアドレスが設定されていないため、メールを送信を行っておりません。")
        TALON.addMsg("メール送信が必要な場合、取引先  " + '89100000' + "  にメールアドレスを設定してください。")

    }

    var body = '平素より、大変お世話になっております。\r\n'
        + ' 掲題の件に関する加工依頼書および発注書を送付致します。\r\n'
        + ' よろしくお願いいたします。';

    var date = new Date();

    var title = '【RITAエレクトロニクス】'
    title = title + '導通検査' + '_' + date.getFullYear() + ('0' + (date.getMonth() + 1)).slice(-2) + ('0' + date.getDate()).slice(-2) + ('0' + date.getHours()).slice(-2) + ('0' + date.getMinutes()).slice(-2) + ('0' + date.getSeconds()).slice(-2)

    var attachList = [];
    var file_path = 'C:/payara5/glassfish/domains/production/config/kako_irai/'

    outPutFGPdfKAKO(ID);
    attachList[0] = getFilePath();

    outPutFGPdfHACHU(ID);
    attachList[1] = getFilePath();


    var result = sendMailCustom(
        'smtp.office365.com'
        , 587
        , 'outsourcing@ritael.co.jp'
        , 'phPk7MBf'
        , 'outsourcing@ritael.co.jp'
        , addressList
        , ccList
        , bccList
        , title
        , body
        , attachList
    );


    for (var i = 0; i < addressList.length; i++) {
        var mail = addressList[i]

        // 履歴書込
        mailSoshinRireki('01', title, body, mail)

    }

}


function outPutFGPdfKAKO(ID) {

    paramTbl =
        ['-funcname', 'KAKO_IRAI_GJ'
            , '-output', 'kako_irai'
            , '-0', 'KAKO_PDF'
            , '-condition', 'ID', '=', ID
        ];
    if (!TALON.callBATController(paramTbl)) {
        TALON.addErrorMsg("処理でエラーが発生しました");
        TALON.setIsSuccess(false);
    } else {
        TALON.setIsSuccess(true);
    }
}

function outPutFGPdfHACHU(ID) {

    paramTbl =
        ['-funcname', 'KAKO_IRAI_GJ'
            , '-output', 'kako_irai'
            , '-0', 'HACCHU_PDF'
            , '-condition', 'ID', '=', ID
        ];
    if (!TALON.callBATController(paramTbl)) {
        TALON.addErrorMsg("処理でエラーが発生しました");
        TALON.setIsSuccess(false);
    } else {
        TALON.setIsSuccess(true);
    }
}

/**
 * ガーディアンジャパンメールリスト取得
 */
function getGjMailList() {

    var sql = getBodySql('SUB_SQL_HANYO');
    sql = sql + " WHERE SIKIBETU_CODE = 'GJ_MAIL' AND DSP4 = '01'";

    TalonDbUtil.begin(TALON.getDbConfig());
    var listMail = TalonDbUtil.select(TALON.getDbConfig(), sql);
    TalonDbUtil.commit(TALON.getDbConfig());
    return listMail;

}


/**
 * メール送信履歴を COM_T_MAIL_RIREKI テーブルに登録する。
 *
 * @param {string} MAIL_KBN - メール区分
 * @param {string} MAIL_KENMEI - メール件名
 * @param {string} MAIL_HONBUN - メール本文
 * @param {string} SOSHIN_MAIL - 送信先メールアドレス
 */
function mailSoshinRireki(MAIL_KBN, MAIL_KENMEI, MAIL_HONBUN, SOSHIN_MAIL) {
    var conn = TALON.getDbConfig();
    var userData = TALON.getUserInfoMap();
    var func_id = userData['FUNC_ID'];
    var user_id = userData['USER_ID'];
    var sysdate = new Date();

    var map = {
        MAIL_ID: TALON.getNumberingData('TID', 1)[0],
        MAIL_KBN: MAIL_KBN,
        MAIL_KENMEI: MAIL_KENMEI,
        MAIL_HONBUN: MAIL_HONBUN,
        SOSHIN_MAIL: SOSHIN_MAIL,
        CREATED_DATE: sysdate,
        CREATED_BY: user_id,
        CREATED_PRG_NM: func_id,
        UPDATED_DATE: sysdate,
        UPDATED_BY: user_id,
        UPDATED_PRG_NM: func_id,
        MODIFY_COUNT: 0
    };

    insertByMapEx(conn, 'COM_T_MAIL_RIREKI', map, true);
}

/**
 * 板厚測定データの検索／確定時表示処理。
 *
 * <p>
 * ボタン名が「検索」または「確定」の場合にのみ実行され、  
 * 指定ロット番号に紐づく板厚データを抽出して表示リストに設定する。  
 * 「検索」時は確認フラグを "0" に、「確定」時は "1" に設定する。
 * </p>
 *
 * @param {number} x - 表示対象のリスト番号
 */
function itaatsuDisp(x) {
    var buttonName = TALON.getButtonName();
    if (buttonName !== '検索' && buttonName !== '確定') {
        return;
    }

    var newList = [];
    var lineDataMap = TALON.getConditionData();
    var LOT_NO = lineDataMap['SEARCH_LOT_NO'];

    if (LOT_NO) {
        var sql = "SELECT * FROM COM_T_ITAATSU WHERE LOT_NO = '" + LOT_NO + "'";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);

        for (var i = 0; i < mapList.length; i++) {
            var map = mapList[i];
            map['KAKUNIN'] = (buttonName === '検索') ? "0" : "1";
            newList.push(map);
        }
    }

    if (newList.length > 0) {
        TALON.setSearchedDisplayList(x, newList);
    }
}


function checkPress() {
    if (TALON.isInsert()) {
        var lineDataMap = TALON.getTargetData();
        //ロット番号の取得
        var LOT_NO = lineDataMap['LOT_NO'];
        if (!LOT_NO) {
            TALON.setIsSuccess(false);
            return;
        }
        //作業区の取得
        var SAGYO_KU = lineDataMap['SAGYO_KU'];
        //240327 作業区が取れ無い場合
        if (!SAGYO_KU) {
            TALON.addErrorMsg("ロット番号 " + LOT_NO + " の   前工程入力項目に不備がある。ご確認ください。");
            TALON.setIsSuccess(false);
            return;
        } else {
            //作業区が正しくない場合
            if (SAGYO_KU != "090" && SAGYO_KU != "091") {
                TALON.addErrorMsg("ロット番号 " + LOT_NO + " の   前工程入力項目に不備がある。ご確認ください。");
                TALON.setIsSuccess(false);
                return;
            }
        }
        var sql = " SELECT ID, CURRENT_KOUTEI_CD, END_DT, END_JIKAN FROM NP_T_INPUT_COMMON WHERE LOT_NO = '" + LOT_NO
            + "' AND CURRENT_KOUTEI_CD NOT IN ('090','091') AND CHK_DELETE IS NULL ORDER BY CURRENT_KOUTEI_JUN DESC, ID DESC ";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (mapList.length == 0) {

            return;
        } else {
            var map = mapList[0];
            if (map) {
                if (!map['END_DT'] || !map['END_JIKAN']) {
                    TALON.addErrorMsg("ロット番号 " + LOT_NO + " の     前工程情報での終了日付、終了時間いずれかが入力されていません。ご確認ください。");
                    TALON.setIsSuccess(false);
                    return;
                }
                var sqlNew = "SELECT TOP 1 CURRENT_KOUTEI_CD FROM NIPPO_HIKITUGI_VIEW WHERE LOT_NO = '" + LOT_NO
                    + "' AND BEFORE_KOUTEI_CD NOT IN ('090','091') ORDER BY BEFORE_KOUTEI_JUN DESC, ID DESC";
                var mapListNew = TalonDbUtil.select(TALON.getDbConfig(), sqlNew);
                if (mapListNew.length == 0) {
                    TALON.addErrorMsg("ロット番号 " + LOT_NO + " の   前工程入力項目に不備がある。ご確認ください。");
                    TALON.setIsSuccess(false);
                    return;
                } else {
                    var mapNew = mapListNew[0];
                    var CURRENT_KOUTEI_CD = mapNew['CURRENT_KOUTEI_CD'];
                    //最新の工程ではない場合
                    if (SAGYO_KU != CURRENT_KOUTEI_CD) {
                        TALON.addErrorMsg("ロット番号 " + LOT_NO + " の   前工程入力項目に不備がある。ご確認ください。");
                        TALON.setIsSuccess(false);
                        return;
                    }
                }
            }
        }
    }
}



// 単価計算START
/**
 * RASERの値に基づいてFACE_ORDERを設定します。
 * 
 * @param {string|null} FACE_ORDER - 現在のFACE_ORDERの値。未定義の場合に設定します。
 * @param {number} RASER_100 - A面に対応する値。0より大きい場合にA面を設定します。
 * @param {number} RASER_101 - B面に対応する値。0より大きい場合にA・B面を設定します。
 * @returns {string} 設定されたFACE_ORDERの値
 */
function getFaceOrder(FACE_ORDER, RASER_100, RASER_101) {
    // FACE_ORDERが未定義または空の場合のみ処理を行う
    if (!FACE_ORDER) {
        if (RASER_100 > 0 && RASER_101 > 0) {
            FACE_ORDER = 'A・B面';
        } else if (RASER_100 > 0) {
            FACE_ORDER = 'A面';
        }
    }

    return FACE_ORDER;
}

/**
 * 単価を計算して返すメソッド
 * 
 * @param {Object} targetMap - 対象データを含むマップ
 * @param {Object} lineDataMap - 依頼区分や外注先データを含むマップ
 * @returns {number|null} 計算された単価
 */
function calculateTanka(targetMap, lineDataMap) {
    var HINMOKU_CD = targetMap['HINMOKU_CD'];
    var KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
    var GAITYUSAKI = lineDataMap['GAITYUSAKI'];

    var TANKA = 0;
    if (KAKO_IRAI_SYO_KBN != '03') {

        // 単価マスタから単価取得
        var sqlTanka = generateSqlTanka(targetMap, lineDataMap);
        TANKA = executeSqlAndGetTanka(sqlTanka);
    } else {

        TANKA = calcKensaTankaM2(targetMap);
    }

    // 品目単価上書きロジック
    if (KAKO_IRAI_SYO_KBN == '01' || KAKO_IRAI_SYO_KBN == '11' || KAKO_IRAI_SYO_KBN == '02') {
        var sqlTanka2 = generateHinmokuTankaSql(HINMOKU_CD, GAITYUSAKI, KAKO_IRAI_SYO_KBN);
        var TANKA2 = executeSqlAndGetTanka(sqlTanka2);

        if (TANKA2) {
            TANKA = TANKA2; // 品目単価が設定されている場合、上書き
        }
    }

    // 単価が取得できなかった場合、エラーメッセージを出力
    if (!TANKA) {
        TALON.addMsg("単価が取得できませんでした。");
        return null;
    }

    return TANKA;
}

/**
 * SQLを実行して単価を取得する共通関数
 * 
 * @param {string} sql - 実行するSQLクエリ
 * @returns {number|null} 取得した単価
 */
function executeSqlAndGetTanka(sql) {
    if (sql) {
        var itemSelectList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (itemSelectList.length > 0) {
            return itemSelectList[0]['TANKA'];
        }
    }
    return null;
}

/**
 * 品目単価を取得するSQLを生成する
 * 
 * @param {string} HINMOKU_CD - 品目コード
 * @param {string} GAITYUSAKI - 外注先コード
 * @param {string} KAKO_IRAI_SYO_KBN - 加工依頼書区分
 * @returns {string} 品目単価を取得するSQLクエリ
 */
function generateHinmokuTankaSql(HINMOKU_CD, GAITYUSAKI, KAKO_IRAI_SYO_KBN) {
    return "SELECT TANKA AS TANKA FROM COM_M_HINMOKU_TANKA " +
        "WHERE COM_M_HINMOKU_TANKA.HINMOKU_CD = '" + HINMOKU_CD + "' " +
        "AND GAITYUSAKI_CD = '" + GAITYUSAKI + "' " +
        (KAKO_IRAI_SYO_KBN === '11' || KAKO_IRAI_SYO_KBN === '02'
            ? "AND (KAKO_IRAI_SYO_KBN = '11' OR KAKO_IRAI_SYO_KBN = '02') AND TANKA IS NOT NULL"
            : "AND KAKO_IRAI_SYO_KBN = '" + KAKO_IRAI_SYO_KBN + "'");
}

/**
 * 単価計算SQL生成ロジック
 * 
 * @param {Object} targetMap - 対象データを含むマップ (HINMOKU_CD, WORK_SIZE, DOUATSU, ANA_INK, RASER_100, RASER_101, HYOMEN_SYORI, SIAGE_ITAATSU など)
 * @param {Object} lineDataMap - 依頼区分や外注先データを含むマップ (KAKO_IRAI_SYO_KBN, GAITYUSAKI など)
 * @returns {string} 生成された単価取得用SQL
 */
function generateSqlTanka(targetMap, lineDataMap) {
    var sqlTanka = "";
    var HINMOKU_CD = targetMap['HINMOKU_CD'];
    var WORK_SIZE = targetMap['WORK_SIZE'];
    var DOUATSU = targetMap['DOUHAKU_PANEL_MEKKI2'];
    var ANA_INK = targetMap['ANA_INK'];
    var RASER_100 = targetMap['RASER_100'];
    var RASER_101 = targetMap['RASER_101'];
    var HYOMEN_SYORI = targetMap['HYOMEN_SYORI'];
    var SIAGE_ITAATSU = targetMap['SIAGE_ITAATSU'];
    var FACE_ORDER = getFaceOrder(targetMap['FACE_ORDER'], RASER_100, RASER_101);
    var KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
    var GAITYUSAKI = lineDataMap['GAITYUSAKI'];

    // 共通部分のWHERE句生成関数
    function createWhereClause(baseConditions) {
        // filter(Boolean)の代わりに手動でnullやundefinedを除外
        var validConditions = [];
        for (var i = 0; i < baseConditions.length; i++) {
            if (baseConditions[i]) {
                validConditions.push(baseConditions[i]);
            }
        }
        return " WHERE " + validConditions.join(" AND ");
    }

    // KAKO_IRAI_SYO_KBNごとのSQL生成
    switch (KAKO_IRAI_SYO_KBN) {
        case '06': // シルク
            sqlTanka = createWhereClause([
                "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                "WORK_SIZE = '" + WORK_SIZE + "'"
            ]);
            break;

        case '07': // パネルめっき
            sqlTanka = createWhereClause([
                "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                "WORK_SIZE = '" + WORK_SIZE + "'",
                DOUATSU ? "DOUATSU = " + DOUATSU : null
            ]);
            break;

        case '08': // 穴埋め
            sqlTanka = createWhereClause([
                "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                "INK_SYU = '" + ANA_INK + "'"
            ]);
            break;

        case '12': // デスミア（プラズマ）
            sqlTanka = createWhereClause([
                "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                "MEN = '" + FACE_ORDER + "'"
            ]);
            break;

        case '01': // 外注先「89890000」の場合
            if (GAITYUSAKI === '89890000') {
                sqlTanka = createWhereClause([
                    "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                    "WORK_SIZE = '" + WORK_SIZE + "'",
                    "KIN_HYOMEN_SYORI = '" + HYOMEN_SYORI + "'",
                    "ITAATSU = '" + SIAGE_ITAATSU + "'"
                ]);
            } else {
                sqlTanka = createWhereClause([
                    "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                    "WORK_SIZE = '" + WORK_SIZE + "'",
                ]);
            }
            break;

        case '02':
        case '11': // 外注先「02」「11」の場合
            sqlTanka = createWhereClause([
                "GAITYUSAKI_CD = '" + GAITYUSAKI + "'",
                "WORK_SIZE = '" + WORK_SIZE + "'",
                "KIN_HYOMEN_SYORI = '" + HYOMEN_SYORI + "'"
            ]);
            break;

        case '04':
        case '09': // OBICの単価マスタから品目で取得
            return generateHinmokuTankaSql(HINMOKU_CD, GAITYUSAKI, KAKO_IRAI_SYO_KBN);


        default:
            throw new Error("不明なKAKO_IRAI_SYO_KBN: " + KAKO_IRAI_SYO_KBN);
    }

    return "SELECT TANKA FROM COM_M_TANKA" + sqlTanka;
}


/**
 * 単価と発注金額を更新する処理
 * 
 * @param {number} TANKA - 更新する単価
 * @param {Object} targetMap - 更新対象データ（ID, SAGYO_KU 等を含む）
 */
function updTanka(TANKA, targetMap) {
    var conn = TALON.getDbConfig();

    var lineDataMap = TALON.getBlockData_Card(1);
    var KAKO_IRAI_SYO_KBN = lineDataMap['KAKO_IRAI_SYO_KBN'];
    var GAITYUSAKI = lineDataMap['GAITYUSAKI'];

    var ID = targetMap['ID'];
    var SAGYO_KU = targetMap['SAGYO_KU'];
    var SAGYO_PN_SUU = targetMap['SAGYO_PN_SUU'];
    var SAGYO_PCS_SUU = targetMap['SAGYO_PCS_SUU'];
    var SAGYO_M2_SUU = targetMap['SAGYO_M2_SUU'];

    if (["350", "351", "352"].indexOf(SAGYO_KU) > -1) {
        TANKA = 0;
    }

    var whereMap = {
        GAITYU_CD: GAITYUSAKI,
        KAKO_IRAI_KBN: KAKO_IRAI_SYO_KBN
    };

    var row = selectOne(conn, "COM_M_KAKO_CALC_PATTERN", ["KAKO_CALC_ID"], whereMap, null);
    if (!row) return;

    var KAKO_CALC_ID = row["KAKO_CALC_ID"];
    var SANSYO_HACCHU_GAKU = 0.0;
    var TANKA_TANI = "-";

    switch (KAKO_CALC_ID) {
        case 'P001':
            SANSYO_HACCHU_GAKU = SAGYO_PN_SUU * TANKA;
            TANKA_TANI = 'PN';
            break;
        case 'P002':
            SANSYO_HACCHU_GAKU = SAGYO_PN_SUU * TANKA;
            TANKA_TANI = '面数';
            break;
        case 'P003':
            SANSYO_HACCHU_GAKU = TANKA;
            break;
        case 'P004':
            SANSYO_HACCHU_GAKU = SAGYO_PCS_SUU * TANKA;
            TANKA_TANI = 'Pcs';
            break;
        case 'P005':
            SANSYO_HACCHU_GAKU = SAGYO_M2_SUU * TANKA;
            TANKA_TANI = '㎡数';
            break;
        case 'P006':
            return;
    }

    if (KAKO_IRAI_SYO_KBN === '03') {
        SANSYO_HACCHU_GAKU += calcKensaTankaOther(targetMap);
    }

    // 更新マップを定義
    var updateMap = {
        SANSYO_HACCHU_GAKU: SANSYO_HACCHU_GAKU,
        TANKA: TANKA,
        KAKO_CALC_ID: KAKO_CALC_ID,
        TANKA_TANI: TANKA_TANI,
        HACCHU_GAKU: SANSYO_HACCHU_GAKU,
        ID: ID
    };

    // WHERE キー定義
    var keyList = ['ID'];

    updateByMapEx(conn, "NP_T_INPUT_COMMON", updateMap, keyList, true);
}


/**
 * 検査加工単価取得
 * 
 * @returns {number} 計算された検査加工単価
 */
function calcKensaTankaM2(targetMap) {

    var tanka = 0;

    // AVI検査による単価加算
    var AVI_KENSA = targetMap['AVI_KENSA'];
    if (AVI_KENSA) {
        tanka += getTanyoTanka("AVI_KENSA", AVI_KENSA);
    }

    // SO区分の決定
    var SO_SUU = targetMap['SO_SUU'];
    var SO_KBN = (SO_SUU == 2) ? "1" : "2";

    // ピン間区分の決定
    var PIN_KAN = targetMap['PIN_KAN'];
    var PINKAN_KBN = "3";
    if (PIN_KAN == 1) {
        PINKAN_KBN = "1";
    } else if (PIN_KAN == 2) {
        PINKAN_KBN = "2";
    }

    // 検査種別回数による単価加算
    var KENSA_SYUBETU_KAISU = targetMap['KENSA_SYUBETU_KAISU'];
    if (KENSA_SYUBETU_KAISU == "5") {
        // 3倍1回検査
        var SAGYO_M2_SUU = targetMap['SAGYO_M2_SUU'];
        tanka += (SAGYO_M2_SUU < 0.4) ? 270 : 880;
    } else if (KENSA_SYUBETU_KAISU == "6") {
        // 10倍1回検査
        tanka += 3500;
    } else {
        // その他の検査種別回数に応じた単価加算
        tanka += getKaisuBetuTanka(KENSA_SYUBETU_KAISU, SO_KBN, PINKAN_KBN, targetMap['TANSI_UMU']);
    }

    // その他の検査種別による単価加算
    var SO_A_KENSA_SYUBETSU = targetMap['SO_A_KENSA_SYUBETSU'];
    if (SO_A_KENSA_SYUBETSU) {
        tanka += getTanyoTanka("SO_A_KENSA_SYUBETSU", SO_A_KENSA_SYUBETSU);
    }

    return tanka;
}


/**
 * 単価を取得する処理
 * 
 * @param {string} SIKIBETU_CODE - 識別コード
 * @param {string} KEY - キーコード
 * @returns {number|null} 取得した単価。データがない場合は null を返す。
 */
function getTanyoTanka(SIKIBETU_CODE, KEY) {
    var conn = TALON.getDbConfig();
    var tableName = "TLN_M_HANYO_CODE_MAIN";
    var columns = ["DSP_NO1"];
    var whereMap = {
        SIKIBETU_CODE: SIKIBETU_CODE,
        KEY_CODE: KEY
    };

    try {
        var row = selectOne(conn, tableName, columns, whereMap, null);

        if (!row || row["DSP_NO1"] == null) {
            TALON.addMsg("指定された識別コードとキーコードに対応する単価が見つかりません。");
            return null;
        }

        return Number(row["DSP_NO1"]);
    } catch (e) {
        TALON.addMsg("単価取得中にエラーが発生しました: " + e.message);
        return null;
    }
}

/**
 * 回数別単価を取得する処理
 *
 * @param {string} KENSA_SYUBETU_KAISU - 検査種別回数
 * @param {string} SO_KBN - SO区分
 * @param {string} PINKAN_KBN - 品間区分
 * @param {string} TANSI_UMU - 端子有無
 * @returns {number} 回数別単価。エラー時には 0 を返す。
 */
function getKaisuBetuTanka(KENSA_SYUBETU_KAISU, SO_KBN, PINKAN_KBN, TANSI_UMU) {
    if (!KENSA_SYUBETU_KAISU) {
        TALON.addMsg("検査種別回数項目が設定されていないため、回数別単価が算出できません。");
        return 0;
    }

    if (!TANSI_UMU) {
        TALON.addMsg("端子有無が設定されていないため、回数別単価が算出できません。");
        return 0;
    }

    var conn = TALON.getDbConfig();
    var tableName = "NP_M_KAKO_KENSA_CALC";
    var columns = ["TANKA"];
    var whereMap = {
        KENSA_SYUBETU_KAISU: KENSA_SYUBETU_KAISU,
        SO_KBN: SO_KBN,
        PINKAN_KBN: PINKAN_KBN,
        TANSI_UMU: TANSI_UMU
    };

    try {
        var row = selectOne(conn, tableName, columns, whereMap, null);

        if (!row || !row["TANKA"]) {
            TALON.addMsg("指定された条件に一致する回数別単価が見つかりません。");
            return 0;
        }

        return Number(row["TANKA"]);
    } catch (e) {
        TALON.addMsg("回数別単価の取得中にエラーが発生しました: " + e.message);
        return 0;
    }
}

/**
 * 検査加工単価取得
 * 
 * @returns {number} 計算された検査加工単価
 */
function calcKensaTankaOther(targetMap) {
    var tanka = 0;

    // 検査単価（SIYO_KENSA）
    var SIYO_KENSA = targetMap['SIYO_KENSA'];
    if (SIYO_KENSA) {
        tanka += getTanyoTanka("SIYO_KENSA", SIYO_KENSA);
    }

    // 検査種別と時間による単価加算
    var SO_KENSA_SYUBETSU = targetMap['SO_KENSA_SYUBETSU'];
    var SO_KENSA_SYUBETSU_JIKAN = targetMap['SO_KENSA_SYUBETSU_JIKAN'];
    if (SO_KENSA_SYUBETSU && SO_KENSA_SYUBETSU_JIKAN) {
        tanka += getTanyoTanka("SO_KENSA_SYUBETSU", SO_KENSA_SYUBETSU) * SO_KENSA_SYUBETSU_JIKAN;
    }

    // 調整単価の加算
    var TYOSEI_TANKA = targetMap['TYOSEI_TANKA'];
    if (TYOSEI_TANKA) {
        tanka += TYOSEI_TANKA;
    }

    return tanka;
}

/**
 * 単価を計算し、更新するメインのロジック
 */
function calcHacchuKakohi() {

    var targetMap = TALON.getTargetData();
    var lineDataMap = TALON.getBlockData_Card(1);

    // 単価初期化
    var TANKA = calculateTanka(targetMap, lineDataMap);

    // 単価が取得できなかった場合の処理
    if (!TANKA) {
        TALON.addMsg("単価が取得できませんでした。処理を中断します。");
        return;
    }

    // 単価を更新
    updTanka(TANKA, targetMap);
}

/**
 * 複数のアイテムに対して単価を計算し、更新するメインのロジック
 */
function calcikatuHacchuKakohi() {
    var lineDataMap = TALON.getBlockData_Card(1);
    var itemBlockList = TALON.getBlockData_List(4);

    for (var i = 0; i < itemBlockList.length; i++) {
        var targetMap = itemBlockList[i];

        // 単価初期化
        var TANKA = calculateTanka(targetMap, lineDataMap);

        // 単価が取得できなかった場合の処理
        if (!TANKA) {
            TALON.addMsg("単価が取得できませんでした。対象ID: " + targetMap['ID']);
            continue; // 単価がない場合はスキップ
        }

        // 単価を更新
        updTanka(TANKA, targetMap);
    }
}
// 単価計算END

function getKensyuData() {
    var dates = getFormattedSagyouDates();  // 共通化した関数を使用

    // プレースホルダーを使ったSQLクエリ
    var sql = "SELECT * FROM KENSYU_VIEW WHERE [HEAD発生日] BETWEEN ? AND ?";

    // SQLインジェクション対策のため、パラメータを配列に
    var params = [dates.from, dates.to];

    // データベース接続の取得
    var dbConnection = TALON.getDbConfig();

    try {
        // executeQuery関数を使用してSELECTクエリを実行
        var result = executeQuery(dbConnection, sql, params, EXECUTE_KEY_SELECT, false);

        // 結果を返す
        return result;

    } catch (e) {
        // エラーが発生した場合の処理
        var errorMsg = "データ取得中にエラーが発生しました。エラー詳細: " + e.message;
        TALON.addErrorMsg(errorMsg);
        TALON.getLogger().writeError("[ERROR] getKensyuData: " + e.stack);  // エラーログにスタックトレースを出力
        throw e;  // エラーを再スロー
    }
}

/**
 * 検収テーブルのデータを削除
 * @returns {number} 削除されたレコード数
 */
function delKensyu_TBL() {
    var dates = getFormattedSagyouDates();  // 共通化した関数を使用

    // プレースホルダーを使ったSQLクエリ
    var sql = "DELETE FROM KENSYU_TBL WHERE [HEAD発生日] BETWEEN ? AND ?";

    // SQLインジェクション対策のため、パラメータを配列に
    var params = [dates.from, dates.to];

    // データベース接続の取得
    var dbConnection = TALON.getDbConfig();

    try {
        // executeQuery関数を使用してDELETEクエリを実行
        var result = executeQuery(dbConnection, sql, params, EXECUTE_KEY_DELETE, true);

        // 結果を返す
        return result;

    } catch (e) {
        // エラーが発生した場合の処理
        TALON.addErrorMsg("データ削除中にエラーが発生しました: " + e.message);
        throw e;
    }
}

/**
 * 発生日の範囲を取得してフォーマットする共通関数
 * @returns {Object} フォーマット済みの発生日範囲を含むオブジェクト
 */
function getFormattedSagyouDates() {
    var lineDataMap = TALON.getConditionData();

    // JavaのSimpleDateFormatを使用して日付をフォーマット
    var SimpleDateFormat = Java.type('java.text.SimpleDateFormat');
    var df = new SimpleDateFormat('yyyy/MM/dd');

    var SAGYOU_DT_TO = lineDataMap['HEAD発生日_TO'];
    var SAGYOU_DT_FROM = lineDataMap['HEAD発生日'];

    var dfSAGYOU_DT_FROM = df.format(SAGYOU_DT_FROM);
    var dfSAGYOU_DT_TO = df.format(SAGYOU_DT_TO);

    // フォーマット済みの日付範囲をオブジェクトとして返す
    return {
        from: dfSAGYOU_DT_FROM,
        to: dfSAGYOU_DT_TO
    };
}

/**
 * 検収テーブルのカラム名を取得
 * @returns {Array} カラム名の配列
 */
function getKensyuColList() {
    return [
        'KENSYU_STS_DISP', 'KEY_CODE', '会社コード', 'システム分類', '受入データ区分',
        'HEAD入力事業所コード', 'HEAD伝票種別コード', 'HEAD発生日', 'KEY_CODE2',
        'HEAD債務管理事業所コード', 'HEAD債務管理部門コード', 'HEAD支払事業所コード', 'HEAD支払部門コード',
        'HEAD仕入先コード', 'HEAD仕入先スポット区分', 'HEAD担当者コード', 'HEAD納品書日付',
        'HEAD納品書番号', 'HEAD都度締区分', 'HEAD決済条件コード', 'HEAD締日',
        'HEAD支払予定日', 'HEAD摘要', 'HEAD支払決済口座コード', 'HEAD振込口座選択区分',
        'HEAD補助科目コード', 'HEAD補助内訳科目コード', 'HEAD分析コード1', 'HEAD分析コード2',
        'HEAD分析コード3', 'HEAD分析コード4', 'HEAD分析コード5', 'HEAD資金コード',
        'HEADプロジェクトコード', 'HEAD源泉税預り金計算対象区分', 'HEAD源泉税コード',
        'HEAD源泉税預り金', 'HEAD源泉税分析コード1', 'HEAD源泉税分析コード2',
        'HEAD源泉税分析コード3', 'HEAD源泉税分析コード4', 'HEAD源泉税分析コード5',
        'HEAD源泉税資金コード', 'HEAD源泉税プロジェクトコード', '行番号',
        '明細債務データ取引区分コード', '明細事業所コード', '明細部門コード',
        '明細補助科目コード', '明細補助内訳科目コード', '明細税区分', '明細税込区分',
        '明細分析コード1', '明細分析コード2', '明細分析コード3', '明細分析コード4',
        '明細分析コード5', '明細資金コード', '明細プロジェクトコード', '明細消費税本体科目コード',
        '明細品コード', '明細品名', '明細規格', '明細単位コード', '明細単位名',
        '明細数量', '明細単価', '明細ロットNO', '明細摘要', '明細金額', '明細外税消費税',
        '明細うち消費税', '取引先正式名1', '取引先正式名2', '取引先部署名',
        '社内用取引先名', '取引先略名', '取引先フリガナ', '取引先郵便番号1(上3桁)',
        '取引先郵便番号2(下4桁)', '取引先住所1', '取引先住所2', '取引先住所3',
        '取引先電話番号1市外局番', '取引先電話番号1市内局番', '取引先電話番号1',
        '取引先内線番号1', '取引先電話番号2市外局番', '取引先電話番号2市内局番',
        '取引先電話番号2', '取引先内線番号2', '取引先FAX番号市外局番',
        '取引先FAX番号市内局番', '取引先FAX電話番号', '取引先担当部署名',
        '取引先担当役職名', '取引先担当者名', 'メールアドレス', '郵送先住所区分',
        '郵送先正式名1', '郵送先正式名2', '郵便番号1(上3桁)', '郵便番号2(下4桁)',
        '郵送先住所1', '郵送先住所2', '郵送先住所3', '郵送先電話番号市外局番',
        '郵送先電話番号市内局番', '郵送先電話番号', '郵送先内線番号',
        '郵送先FAX番号市外局番', '郵送先FAX番号市内局番', '郵送先FAX電話番号',
        '郵送先担当部署名', '郵送先担当者名', '振込先銀行コード', '振込先銀行支店コード',
        '預金種別区分', '口座番号', '口座名義人カナ', '手数料負担区分', '休日処理区分',
        'サイト計算区分', 'サイト', 'サイト月数', 'サイト日数'
    ];
}

// SQL文取得メソッド

/**
 * 機能IDに基づいてターゲットIDを取得するためのSQLクエリを生成する。
 * 
 * @param {string} func_id - 機能ID
 * @returns {string} 機能IDに対応するターゲットIDを取得するSQLクエリ
 */
function buildGetTargetIdQuery() {
    return ""
        + "SELECT KEY_CODE "
        + "FROM TLN_M_HANYO_CODE "
        + "WHERE SIKIBETU_CODE = 'VIEW_TARGETFUNC_ID' "
        + "AND DSP2 = ?";
}

/**
 * RITAメール情報を取得するためのSQLクエリを生成する関数
 * 
 * @returns {string} - RITAメール情報を取得するためのSQLクエリ
 */
function buildRitaMailInfoQuery() {
    return ""
        + "SELECT"
        + "     KEY_CODE,"      // キーコード
        + "     DSP1,"         // 表示データ1
        + "     DSP2,"         // 表示データ2
        + "     DSP3,"         // 表示データ3
        + "     DSP4,"         // 表示データ4
        + "     DSP5,"         // 表示データ5
        + "     DSP_NO1"       // 表示番号1
        + " FROM"
        + "     TLN_M_HANYO_CODE"    // マスターテーブル
        + " WHERE"
        + "     SIKIBETU_CODE = 'RITA_MAIL'"    // RITAメールに関する識別コード
        + " AND KEY_CODE = '1'";            // キーコードが '1' であるデータを対象
}

/**
 * 代表ロットまたは関連ロットに紐づく情報を取得するためのSQLクエリを生成する関数
 * 
 * @param {boolean} isDaihyo - 代表ロット情報かどうか
 * @returns {string} - SQLクエリ
 */
function buildSetLotInfoQuery(isDaihyo) {
    var table = isDaihyo ? "RS_T_IJO_HOKOKUSYO" : "RS_T_IJO_TAISHO";

    return ""
        + " SELECT "
        + "     RS_T_IJO_HOKOKUSYO.ID "
        + "     ," + table + ".LOT_NO "
        + " FROM "
        + "     RS_T_IJO_HOKOKUSYO "
        + " INNER JOIN RS_T_IJO_TAISHO "
        + "     ON RS_T_IJO_TAISHO.IJO_NO = RS_T_IJO_HOKOKUSYO.IJO_NO "
        + " INNER JOIN RS_T_IJO_EIKYO "
        + "     ON RS_T_IJO_EIKYO.IJO_NO = RS_T_IJO_HOKOKUSYO.IJO_NO "
        + "     AND RS_T_IJO_EIKYO.TAISYO_KOTEI LIKE ? "
        + " WHERE "
        + "     " + table + ".LOT_NO = ? "
        + " AND NOT EXISTS( SELECT 'X' FROM NP_T_IJO_KAKUNIN WHERE ID = RS_T_IJO_HOKOKUSYO.ID AND FUNC_ID = ? )";
}

// カラムリスト

/**
 * NP_T_IJO_KAKUNIN テーブルのカラムリストを取得する関数
 * 
 * @returns {Array<string>} カラム名の配列
 */
function getcolList_NP_T_IJO_KAKUNIN() {
    return [
        'ID',
        'LOT_NO',
        'FUNC_ID',
        'KAKUNIN_CHK',
        'CREATED_DATE',
        'CREATED_BY',
        'CREATED_PRG_NM',
        'UPDATED_DATE',
        'UPDATED_BY',
        'UPDATED_PRG_NM',
        'MODIFY_COUNT'
    ];
}


/**
 * 工程進捗対象列名取得
 *
 * @returns {Array<Object>} DSP1, DSP2, DSP3を含む行のリスト
 */
function getTargetKoteiCd() {
    var userInfoMap = TALON.getUserInfoMap();
    var funcid = userInfoMap['FUNC_ID'];

    // SQLインジェクション対策（エスケープ）
    funcid = String(funcid).replace(/'/g, "''");

    var whereMap = { SIKIBETU_CODE: funcid };
    var colList = ['DSP1', 'DSP2', 'DSP3'];

    return selectList(TALON.getDbConfig(), 'TLN_M_HANYO_CODE_MAIN', colList, whereMap, null) || [];
}

/**
 * 工程情報を設定します。
 * 
 * @param {Object} map - 対象データ
 * @param {Number} SIYOSYO_SEQ - 使用書シーケンス
 * @returns {Object} 更新されたデータ
 */
function setKouteiInfo(map, SIYOSYO_SEQ) {

    var currentMap = getCurrentKouteiInfo(map['SAGYO_KU'], SIYOSYO_SEQ)

    if (!currentMap) {

        map['CURRENT_KOUTEI_JUN'] = null
        map['CURRENT_KOUTEI_CD'] = null
        map['NEXT_KOUTEI_JUN'] = null
        map['NEXT_KOUTEI_CD'] = null
        map['BEFORE_KOUTEI_JUN'] = null
        map['BEFORE_KOUTEI_CD'] = null
        return map
    }

    var nextMap = getNEXTKouteiInfo(currentMap['KOUTEI_JUN'], SIYOSYO_SEQ)

    if (!nextMap) {

        map['CURRENT_KOUTEI_JUN'] = null
        map['CURRENT_KOUTEI_CD'] = null
        map['NEXT_KOUTEI_JUN'] = null
        map['NEXT_KOUTEI_CD'] = null
        map['BEFORE_KOUTEI_JUN'] = null
        map['BEFORE_KOUTEI_CD'] = null
        return map
    }
    var beforeMap = getBeforeKouteiInfo(nextMap['KOUTEI_JUN'], SIYOSYO_SEQ, map['SAGYO_KU'])

    if (!beforeMap) {

        map['CURRENT_KOUTEI_JUN'] = null
        map['CURRENT_KOUTEI_CD'] = null
        map['NEXT_KOUTEI_JUN'] = null
        map['NEXT_KOUTEI_CD'] = null
        map['BEFORE_KOUTEI_JUN'] = null
        map['BEFORE_KOUTEI_CD'] = null
        return map
    }
    map['CURRENT_KOUTEI_JUN'] = currentMap['KOUTEI_JUN']
    map['CURRENT_KOUTEI_CD'] = map['SAGYO_KU'];
    map['NEXT_KOUTEI_JUN'] = nextMap['KOUTEI_JUN'];
    map['NEXT_KOUTEI_CD'] = nextMap['KOUTEI_CD'];
    map['BEFORE_KOUTEI_JUN'] = beforeMap['KOUTEI_JUN'];
    map['BEFORE_KOUTEI_CD'] = beforeMap['KOUTEI_CD'];

    return map;
}

/**
 * 現在の工程情報を取得します。
 * 
 * @param {String} SAGYO_KU - 作業区コード
 * @param {Number} SIYOSYO_SEQ - 使用書シーケンス
 * @returns {Object} 現在の工程情報
 */
function getTehaiKouteiInfo(SAGYO_KU, SIYOSYO_SEQ) {
    var sql = "SELECT TOP 1 KOUTEIJUN_KANRI.KOUTEI_JUN, KOUTEIJUN_KANRI.KOUTEI_CD " +
        "FROM KOUTEIJUN_KANRI " +
        "INNER JOIN COM_M_KOUTEI ON KOUTEIJUN_KANRI.KOUTEI_CD = COM_M_KOUTEI.KOUTEI_CD " +
        "WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEIJUN_KANRI.KOUTEI_CD = '" + SAGYO_KU + "'";
    return TalonDbUtil.select(TALON.getDbConfig(), sql)[0];
}


/**
 * 現在の工程情報を取得します。
 * 
 * @param {String} SAGYO_KU - 作業区コード
 * @param {Number} SIYOSYO_SEQ - 使用書シーケンス
 * @returns {Object} 現在の工程情報
 */
function getCurrentKouteiInfo(SAGYO_KU, SIYOSYO_SEQ) {
    var sql = "SELECT TOP 1 KOUTEIJUN_KANRI.KOUTEI_JUN, KOUTEIJUN_KANRI.KOUTEI_CD " +
        "FROM KOUTEIJUN_KANRI " +
        "INNER JOIN COM_M_KOUTEI ON KOUTEIJUN_KANRI.KOUTEI_CD = COM_M_KOUTEI.KOUTEI_CD " +
        "WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEIJUN_KANRI.KOUTEI_CD = '" + SAGYO_KU + "'";
    return TalonDbUtil.select(TALON.getDbConfig(), sql)[0];
}

/**
 * 次の工程情報を取得します。
 * 
 * @param {Number} KOUTEI_JUN - 工程順序
 * @param {Number} SIYOSYO_SEQ - 使用書シーケンス
 * @returns {Object} 次の工程情報
 */
function getNEXTKouteiInfo(KOUTEI_JUN, SIYOSYO_SEQ) {
    var sql = "SELECT TOP 1 KOUTEIJUN_KANRI.KOUTEI_JUN, KOUTEIJUN_KANRI.KOUTEI_CD " +
        "FROM KOUTEIJUN_KANRI " +
        "INNER JOIN COM_M_KOUTEI ON KOUTEIJUN_KANRI.KOUTEI_CD = COM_M_KOUTEI.KOUTEI_CD " +
        "WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEIJUN_KANRI.KOUTEI_JUN > " + KOUTEI_JUN +
        " ORDER BY KOUTEI_JUN"
    return TalonDbUtil.select(TALON.getDbConfig(), sql)[0] || { KOUTEI_JUN: KOUTEI_JUN, KOUTEI_CD: '450' };
}

/**
 * 前の工程情報を取得します。
 * 
 * @param {Number} KOUTEI_JUN - 工程順序
 * @param {Number} SIYOSYO_SEQ - 使用書シーケンス
 * @returns {Object} 前の工程情報
 */
function getBeforeKouteiInfo(KOUTEI_JUN, SIYOSYO_SEQ, SAGYO_KU) {
    var sql = "SELECT TOP 1 KOUTEIJUN_KANRI.KOUTEI_JUN, KOUTEIJUN_KANRI.KOUTEI_CD " +
        "FROM KOUTEIJUN_KANRI " +
        "INNER JOIN COM_M_KOUTEI ON KOUTEIJUN_KANRI.KOUTEI_CD = COM_M_KOUTEI.KOUTEI_CD " +
        "WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ + " AND KOUTEIJUN_KANRI.KOUTEI_JUN < " + KOUTEI_JUN +
        " ORDER BY KOUTEI_JUN DESC"
    return TalonDbUtil.select(TALON.getDbConfig(), sql)[0] || { KOUTEI_JUN: 1, KOUTEI_CD: SAGYO_KU };
}

function furyoOBIC() {

}

/**
 * 工程連携の共通処理を行います。
 * - ユーザー情報と対象データを取得し、連携処理を実行します。
 * - 必要に応じて特定のカスタム処理を呼び出します。
 */
function kouteiRenkeiCommon() {

    var userInfoMap = TALON.getUserInfoMap();
    var lineDataMap = TALON.getTargetData();

    var END_DT = lineDataMap['END_DT'];
    var END_JIKAN = lineDataMap['END_JIKAN'];

    if (!END_DT || !END_JIKAN) {
        return;
    }

    // バリデーション
    if (!lineDataMap['LOT_NO']) {
        TALON.addErrorMsg("LOT_NO is missing.");
        return;
    }

    var renkeiMap = getRenkeikanriInitlatest(lineDataMap['LOT_NO']);

    if (!renkeiMap) {

        // 完納している場合自身の工程で取り直す。
        renkeiMap = getRenkeikanriBySagyoKu(lineDataMap['LOT_NO'], lineDataMap['SAGYO_KU']);
    }

    // 特定の工程コードに対応する処理を実行
    renkeiMap = handleSpecialProcesses(lineDataMap, renkeiMap);

    if (isCurrentData(renkeiMap)) {
        renkeiMap = getRenkeikanriBySagyoKu(lineDataMap['LOT_NO'], lineDataMap['SAGYO_KU']);
    }

    // データ準備
    var preparedData = prepareRenkeiData(userInfoMap, lineDataMap, renkeiMap);

    // データベース保存
    insRenkeiObic(preparedData, renkeiMap['RENKEI_DVS'], renkeiMap);
}

function updSpecialKotei() {

    var lineDataMap = TALON.getTargetData();

    var END_DT = lineDataMap['END_DT'];
    var END_JIKAN = lineDataMap['END_JIKAN'];

    if (!END_DT || !END_JIKAN) {
        return;
    }

    var renkeiMap = getRenkeikanriBySagyoKu(lineDataMap['LOT_NO'], lineDataMap['SAGYO_KU']);
    var CURRENT_KOUTEI_JUN = renkeiMap['CURRENT_KOUTEI_JUN'];

    var whereMap = {
        LOT_NO: lineDataMap['LOT_NO'],
        CURRENT_KOUTEI_JUN: CURRENT_KOUTEI_JUN - 1
    };
    var renkeiMap2 = getLatestRenkeiKanri(whereMap, null); // 降順で最新
    if (!renkeiMap2) return; 
    var CURRENT_KOUTEI_CD = renkeiMap2['CURRENT_KOUTEI_CD']

    var specialSAGYOKU = ['250', '010', '011', '120', '121', '122'];

    if (specialSAGYOKU.indexOf(CURRENT_KOUTEI_CD) !== -1) {
        insOtherOBICCustom2(lineDataMap['ID'], renkeiMap2);
    }
}



/**
 * 特定の工程コードに対応する処理を実行し、更新された工程データを返します。
 * 
 * @param {Object} lineDataMap - 対象データ
 * @param {Object} renkeiMap - 工程データマップ
 * @returns {Object} 更新された工程データマップ
 */
function handleSpecialProcesses(lineDataMap, renkeiMap) {
    var specialSAGYOKU = ['250', '010', '011', '120', '121', '122'];

    if (!renkeiMap || !renkeiMap['SAGYO_KU']) {
        return;
    }

    while (specialSAGYOKU.indexOf(renkeiMap['SAGYO_KU']) !== -1) {
        insOtherOBICCustom(lineDataMap['ID'], renkeiMap);
        renkeiMap = getRenkeikanriInitlatest(lineDataMap['LOT_NO']);
    }

    return renkeiMap;
}

function setTdrData() {


    if (!TALON.isUpdate()) return;
    var lineDataMap = TALON.getTargetData();

    var END_DT = lineDataMap['END_DT'];
    var END_JIKAN = lineDataMap['END_JIKAN'];


    if (!END_DT || !END_JIKAN) {
        return;
    }

    var conn = TALON.getDbConfig();
    var tableName = "NP_T_TEHAI_RENKEI_KANRI";
    var whereMap = {
        LOT_NO: lineDataMap["LOT_NO"],
        SAGYO_KU: "250"

    }
    // ルータ工程で呼ばれる想定
    // TDR工程のキー情報を取得
    var renkeiMap = selectOne(conn, tableName, null, whereMap, null);

    if (!renkeiMap) return;


    insOtherOBICCustom2(lineDataMap["ID"], renkeiMap);

}

/**
 * 連携データを準備します。
 * 
 * @param {Object} userInfoMap - ユーザー情報マップ
 * @param {Object} lineDataMap - 対象データマップ
 * @param {Object} renkeiMap - 連携管理データマップ
 * @returns {Object} 連携データオブジェクト
 */
function prepareRenkeiData(userInfoMap, lineDataMap, renkeiMap) {
    var sysDate = new java.sql.Timestamp(new java.util.Date().getTime());
    var func_id = userInfoMap['FUNC_ID'];

    if (lineDataMap['END_DT']) {
        sysDate = new java.sql.Timestamp(lineDataMap['END_DT'].getTime());

    }

    var CREATED_PRG_NM = lineDataMap['CREATED_PRG_NM']
    if (CREATED_PRG_NM) {
        func_id = CREATED_PRG_NM
    }

    var saisaku_flg = 0

    if (func_id === "NIPPO_INPUT_02") {
        var CHK_SAISAKU = lineDataMap['CHK_SAISAKU']

        if (CHK_SAISAKU === "1") {

            saisaku_flg = 1
        }
    }

    return {
        NippouRenkeiSeqNO: TALON.getNumberingData('NippouRenkeiSeqNO', 1)[0],
        SaisakuKBN: saisaku_flg,
        LotKey: renkeiMap['LOT_KEY'],
        UkeYMD: sysDate,
        LotNO: renkeiMap['LOT_NO'],
        NippouCD: func_id.substring(func_id.lastIndexOf('_') + 1),
        ItemCD: renkeiMap['HINMOKU_CD'],
        ItemNM: renkeiMap['HINMOKU_NM'],
        SagyoukuCD: renkeiMap['SAGYO_KU'],
        SetsubiTantouCD: userInfoMap['USER_ID'],
        SetsubiTantouNM: userInfoMap['USER_NM'],
        OKSuu: lineDataMap['GOUKAKU_PCS_SUU'],
        NGSuu: lineDataMap['FURYO_PCS_SUU'],
        UkeJissekiSuu: lineDataMap['SAGYO_PCS_SUU'],
        StartYMD: sysDate,
        StartHM: getCurrentTime(),
        EndYMD: sysDate,
        EndHM: getCurrentTime(),
        UpdateDatetime: sysDate,
        UpdateJobID: userInfoMap['FUNC_ID'],
        UpdateUserID: userInfoMap['USER_ID']
    };
}

/**
 * 連携データを準備します。
 * 
 * @param {Object} userInfoMap - ユーザー情報マップ
 * @param {Object} lineDataMap - 対象データマップ
 * @param {Object} renkeiMap - 連携管理データマップ
 * @returns {Object} 連携データオブジェクト
 */
function prepareRenkeiDataCustom(userInfoMap, lineDataMap, renkeiMap) {
    var sysDate = new java.sql.Timestamp(new java.util.Date().getTime());
    var func_id = userInfoMap['FUNC_ID'];

    if (lineDataMap['END_DT']) {
        sysDate = new java.sql.Timestamp(lineDataMap['END_DT'].getTime());

    }

    var CREATED_PRG_NM = lineDataMap['CREATED_PRG_NM']
    if (CREATED_PRG_NM) {
        func_id = CREATED_PRG_NM
    }

    var saisaku_flg = 0

    if (func_id === "NIPPO_INPUT_02") {
        var CHK_SAISAKU = lineDataMap['CHK_SAISAKU']

        if (CHK_SAISAKU === "1") {

            saisaku_flg = 1
        }
    }

    return {
        NippouRenkeiSeqNO: TALON.getNumberingData('NippouRenkeiSeqNO', 1)[0],
        SaisakuKBN: saisaku_flg,
        LotKey: renkeiMap['LOT_KEY'],
        UkeYMD: sysDate,
        LotNO: renkeiMap['LOT_NO'],
        NippouCD: func_id.substring(func_id.lastIndexOf('_') + 1),
        ItemCD: renkeiMap['HINMOKU_CD'],
        ItemNM: renkeiMap['HINMOKU_NM'],
        SagyoukuCD: renkeiMap['SAGYO_KU'],
        SetsubiTantouCD: userInfoMap['USER_ID'],
        SetsubiTantouNM: userInfoMap['USER_NM'],
        OKSuu: lineDataMap['GOUKAKU_PCS_SUU'],
        NGSuu: 0,
        UkeJissekiSuu: lineDataMap['GOUKAKU_PCS_SUU'],
        StartYMD: sysDate,
        StartHM: getCurrentTime(),
        EndYMD: sysDate,
        EndHM: getCurrentTime(),
        UpdateDatetime: sysDate,
        UpdateJobID: userInfoMap['FUNC_ID'],
        UpdateUserID: userInfoMap['USER_ID']
    };
}


/**
 * NP_T_TEHAI_RENKEI_KANRI テーブルから最新の1件を取得します。
 *
 * @param {Object} whereMap - 検索条件
 * @param {string} orderBy - 並び順（昇順または降順）
 * @returns {Object|null} 連携管理データマップ（該当なし時は null）
 */
function getLatestRenkeiKanri(whereMap, orderBy) {
    var conn = TALON.getDbConfig();
    var tableName = "NP_T_TEHAI_RENKEI_KANRI";
    var columns = ["*"]; // すべての列を取得
    return selectOne(conn, tableName, columns, whereMap, orderBy);
}

/**
 * 指定されたLOT_NOおよび作業区に基づき、最新の連携管理データを取得します。
 * 
 * @param {string} LOT_NO - 対象のロット番号
 * @param {string} SAGYO_KU - 作業区コード
 * @returns {Object|null} 連携管理データマップ（該当なし時は null）
 */
function getRenkeikanriBySagyoKu(LOT_NO, SAGYO_KU) {
    setRenkeiKariData(LOT_NO);

    var whereMap = {
        LOT_NO: LOT_NO,
        SAGYO_KU: SAGYO_KU
    };
    return getLatestRenkeiKanri(whereMap, null); // 降順で最新
}

/**
 * 指定されたLOT_NOに基づき、初期状態の連携管理データを取得します。
 * 
 * @param {string} LOT_NO - 対象のロット番号
 * @returns {Object|null} 連携管理データマップ（該当なし時は null）
 */
function getRenkeikanriInitlatest(LOT_NO) {
    var whereMap = {
        LOT_NO: LOT_NO,
        RENKEI_DVS: "0"
    };
    return getLatestRenkeiKanri(whereMap, "CONVERT(int, KOUJUN)"); // 昇順の先頭
}


/**
 * 指定されたLOT_NOに基づき、最新の連携管理データを取得します。
 * 
 * @param {String} LOT_NO - 対象のロット番号
 * @returns {Object} 連携管理データマップ
 */
function getRenkeikanriInitlatestPressSet(LOT_NO) {
    // setRenkeiKariData(LOT_NO)
    var sql = "SELECT TOP 1 * FROM NP_T_TEHAI_RENKEI_KANRI WHERE LOT_NO = '" + LOT_NO + "' AND RENKEI_DVS ='0' AND ( SAGYO_KU LIKE '08%'  OR SAGYO_KU LIKE '09%' ) ORDER BY KOUJUN";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    return mapList[0]
}

/**
 * 指定されたLOT_NOおよび作業区に基づき、最新の連携管理データを取得します。
 * 
 * @param {String} LOT_NO - 対象のロット番号
 * @returns {Object} 連携管理データマップ
 */
function getRenkeikanriByKoujun(LOT_NO, KOUJUN) {
    setRenkeiKariData(LOT_NO)
    var sql = "SELECT TOP 1 * FROM NP_T_TEHAI_RENKEI_KANRI WHERE LOT_NO = '" + LOT_NO + "' AND KOUJUN >'" + KOUJUN + "' ORDER BY KOUJUN";
    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    return mapList[0];
}

/**
 * 挿入するデータのマップを作成する
 *
 * @param {string} LOT_NO - ロット番号
 * @param {string} SIYOSYO_SEQ - 使用書シーケンス番号
 * @param {string} START_DT - 作業開始日
 * @param {string} END_DT - 報告作業日
 * @param {string} user_id - ユーザーID
 * @param {string} func_id - 機能ID
 * @returns {Object} 挿入用データマップ
 */
function createInsertData(LOT_NO, SIYOSYO_SEQ, START_DT, END_DT, user_id, func_id) {
    var sysdate = new java.util.Date();
    return {
        'LOT_NO': LOT_NO,
        'START_DT': START_DT,
        'END_DT': END_DT,
        'SIYOSYO_SEQ': SIYOSYO_SEQ,
        'CREATED_DATE': sysdate,
        'CREATED_BY': user_id,
        'CREATED_PRG_NM': func_id,
        'UPDATED_DATE': sysdate,
        'UPDATED_BY': user_id,
        'UPDATED_PRG_NM': func_id,
        'MODIFY_COUNT': 0
    };
}

/**
 * ITAATSUデータを挿入する
 *
 * @param {Object} insMap - 挿入データ
 */
function insertItaatsuData(insMap) {
    var tableName = 'NP_T_INPUT_ITAATSU';
    insertByMapEx(TALON.getDbConfig(), tableName, insMap, false);
}

/**
 * NP_T_INPUT_ITAATSU テーブルにレコードを挿入する処理。
 * 指定されたロット番号が未登録であり、ユーザーが特定の権限を持っている場合に実行する。
 *
 * @param {string} LOT_NO - 対象のロット番号
 * @param {string} SIYOSYO_SEQ - 使用書シーケンス番号
 */
function setPressItaatsu(LOT_NO, SIYOSYO_SEQ) {
    var cnt = getItaatsuDataCnt(LOT_NO);
    var userInfo = getUserInfo();

    if (userInfo.func_id !== "NIPPO_INPUT_06_REPORT") {
        return;
    }

    if (cnt === 0) {
        var map = TALON.getBlockData_Card(1);
        var START_DT = map['START_DT'];
        var END_DT = map['OBIC_HOKOKU_SAGYO_DT'];

        var insMap = createInsertData(LOT_NO, SIYOSYO_SEQ, START_DT, END_DT, userInfo.user_id, userInfo.func_id);
        insertItaatsuData(insMap);
    }
}

/**
 * 指定されたロット番号に対する NP_T_INPUT_ITAATSU テーブルのレコード数を取得する。
 *
 * @param {string} LOT_NO - 確認対象のロット番号
 * @returns {number} レコードの件数（存在しない場合は 0）
 */
function getItaatsuDataCnt(LOT_NO) {
    var conn = TALON.getDbConfig();
    var tableName = "NP_T_INPUT_ITAATSU";
    var whereMap = { "LOT_NO": LOT_NO };

    return getCount(conn, tableName, whereMap);
}


function setRenkei() {

    kouteiRenkeiCommon();
    setKoteiShincyoku();
}

function reloadKizaiData(LOT_NO) {

    //IN パラメータ設定
    var itemDataList = new Array();
    itemDataList['i_LOT_NO'] = LOT_NO;

    var recitemNameList = [];
    //実行
    TalonDbUtil.prepareCall(TALON.getDbConfig(), 'PROC_KIZAI_DATA_LOT', itemDataList, recitemNameList)

}

/**
 * 指定IDに該当するNIPPO_LOGIC_VIEWの1件データを取得する。
 *
 * @param {string|number} ID - 対象のID
 * @returns {Object|null} 該当レコード（存在しない場合は null）
 */
function _getNippoData(ID) {
    var conn = TALON.getDbConfig();

    var whereMap = {
        ID: ID
    };

    return selectOne(conn, 'NIPPO_LOGIC_VIEW', null, whereMap, null);
}

/**
 * 日報情報を取得
 * @param ID 
 */
function getNippoData(ID) {
    chkSqlParam(ID);
    var whereMap = {}
    whereMap['ID'] = ID;
    return selectOne(TALON.getDbConfig(), "NP_T_INPUT_COMMON", null, whereMap, null);
}

/**
 * 次工程情報を取得
 *
 * @param {string|number} ID - 対象ID
 * @returns {Object|null} 次工程情報（存在しない場合はnull）
 */
function getHikitugiData(ID) {

    chkSqlParam(ID);
    var conn = TALON.getDbConfig();
    var whereMap = {}
    whereMap['ID'] = ID;
    return selectList(conn, "NIPPO_HIKITUGI_VIEW", null, whereMap, null);
}

/**
 * 工程進捗を更新する
 */
function setKoteiShincyoku() {
    var mapColumnList = getTargetKoteiCd();
    if (mapColumnList.length === 0) return;

    var mapColumn = mapColumnList[0];

    var lineDataMap = TALON.getTargetData();
    var LOT_NO = lineDataMap['LOT_NO'];
    var END_DT = lineDataMap['END_DT'];
    var END_JIKAN = lineDataMap['END_JIKAN'];
    var GOUKAKU_PCS = lineDataMap['GOUKAKU_PCS_SUU'];

    if (!END_DT || !END_JIKAN) return;

    var DSP2 = mapColumn['DSP2']; // 作業日カラム
    var DSP3 = mapColumn['DSP3']; // 投入数カラム

    var updateMap = {};
    var userInfoMap = TALON.getUserInfoMap();
    var funcid = userInfoMap['FUNC_ID'];

    if (funcid === 'NIPPO_INPUT_00') {
        updateMap[DSP2] = new java.util.Date();

        var whereMap = { LOT_NO: LOT_NO };
        var tonyuMap = selectOne(TALON.getDbConfig(), 'NP_T_TEHAI_JOHO', ['TOUNYU_PCS_SUU'], whereMap, 'ID DESC');
        var TOUNYU_PCS_SUU = tonyuMap ? tonyuMap['TOUNYU_PCS_SUU'] : null;

        updateMap[DSP3] = isNaN(TOUNYU_PCS_SUU) ? 0 : TOUNYU_PCS_SUU;
    } else {
        updateMap[DSP2] = formatDateTime(END_DT, END_JIKAN);
        updateMap[DSP3] = isNaN(GOUKAKU_PCS) ? 0 : GOUKAKU_PCS;
    }

    updateMap['LOT_NO'] = LOT_NO;

    updateByMapEx(
        TALON.getDbConfig(),
        'NP_T_KOTEI_KANRI',
        updateMap,
        ['LOT_NO'], // whereKeys（updateMapからキーとして使う）
        true         // enableLog
    );
}

/**
 * 工程ベース情報を登録します。既にロット番号が存在する場合は登録しません。
 *
 * @param {Object} kouteiMap - 工程情報のマップ（キーはカラム名に一致）
 * @param {string|number} SIYOSYO_SEQ - 仕様書連番
 */
function insKouteiBaseInfo(kouteiMap, SIYOSYO_SEQ) {
    var conn = TALON.getDbConfig();
    var LOT_NO = kouteiMap['ﾛｯﾄ№'];

    // 既存チェック
    var whereMap = { LOT_NO: LOT_NO };
    if (getCount(conn, 'NP_T_KOTEI_KANRI', whereMap) > 0) {
        return;
    }

    // 必須項目補完
    kouteiMap['LOT_NO'] = LOT_NO;
    kouteiMap['SIYOSYO_SEQ'] = SIYOSYO_SEQ;

    // 登録処理（カラムリスト自動取得、ログ出力あり）
    insertByMapEx(conn, 'NP_T_KOTEI_KANRI', kouteiMap, true);
}

function updNP_T_KOTEI_KANRIbyMap(targetMap, whereList) {

    TalonDbUtil.updateByMap(
        TALON.getDbConfig(),
        'NP_T_KOTEI_KANRI',
        targetMap,
        _getColList(TALON.getDbConfig(), 'NP_T_KOTEI_KANRI'),
        whereList);

}



/**
 * OBIC連携用日報実績データを T0000RK_NippouJisseki_Renkei に登録する。
 * ※ すでにLotKeyが存在する場合はスキップ。
 *
 * @param {Object} map0 - 日報共通入力データマップ（NP_T_INPUT_COMMON 由来）
 */
function insOtherOBIC(map0) {
    var map = {}; // ← 修正: オブジェクト初期化

    var conn2 = TALON.getOtherDBConn("2");

    // 日付・時間変換
    var sysDate = new java.util.Date();
    sysDate = new java.sql.Timestamp(sysDate.getTime());
    var StartHM = map0['START_JIKAN'].substring(0, 2) + map0['START_JIKAN'].substring(3, 5);
    var EndHM = map0['END_JIKAN'].substring(0, 2) + map0['END_JIKAN'].substring(3, 5);

    // 必須項目設定
    map['LotKey'] = map0['LOT_NO'] + map0['ID'];
    map['UkeYMD'] = map0['END_DT'];
    map['LotNO'] = map0['LOT_NO'];
    map['NippouCD'] = map0['CREATED_PRG_NM'].substring(map0['CREATED_PRG_NM'].lastIndexOf('_') + 1);
    map['ItemCD'] = map0['HINMOKU_CD'];
    map['ItemNM'] = map0['HINMOKU_NM'];
    map['SagyoukuCD'] = map0['SAGYO_KU'];
    map['SetsubiTantouCD'] = map0['TANTO_SYA_CD'];
    map['SetsubiTantouNM'] = map0['USER_NM'];
    map['OKSuu'] = map0['GOUKAKU_PCS_SUU'];
    map['NGSuu'] = 0;
    map['UkeJissekiSuu'] = map0['GOUKAKU_PCS_SUU'];
    map['SaisakuKBN'] = 0;
    map['JissekiKBN'] = 1;
    map['StartYMD'] = map0['START_DT'];
    map['StartHM'] = StartHM;
    map['EndYMD'] = map0['END_DT'];
    map['EndHM'] = EndHM;

    // 固定値・初期化
    map['SagyouJikan'] = 0;
    map['SagyouNinzuu'] = 0;
    map['TotalSagyouJikan'] = 0;
    map['SetsubiTotalSagyouJikan'] = 0;
    map['UpdateStatusKBN'] = 0;
    map['HasseiInputKBN'] = 1;
    map['GaichuuKakouTanka'] = 0;
    map['GaichuuKakouKingaku'] = 0;

    for (var i = 1; i <= 10; i++) {
        map['NippouRenkeiExtNum' + i] = 0;
    }

    map['UpdateDatetime'] = sysDate;
    map['UpdateJobID'] = map0['CREATED_PRG_NM'];
    map['UpdateUserID'] = map0['CREATED_BY'];
    map['UpdateComputerName'] = "";
    map['UpdateComputerUserName'] = "";
    map['UpdateComputerDomainName'] = "";

    // 件数チェック（既存データありならスキップ）
    var whereMap = { LotKey: map['LotKey'] };
    var count = getCount(conn2, 'T0000RK_NippouJisseki_Renkei', whereMap);

    if (count === 0) {
        var seq = TALON.getNumberingData('NippouRenkeiSeqNO', 1)[0];
        map['NippouRenkeiSeqNO'] = seq;
        map['ShoriKBN'] = "INSERT";

        TalonDbUtil.begin(conn2);
        insertByMapEx(conn2, 'T0000RK_NippouJisseki_Renkei', map, true);
        TalonDbUtil.commit(conn2);
    }
    // else: 既存あり → スキップ
}


function TDROBIC() {
    if (TALON.isInsert() || TALON.isUpdate()) {
        var lineDataMap = TALON.getTargetData();
        var ID = lineDataMap['ID'];
        if (!ID) {
            return;
        }
        var sql = " SELECT NP_T_INPUT_COMMON.*, COM_M_USER.USER_NM FROM NP_T_INPUT_COMMON INNER JOIN COM_M_USER ON NP_T_INPUT_COMMON.TANTO_SYA_CD = COM_M_USER.USER_ID WHERE ID = '" + ID + "'  AND CHK_DELETE IS NULL";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (mapList.length > 0) {
            var map = mapList[0];
            if (!map['END_DT'] || !map['END_JIKAN']) {
                return;
            }


            var SIYOSYO_SEQ = map['SIYOSYO_SEQ'];
            if (!SIYOSYO_SEQ) {
                return;
            }
            var CURRENT_KOUTEI_JUN = map['CURRENT_KOUTEI_JUN'];
            if (!CURRENT_KOUTEI_JUN) {
                return;
            } else {

                var LOT_NO = map['LOT_NO']
                var map = getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map);

            }

            map['FURYO_PCS_SUU'] = 0;

            var KOUTEI_JUN = parseInt(CURRENT_KOUTEI_JUN) - 1;
            // 前工程がTDRの場合だけ
            var sql = " SELECT COUNT(*) CNT FROM KOUTEIJUN_KANRI "
                + " WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ
                + "' AND KOUTEI_JUN = " + KOUTEI_JUN
                + " AND KOUTEI_CD = '250' ";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            var mapCNT = mapList[0];
            var CNT = mapCNT['CNT'];
            if (CNT == 0) {
                return;
            }

            map['SAGYO_KU'] = "250";
            map['ID'] = TALON.getNumberingData('TID', 1)[0];
            insOtherOBIC(map);
        }
    }
}

/**
 * OBIC連携
 * @returns 
 */
function TDROBIC2() {

    if (TALON.isInsert() || TALON.isUpdate()) {
        var lineDataMap = TALON.getTargetData();
        var ID = lineDataMap['ID'];
        if (!ID) {
            return;
        }
        var sql = " SELECT NP_T_INPUT_COMMON.*, COM_M_USER.USER_NM FROM NP_T_INPUT_COMMON INNER JOIN COM_M_USER ON NP_T_INPUT_COMMON.TANTO_SYA_CD = COM_M_USER.USER_ID WHERE ID = '" + ID + "'  AND CHK_DELETE IS NULL";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (mapList.length > 0) {
            var map = mapList[0];
            if (!map['END_DT'] || !map['END_JIKAN']) {
                return;
            }


            var SIYOSYO_SEQ = map['SIYOSYO_SEQ'];
            if (!SIYOSYO_SEQ) {
                return;
            }
            var CURRENT_KOUTEI_JUN = map['CURRENT_KOUTEI_JUN'];
            if (!CURRENT_KOUTEI_JUN) {
                return;
            } else {

                var LOT_NO = map['LOT_NO']
                var map = getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map);

            }


            map['FURYO_PCS_SUU'] = 0;

            var KOUTEI_JUN = parseInt(CURRENT_KOUTEI_JUN) - 1;
            // 前工程がTDRの場合だけ
            var sql = " SELECT COUNT(*) CNT FROM KOUTEIJUN_KANRI "
                + " WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ
                + "' AND KOUTEI_JUN = " + KOUTEI_JUN
                + " AND KOUTEI_CD = '250' ";
            var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
            var mapCNT = mapList[0];
            var CNT = mapCNT['CNT'];
            if (CNT == 0) {
                return;
            }

            map['SAGYO_KU'] = "250";
            map['ID'] = TALON.getNumberingData('TID', 1)[0];
            insOtherOBIC(map);
        }
    }
}

function TDROBICKako() {
    if (TALON.isUpdate()) {
        var lineDataMap = TALON.getTargetData();
        var ID = lineDataMap['ID'];
        if (!ID) {
            return;
        }

        var sql = " SELECT NP_T_INPUT_COMMON.* FROM NP_T_INPUT_COMMON WHERE ID = '" + ID + "'  AND CHK_DELETE IS NULL";
        var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
        if (mapList.length > 0) {

            var map = mapList[0];
            var SAGYO_KU = map['SAGYO_KU'];
            if (SAGYO_KU) {
                if (!map['END_DT'] || !map['END_JIKAN']) {
                    return;
                }

                var SIYOSYO_SEQ = map['SIYOSYO_SEQ'];
                if (!SIYOSYO_SEQ) {
                    return;
                }
                var CURRENT_KOUTEI_JUN = map['CURRENT_KOUTEI_JUN'];
                if (!CURRENT_KOUTEI_JUN) {
                    return;
                } else {
                    var LOT_NO = map['LOT_NO']
                    var map = getNippoMapNonId(LOT_NO, ID, CURRENT_KOUTEI_JUN, map);

                }


                map['FURYO_PCS_SUU'] = 0;

                var KOUTEI_JUN = parseInt(CURRENT_KOUTEI_JUN) - 1;
                //前工程はTDRの場合だけ
                var sql = " SELECT COUNT(*) CNT FROM KOUTEIJUN_KANRI "
                    + " WHERE SIYOSYO_SEQ = '" + SIYOSYO_SEQ
                    + "' AND KOUTEI_JUN = " + KOUTEI_JUN
                    + " AND KOUTEI_CD = '250' ";
                var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
                var mapCNT = mapList[0];
                var CNT = mapCNT['CNT'];
                if (CNT == 0) {
                    return;
                }
                map['SAGYO_KU'] = "250";
                var userInfoMap = TALON.getUserInfoMap();
                var USER_NM = userInfoMap['USER_NM'];
                map['USER_NM'] = USER_NM;

                map['ID'] = TALON.getNumberingData('TID', 1)[0];
                insOtherOBIC(map);
            }
        }
    }
}


/**
 * NP_T_TEHAI_RENKEI_KANRI テーブルから最初の連携情報を取得
 *
 * @param {string} LOT_NO - 対象ロット番号
 * @returns {Object|null} レコードが存在すればマップ、なければ null
 */
function getRenkeikanriInit(LOT_NO) {
    var conn = TALON.getDbConfig();
    var whereMap = {
        LOT_NO: LOT_NO,
        KOUJUN: 1
    };

    var list = selectList(conn, "NP_T_TEHAI_RENKEI_KANRI", null, whereMap, null);
    return (list && list.length > 0) ? list[0] : null;
}

/**
 * 連携テーブルの更新処理
 *
 * @param {string} ID - 入力共通ID
 * @param {string} LOT_NO - ロット番号
 * @param {string} SAGYO_KU - 作業区
 * @param {number} TOUNYU_PCS_SUU - 投入数量
 * @param {number} GOUKAKU_PCS_SUU - 合格数量
 * @param {number} FURYO_PCS_SUU - 不良数量
 * @param {Object} renkeiMap - 連携データマップ
 */
function updRenkeiTbl(ID, LOT_NO, SAGYO_KU, TOUNYU_PCS_SUU, GOUKAKU_PCS_SUU, FURYO_PCS_SUU, renkeiMap) {

    if (TOUNYU_PCS_SUU === 0) {

        return;
    }

    var conn = TALON.getDbConfig();

    // 1件目更新
    var updateMap1 = {
        RENKEI_DVS: '3',
        TOUNYU_PCS_SUU: TOUNYU_PCS_SUU,
        GOUKAKU_PCS_SUU: GOUKAKU_PCS_SUU,
        FURYO_PCS_SUU: FURYO_PCS_SUU,
        LOT_NO: LOT_NO,
        SAGYO_KU: SAGYO_KU
    };

    var whereList = ['LOT_NO', 'SAGYO_KU'];

    updateByMapEx(conn, 'NP_T_TEHAI_RENKEI_KANRI', updateMap1, whereList, true);

    // 特定作業区での追加処理
    var KOUJUN = renkeiMap['KOUJUN'];
    var renkeimap2 = getRenkeikanriByKoujun(LOT_NO, KOUJUN);

    if (!ID) return;

    var specialKu = ['250', '120', '121', '122', '123'];
    if (specialKu.indexOf(renkeimap2['SAGYO_KU']) > -1) {
        var updateMap2 = {
            RENKEI_DVS: '3',
            TOUNYU_PCS_SUU: TOUNYU_PCS_SUU,
            GOUKAKU_PCS_SUU: TOUNYU_PCS_SUU,
            FURYO_PCS_SUU: 0,
            LOT_NO: LOT_NO,
            SAGYO_KU: renkeimap2['SAGYO_KU']
        };

        var whereList = ['LOT_NO', 'SAGYO_KU'];

        updateByMapEx(conn, 'NP_T_TEHAI_RENKEI_KANRI', updateMap2, whereList, true);

        // OBIC連携処理用データ設定
        renkeimap2['TOUNYU_PCS_SUU'] = TOUNYU_PCS_SUU;
        renkeimap2['GOUKAKU_PCS_SUU'] = TOUNYU_PCS_SUU;
        renkeimap2['FURYO_PCS_SUU'] = 0;

        insOtherOBICCustom(ID, renkeimap2);
    }
}

function getTargetList3() {

    var sql = ""
        + " SELECT "
        + "     LotNO"
        + " FROM T0000RK_NippouJisseki_Renkei T1"
        + " WHERE NOT EXISTS( "
        + "         SELECT 'X' "
        + "         FROM T0000RK_NippouJisseki_Renkei T2"
        + "         WHERE T1.LotNO = T2.LotNO "
        + "         AND SagyoukuCD = '010' )"
        + " AND LotNO LIKE '24%'"
        + " GROUP BY LotNO "
    return TalonDbUtil.select(TALON.getOtherDBConn("2"), sql)

}


function junbiOBICKako() {

}

function junbiOBIC() {

    var userInfoMap = TALON.getUserInfoMap();
    var USER_ID = userInfoMap['USER_ID'];
    var USER_NM = userInfoMap['USER_NM'];

    var lineDataMap = TALON.getTargetData();
    var LotNO = lineDataMap['LOT_NO'];
    if (!LotNO) {
        return;
    }

    setRenkeiKariData(LotNO)
    var CHK = TALON.getBlockRequestParameter('1_CHK');
    if (!CHK) {
        CHK = lineDataMap['CHK'];
        if (!CHK) {
            return;
        }
        if (CHK != "1") {
            return;
        }
    }

    var renkeiMap = getRenkeikanriInit(LotNO)

    var LotKey = renkeiMap['LOT_KEY'];
    var RENKEI_DVS = renkeiMap['RENKEI_DVS']
    var KOUTEI_CD = renkeiMap['SAGYO_KU'];
    var TOUNYU_PCS_SUU = renkeiMap['TOUNYU_PCS_SUU'];

    var ItemCD = lineDataMap['HINMOKU_CD'];
    var ItemNM = renkeiMap['HINMOKU_NM'];
    var OKSuu = TOUNYU_PCS_SUU

    var sysDate = new Date();
    var year = sysDate.getFullYear();
    var month = sysDate.getMonth() + 1; // Months are zero-based, so add 1
    var day = sysDate.getDate();
    var nowDate = new java.sql.Date(year - 1900, month - 1, day);
    var hours = sysDate.getHours();
    var minutes = sysDate.getMinutes();
    var nowTime = (hours < 10 ? '0' : '') + hours + (minutes < 10 ? '0' : '') + minutes;
    sysDate = new java.util.Date();
    sysDate = new java.sql.Timestamp(sysDate.getTime());

    var map = new Array();
    var numList = TALON.getNumberingData('NippouRenkeiSeqNO', 1);
    map['NippouRenkeiSeqNO'] = numList[0];
    map['LotKey'] = LotKey;
    map['UkeYMD'] = nowDate;
    map['LotNO'] = LotNO;
    map['NippouCD'] = '00';
    map['ItemCD'] = ItemCD;
    map['ItemNM'] = ItemNM;
    map['SagyoukuCD'] = KOUTEI_CD;
    map['SetsubiTantouCD'] = USER_ID;
    map['SetsubiTantouNM'] = USER_NM;
    map['OKSuu'] = OKSuu;
    map['NGSuu'] = 0;
    map['UkeJissekiSuu'] = OKSuu;
    map['SaisakuKBN'] = 0;
    map['JissekiKBN'] = 1;
    map['StartYMD'] = nowDate;
    map['StartHM'] = nowTime;
    map['EndYMD'] = nowDate;
    map['EndHM'] = nowTime;
    map['SagyouJikan'] = 0;
    map['SagyouNinzuu'] = 0;
    map['TotalSagyouJikan'] = 0;
    map['SetsubiTotalSagyouJikan'] = 0;
    map['UpdateStatusKBN'] = 0;
    map['HasseiInputKBN'] = 1;
    map['GaichuuKakouTanka'] = 0;
    map['GaichuuKakouKingaku'] = 0;
    map['NippouRenkeiExtNum1'] = 0;
    map['NippouRenkeiExtNum2'] = 0;
    map['NippouRenkeiExtNum3'] = 0;
    map['NippouRenkeiExtNum4'] = 0;
    map['NippouRenkeiExtNum5'] = 0;
    map['NippouRenkeiExtNum6'] = 0;
    map['NippouRenkeiExtNum7'] = 0;
    map['NippouRenkeiExtNum8'] = 0;
    map['NippouRenkeiExtNum9'] = 0;
    map['NippouRenkeiExtNum10'] = 0;
    map['UpdateDatetime'] = sysDate;
    map['UpdateJobID'] = 'NIPPO_INPUT_00';
    map['UpdateUserID'] = USER_ID;
    map['UpdateComputerName'] = "";
    map['UpdateComputerUserName'] = "";
    map['UpdateComputerDomainName'] = "";

    var colList = _getColList(TALON.getOtherDBConn("2"), 'T0000RK_NippouJisseki_Renkei');

    if (RENKEI_DVS == '0') {
        map['ShoriKBN'] = "INSERT";
        updRenkeiTbl(null, LotNO, KOUTEI_CD, OKSuu, OKSuu, 0, renkeiMap)
    } else {
        map['ShoriKBN'] = "UPDATE";
    }

    TalonDbUtil.begin(TALON.getOtherDBConn("2"));
    TalonDbUtil.insertByMap(TALON.getOtherDBConn("2"), 'T0000RK_NippouJisseki_Renkei', map, colList);
    TalonDbUtil.commit(TALON.getOtherDBConn("2"));
}

function seimenOBIC() {
    var lineDataMap = TALON.getBlockData_Card(2);
    var LotNO = lineDataMap['LOT_NO'];
    var END_DT = TALON.getBlockRequestParameter('2_END_DT');
    if (!END_DT) {
        END_DT = lineDataMap['END_DT'];
        if (!END_DT) {
            return;
        }
    }
    var END_JIKAN = TALON.getBlockRequestParameter('2_END_JIKAN');
    if (!END_JIKAN) {
        END_JIKAN = lineDataMap['END_JIKAN'];
        if (!END_JIKAN) {
            return;
        }
    }
    var END_HM = parseInt(END_JIKAN.substring(0, 2) + END_JIKAN.substring(3, 5));

    var sql0 = getBodySql('SUB_NIPPO_HIKITUGI');
    sql0 = sql0 + " WHERE LOT_NO = '" + LotNO + "' ORDER BY BEFORE_KOUTEI_JUN DESC, ID DESC ";
    var mapList0 = TalonDbUtil.select(TALON.getDbConfig(), sql0);
    var map0 = mapList0[1];
    var FUNC_ID = map0['BEFORE_CREATED_PRG_NM'];
    if (FUNC_ID != "NIPPO_INPUT_20" && FUNC_ID != "NIPPO_INPUT_21") {
        return;
    }

    var UkeJissekiSuu = parseInt(TALON.getBlockRequestParameter('2_SAGYO_PCS_SUU'));
    if (!UkeJissekiSuu) {
        UkeJissekiSuu = parseInt(lineDataMap['SAGYO_PCS_SUU']);
    }
    var OKSuu = parseInt(TALON.getBlockRequestParameter('2_GOUKAKU_PCS_SUU'));
    if (!OKSuu) {
        OKSuu = parseInt(lineDataMap['GOUKAKU_PCS_SUU']);
    }
    var NGSuu = parseInt(TALON.getBlockRequestParameter('2_FURYO_PCS_SUU'));
    if (!NGSuu) {
        NGSuu = parseInt(lineDataMap['FURYO_PCS_SUU']);
    }
    var map = new Array();
    map['LotNO'] = LotNO;
    map['UkeJissekiSuu'] = UkeJissekiSuu;
    map['OKSuu'] = OKSuu;
    map['NGSuu'] = NGSuu;
    map['EndYMD'] = END_DT;
    map['EndHM'] = END_HM;

    var sysDate = new java.util.Date();
    sysDate = new java.sql.Timestamp(sysDate.getTime());
    map['UpdateDatetime'] = sysDate;

    var colList = [
        'LotNO'
        , 'OKSuu'
        , 'NGSuu'
        , 'UkeJissekiSuu'
        , 'EndYMD'
        , 'EndHM'
        , 'UpdateDatetime'
        , 'UpdateJobID'
    ];

    var sql = " SELECT COUNT(*) CNT FROM T0000RK_NippouJisseki_Renkei WHERE LotNO = '" + LotNO + "' AND UpdateJobID = '" + FUNC_ID + "' ";
    var mapList = TalonDbUtil.select(TALON.getOtherDBConn("2"), sql);
    var map1 = mapList[0];
    var CNT = map1['CNT'];

    if (CNT > 0) {
        map['UpdateJobID'] = FUNC_ID;
        var whereList = new Array();
        whereList.push([null, '=', 'LotNO']);
        whereList.push(['AND', '=', 'UpdateJobID']);

        TalonDbUtil.begin(TALON.getOtherDBConn("2"));
        TalonDbUtil.updateByMap(TALON.getOtherDBConn("2"), 'T0000RK_NippouJisseki_Renkei', map, colList, whereList);
        TalonDbUtil.commit(TALON.getOtherDBConn("2"));
    }
}

/**
 * 指定ロットの連携管理データを削除し、再生成する
 *
 * @param {string} LOT_NO - 対象のロット番号
 */
function batRenkeiKanri(LOT_NO) {
    var whereMap = { LOT_NO: LOT_NO };
    // 削除用キー設定
    var deleteKeys = ['LOT_NO'];

    // 拡張削除関数（ログ付き）で削除
    deleteByMapEx(TALON.getDbConfig(), 'NP_T_TEHAI_RENKEI_KANRI', whereMap, deleteKeys, true);

    // 再生成処理
    setRenkeiKariData(LOT_NO);
}


/**
 * 連携仮データが存在しない場合、手配連携データを作成する
 *
 * @param {string} LOT_NO - 対象のロット番号
 */
function setRenkeiKariData(LOT_NO) {
    var whereMap = { LOT_NO: LOT_NO };
    var mapList = selectList(TALON.getDbConfig(), 'NP_T_TEHAI_RENKEI_KANRI', null, whereMap, null);

    if (!mapList || mapList.length === 0) {
        setTehaiReikei(LOT_NO);
    }
}


/**
 * 手配連携情報を設定します。
 * 
 * @param {String} LOT_NO - 対象のロット番号
 */
function setTehaiReikei(LOT_NO) {
    var col = [
        'LOT_NO', 'LOT_KEY', 'SAGYOU_DT', 'SAGYO_KU', 'SAGYO_NM', 'NEXT_SAGYO_KU', 'NEXT_SAGYO_NM',
        'COURSE', 'HYOMEN_SYORI_CD', 'TOUNYU_PCS_SUU', 'TOUNYU_PN_SUU', 'TOUNYU_M2', 'HINMOKU_CD',
        'HINMOKU_NM', 'KOUJUN', 'SIYOSYO_SEQ', 'RENKEI_DVS', 'GOUKAKU_PCS_SUU', 'FURYO_PCS_SUU',
        'KIBOU_DT', 'KAITOU_DT', 'SYUKKA_DT', 'SYUKKASAKI', 'TOKUISAKI', 'NEW_OR_REPEAT', 'SASIZU_NO',
        'MIHIKIATE_SU', 'BIKOU', 'PRN_FLG', 'JYUCHU_NO', 'CURRENT_KOUTEI_JUN', 'CURRENT_KOUTEI_CD',
        'NEXT_KOUTEI_JUN', 'NEXT_KOUTEI_CD', 'BEFORE_KOUTEI_JUN', 'BEFORE_KOUTEI_CD'
    ];


    var mapList = TalonDbUtil.select(TALON.getDbConfig(), "SELECT * FROM NP_T_TEHAI_JOHO WHERE LOT_NO = '" + LOT_NO + "' ORDER BY CONVERT(INT, KOUJUN)");

    if (mapList.length === 0) {

        TALON.addErrorMsg("手配マスタが連携されておりません。システム管理者に問い合わせてください。")
        return
    }


    var tempMap = mapList[0];
    var SIYOSYO_SEQ = null
    var mapList2 = TalonDbUtil.select(TALON.getDbConfig(), "SELECT TOP 1 * FROM O7ISCHEDULE_HIST WHERE LOT_NO = '" + LOT_NO + "'");
    if (mapList2.length == 0) {

        var map3 = TalonDbUtil.select(TALON.getDbConfig(), "SELECT TOP 1 * FROM SIYOSYO_MAIN WHERE HINMOKU_CD = '" + tempMap['HINMOKU_CD'] + "'")[0];
        var map2 = new Array()

        SIYOSYO_SEQ = map3['SIYOSYO_SEQ'];
        map2['JYUCHU_NO'] = 0;
        map2['KIBOU_DT'] = null;
        map2['KAITOU_DT'] = null;
        map2['SYUKKA_DT'] = null;
        map2['SYUKKASAKI'] = null;
        map2['TOKUISAKI'] = null;
        map2['SASIZU_NO'] = null;
        map2['MIHIKIATE_SU'] = null;
        map2['BIKOU'] = null;
        map2['PRN_FLG'] = null;

        var kouteiMapList = TalonDbUtil.select(TALON.getDbConfig(), "SELECT TOP 1 * FROM [V_KouteiShinchoku] WHERE [ﾛｯﾄ№] = '" + LOT_NO + "'");

        if (kouteiMapList.length == 0) {

        } else {

            var kouteiMap = kouteiMapList[0];
            insKouteiBaseInfo(kouteiMap, SIYOSYO_SEQ)
            map2['JYUCHU_NO'] = kouteiMap['受注伝票番号'];
            map2['SYUKKA_DT'] = kouteiMap['出荷予定日'];
            map2['SYUKKASAKI'] = kouteiMap['得意先名'];
            map2['TOKUISAKI'] = kouteiMap['得意先CD'];
            map2['MIHIKIATE_SU'] = kouteiMap['引当数(PCS)'];
            var TOUNYU_PN_SUU = kouteiMap['投入PN数'];
            var TOUNYU_M2 = kouteiMap['投入㎡数'];
        }

    } else {

        var map2 = mapList2[0]

        SIYOSYO_SEQ = map2['SIYOSYO_SEQ'];

        var kouteiMapList = TalonDbUtil.select(TALON.getDbConfig(), "SELECT TOP 1 * FROM [V_KouteiShinchoku] WHERE [ﾛｯﾄ№] = '" + LOT_NO + "'");

        if (kouteiMapList.length == 0) {
            if (SIYOSYO_SEQ) {

                var map3 = TalonDbUtil.select(TALON.getDbConfig(), "SELECT TOP 1 * FROM SIYOSYO_MAIN WHERE SIYOSYO_SEQ = " + SIYOSYO_SEQ)[0];

                var TOUNYU_PN_SUU = tempMap['TOUNYU_PCS_SUU'] / (map3['MENTUKESU1'] * map3['MENTUKESU2']);
                var TOUNYU_M2 = 0
            } else {
                var TOUNYU_PN_SUU = 0
                var TOUNYU_M2 = 0

            }
        } else {

            var kouteiMap = kouteiMapList[0];
            insKouteiBaseInfo(kouteiMap, SIYOSYO_SEQ)
            map2['JYUCHU_NO'] = kouteiMap['受注伝票番号'];
            map2['SYUKKA_DT'] = kouteiMap['出荷予定日'];
            map2['SYUKKASAKI'] = kouteiMap['得意先名'];
            map2['TOKUISAKI'] = kouteiMap['得意先CD'];
            map2['MIHIKIATE_SU'] = kouteiMap['引当数(PCS)'];
            var TOUNYU_PN_SUU = kouteiMap['投入PN数'];
            var TOUNYU_M2 = kouteiMap['投入㎡数'];
        }

    }

    var ID = TALON.getNumberingData('TID', 1)[0];
    TalonDbUtil.begin(TALON.getDbConfig());

    for (var i = 0; i < mapList.length; i++) {
        var map = mapList[i];
        map['LOT_KEY'] = map['LOT_NO'] + map['SAGYO_KU'] + ID;
        map['RENKEI_DVS'] = '0';
        map['SIYOSYO_SEQ'] = SIYOSYO_SEQ
        map['GOUKAKU_PCS_SUU'] = map['TOUNYU_PCS_SUU'];
        map['FURYO_PCS_SUU'] = 0;
        map['JYUCHU_NO'] = map2['JYUCHU_NO'];
        map['TOUNYU_PN_SUU'] = TOUNYU_PN_SUU;
        map['TOUNYU_M2'] = TOUNYU_M2;
        map['KIBOU_DT'] = map2['KIBOU_DT'];
        map['KAITOU_DT'] = map2['KAITOU_DT'];
        map['SYUKKA_DT'] = map2['SYUKKA_DT'];
        map['SYUKKASAKI'] = map2['SYUKKASAKI'];
        map['TOKUISAKI'] = map2['TOKUISAKI'];
        map['SASIZU_NO'] = map2['SASIZU_NO'];
        map['MIHIKIATE_SU'] = map2['MIHIKIATE_SU'];
        map['BIKOU'] = map2['BIKOU'];
        map['PRN_FLG'] = map2['PRN_FLG'];

        // 工程情報の設定

        if (SIYOSYO_SEQ) {

            map = setKouteiInfo(map, SIYOSYO_SEQ);
        } else {
            map['CURRENT_KOUTEI_JUN'] = null
            map['CURRENT_KOUTEI_CD'] = null
            map['NEXT_KOUTEI_JUN'] = null
            map['NEXT_KOUTEI_CD'] = null
            map['BEFORE_KOUTEI_JUN'] = null
            map['BEFORE_KOUTEI_CD'] = null
            map = setKouteiInfo(map, SIYOSYO_SEQ);

        }

        TalonDbUtil.insertByMap(TALON.getDbConfig(), 'NP_T_TEHAI_RENKEI_KANRI', map, col);
    }

    TalonDbUtil.commit(TALON.getDbConfig());
}

/**
 * 連携データをデータベースに保存します。
 * 
 * @param {Object} map - 保存対象のデータオブジェクト
 * @param {String} RENKEI_DVS - 処理区分（INSERTまたはUPDATE）
 */
function insRenkeiObic(map, RENKEI_DVS, renkeiMap) {
    // デフォルト値を設定
    setDefaultValues(map);
    var conn = TALON.getOtherDBConn("2");
    var whereMap = {
        LotKey: map['LotKey']

    }
    var cnt = getCount(conn, "T0000RK_NippouJisseki_Renkei", whereMap);
    map['ShoriKBN'] = cnt == 0 ? "INSERT" : "UPDATE";

    if (map['SaisakuKBN'] == 1) {

        map['ShoriKBN'] = "INSERT"
        return
    }

    if (map['UkeJissekiSuu'] === 0 || map['OKSuu'] === 0) {

        return;
    }

    TalonDbUtil.begin(conn);
    insertByMapEx(conn, 'T0000RK_NippouJisseki_Renkei', map, true);
    TalonDbUtil.commit(conn);

    updRenkeiTbl(map['ID'], map['LotNO'], map['SagyoukuCD'], map['UkeJissekiSuu'], map['OKSuu'], map['NGSuu'], renkeiMap);
}

/**
 * デフォルト値を連携データに設定します。
 * 
 * @param {Object} map - デフォルト値を設定するデータオブジェクト
 */
function setDefaultValues(map) {
    map['JissekiKBN'] = 1;
    map['SagyouJikan'] = 0;
    map['SagyouNinzuu'] = 0;
    map['TotalSagyouJikan'] = 0;
    map['SetsubiTotalSagyouJikan'] = 0;
    map['UpdateStatusKBN'] = 0;
    map['HasseiInputKBN'] = 1;
    map['GaichuuKakouTanka'] = 0;
    map['GaichuuKakouKingaku'] = 0;
    map['NippouRenkeiExtNum1'] = 0;
    map['NippouRenkeiExtNum2'] = 0;
    map['NippouRenkeiExtNum3'] = 0;
    map['NippouRenkeiExtNum4'] = 0;
    map['NippouRenkeiExtNum5'] = 0;
    map['NippouRenkeiExtNum6'] = 0;
    map['NippouRenkeiExtNum7'] = 0;
    map['NippouRenkeiExtNum8'] = 0;
    map['NippouRenkeiExtNum9'] = 0;
    map['NippouRenkeiExtNum10'] = 0;
    map['UpdateComputerName'] = "";
    map['UpdateComputerUserName'] = "";
    map['UpdateComputerDomainName'] = "";
}


/**
 * OBICの特定カスタム処理を実行します。
 * 
 * @param {String} ID - 対象のID
 * @param {Object} renkeiMap - 連携管理データマップ
 */
function insOtherOBICCustom(ID, renkeiMap) {

    var sql = "SELECT NP_T_INPUT_COMMON.*, COM_M_USER.USER_NM " +
        "FROM NP_T_INPUT_COMMON " +
        "LEFT OUTER JOIN COM_M_USER ON NP_T_INPUT_COMMON.TANTO_SYA_CD = COM_M_USER.USER_ID " +
        "WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";

    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (!mapList || mapList.length === 0) {
        TALON.addErrorMsg("No data found for ID: " + ID);
        return;
    }

    var map0 = mapList[0];
    var map = prepareRenkeiDataCustom(TALON.getUserInfoMap(), map0, renkeiMap);

    insRenkeiObic(map, renkeiMap['RENKEI_DVS'], renkeiMap);

    if (renkeiMap['SAGYO_KU'] == '120'
        || renkeiMap['SAGYO_KU'] == '121'
        || renkeiMap['SAGYO_KU'] == '122') {
        map0['SAGYO_PCS_SUU'] = map0['SAGYO_PCS_SUU'];
        map0['GOUKAKU_PCS_SUU'] = map0['SAGYO_PCS_SUU'];
        map0['FURYO_PCS_SUU'] = 0;
        map0['SAGYO_KU'] = renkeiMap['SAGYO_KU'];
        map0['CREATED_PRG_NM'] = "NIPPO_INPUT_33";
        map0['CURRENT_KOUTEI_JUN'] = renkeiMap['CURRENT_KOUTEI_JUN']
        map0['CURRENT_KOUTEI_CD'] = renkeiMap['CURRENT_KOUTEI_CD'];
        map0['NEXT_KOUTEI_JUN'] = renkeiMap['NEXT_KOUTEI_JUN'];
        map0['NEXT_KOUTEI_CD'] = renkeiMap['NEXT_KOUTEI_CD'];

        insOther(map0);
    }
}

/**
 * OBICの特定カスタム処理を実行します。
 * 
 * @param {String} ID - 対象のID
 * @param {Object} renkeiMap - 連携管理データマップ
 */
function insOtherOBICCustom2(ID, renkeiMap) {

    var sql = "SELECT NP_T_INPUT_COMMON.*, COM_M_USER.USER_NM " +
        "FROM NP_T_INPUT_COMMON " +
        "LEFT OUTER JOIN COM_M_USER ON NP_T_INPUT_COMMON.TANTO_SYA_CD = COM_M_USER.USER_ID " +
        "WHERE ID = '" + ID + "' AND CHK_DELETE IS NULL";

    var mapList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (!mapList || mapList.length === 0) {
        TALON.addErrorMsg("No data found for ID: " + ID);
        return;
    }

    var map0 = mapList[0];
    var map = prepareRenkeiDataCustom(TALON.getUserInfoMap(), map0, renkeiMap);

    insRenkeiObic(map, renkeiMap['RENKEI_DVS'], renkeiMap);

}

