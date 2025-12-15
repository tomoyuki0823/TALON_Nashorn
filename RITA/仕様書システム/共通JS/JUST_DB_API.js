/** 仕様書取込JUSTDB検索 検索対象テーブル名 案件情報 */
var ENDPOINT_NM_ANKEN = 'ANKEN';
/** 仕様書取込JUSTDB検索 検索対象テーブル名 見積情報 */
var ENDPOINT_NM_MITSUMORI = 'MITSUMORI';
/** 仕様書取込JUSTDB検索 検索対象テーブル名 見積情報(明細) */
var ENDPOINT_NM_MITSUMORI_MEISAI = 'MITSUMORI_MEISAI';
/** 仕様書取込JUSTDB検索 検索対象テーブル名 発注情報 */
var ENDPOINT_NM_HACCHU = 'HACCHU';
/** 仕様書取込JUSTDB検索 検索対象テーブル名 イニシャル情報 */
var ENDPOINT_NM_INITIAL = 'INITIAL';
/** 仕様書取込JUSTDB検索 検索対象テーブル名 イニシャル情報(明細) */
var ENDPOINT_NM_INITIAL_MEISAI = 'INITIAL_MEISAI';

/**
 * 発注書取込検索を行う。
 * JustDB検索
 * 仕様書メインワーク作成
 * 
 * @param {*} hinmokuCd 発注書コード
 */
function hacchushoTorikomi(hinmokuCd) {
    try {
        // JustDBの検索を行い検索した情報をDBに保存
        justDBTorikomi(hinmokuCd);
        // 保存したDBを元に仕様書メインワークを作成する
        siyosyoTorikomi(hinmokuCd);
    } catch (e) {
        TALON.addErrorMsg(e.message);
        TALON.setIsSuccess(false);
    }
}

/**
 * JustDBの検索を行い、検索した情報をDBに保存する。
 * API経由で発注書システムから情報を取得し、
 * DBにJson形式で保存する。
 * 
 * 1.案件情報取得
 * 2.見積情報取得（ヘッダレコード検索後、詳細検索をする２段階検索）
 * 3.発注情報取得
 * 4.イニシャル情報取得（ヘッダレコード検索後、詳細検索をする２段階検索）
 * 
 * @param {*} hinmokuCd 品目コード
 */
function justDBTorikomi(hinmokuCd) {
    // SIYO1000/SIYO1001の削除
    _deleteSiyo1000(hinmokuCd);
    _deleteSiyo1001(hinmokuCd);

    // 1.案件情報取得
    var anken = getJustDB(ENDPOINT_NM_ANKEN, hinmokuCd.substring(0, 7) + 'Z' + hinmokuCd.substring(8));
    if (anken != null && 0 < anken.length) {
        _insertSiyo1001(ENDPOINT_NM_ANKEN, hinmokuCd, anken[0]);
    } else {
        throw new Error("該当データがありません。 品目コード:" + hinmokuCd);
    }

    // 2.見積情報取得（ヘッダレコード検索後、詳細検索をする２段階検索）
    var mitsumori = getJustDB(ENDPOINT_NM_MITSUMORI, hinmokuCd);
    if (mitsumori != null && 0 < mitsumori.length) {
        var mitsumoriMeisai = getJustDBMeisai(ENDPOINT_NM_MITSUMORI_MEISAI, mitsumori[0].recordId);
        _insertSiyo1001(ENDPOINT_NM_MITSUMORI_MEISAI, hinmokuCd, mitsumoriMeisai[0]);
    }

    // 3.発注情報取得
    var hacchu = getJustDB(ENDPOINT_NM_HACCHU, hinmokuCd);
    if (hacchu != null && 0 < hacchu.length) {
        _insertSiyo1001(ENDPOINT_NM_HACCHU, hinmokuCd, hacchu[0]);
    }

    // // 4.イニシャル情報取得（ヘッダレコード検索後、詳細検索をする２段階検索）
    var initial = getJustDB(ENDPOINT_NM_INITIAL, hinmokuCd);
    if (initial != null && 0 < initial.length) {
        var initialMeisai = getJustDBMeisai(ENDPOINT_NM_INITIAL_MEISAI, initial[0].recordId);
        _insertSiyo1001(ENDPOINT_NM_INITIAL_MEISAI, hinmokuCd, initialMeisai[0]);
    }

    // SIYO1000の作成
    _insertSiyo1000(hinmokuCd);
}

/**
 * 品目コードをキーに、見積発注システムのJustDBからデータを取得する.
 * 
 * @param {*} endpointNm エンドポイント名
 * @param {*} hinmokuCd 品目コード
 * @returns JustDBの検索結果Json
 */
function getJustDB(endpointNm, hinmokuCd) {

    var TOKEN = getJustApiKey(); // ←旧来の固定値
    return getJustDBWithToken(endpointNm, hinmokuCd, TOKEN)
}

function getJustDBWithToken(endpointNm, hinmokuCd, token) {
    var mstApiRec = selectMstApiCallParam(endpointNm);

    var header = JSON.parse(injectTokenToHeader(mstApiRec['HEADER'], token));

    // APIを実行する
    return callApi(
        mstApiRec['METHOD'],                                // メソッド
        mstApiRec['URL'].replace('{hinmokuCd}', hinmokuCd), // URL
        "",                                                 // DATA
        header                    // ヘッダー
    );
}


/**
 * レコードIDをキーに、見積発注システムのJustDBから詳細データを取得する.
 * 品目コードの検索では、配下の明細DBが取得されないため、
 * 品目コードでした後、レコードIDで再度検索しなおす必要がある。
 * 
 * @param {*} endpointNm エンドポイント名
 * @param {*} recordId レコードID
 * @returns JustDBの検索結果Json
 */
function getJustDBMeisai(endpointNm, recordId) {

    var TOKEN = getJustApiKey(); // ←旧来の固定値
    return getJustDBMeisaiWithToken(endpointNm, recordId, TOKEN);
}

function getJustDBMeisaiWithToken(endpointNm, recordId, token) {
    var mstApiRec = selectMstApiCallParam(endpointNm);

    var method = mstApiRec['METHOD'];
    var url = mstApiRec['URL'].replace('{recordID}', recordId);
    var header = JSON.parse(injectTokenToHeader(mstApiRec['HEADER'], token));

    return callApi(method, url, "", header);
}

function getJustApiKey() {

    return decodeBase64(getEncryptedTokenFromTable());
}

/*
function getJustDBMeisai(endpointNm, recordId) {
    // API呼出パラメータマスタ取得
    var mstApiRec = selectMstApiCallParam(endpointNm);

    // APIを実行する
    return callApi(
        mstApiRec['METHOD'],                              // メソッド
        mstApiRec['URL'].replace('{recordID}', recordId), // URL
        "",                                               // DATA
        JSON.parse(mstApiRec['HEADER'])                   // ヘッダー
    );
}
*/

/**
 * ヘッダー文字列中の {token} を実際のAPIキーに置換する
 * 
 * @param {string} headerTemplate - 例: `{ "Authorization":"Bearer {token}" }`
 * @param {string} token - 実際のAPIキー文字列
 * @returns {string} 差し替え後のヘッダーJSON文字列
 */
function injectTokenToHeader(headerTemplate, token) {
    return headerTemplate.replace('{token}', token);
}


/**
 * API呼出パラメータマスタを取得する.
 * 
 * @param {*} endpointNm エンドポイント名
 * @returns API呼出パラメータマスタ（１件）
 */
function selectMstApiCallParam(endpointNm) {
    var sql = " SELECT * "
        + "   FROM MST_CALL_API_PARAM"
        + "  WHERE SYSTEM_NM = 'MHS'"
        + "    AND ENDPOINT_NM = '" + endpointNm + "'";
    var recList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (!recList || recList.length == 0) {
        var msg = "API呼出パラメータマスタにデータが存在しません。 エンドポイント名:" + endpointNm;
        throw new Error(msg);
    }
    return recList[0];
}

/**
 * 仕様書メインワークを品目コードキーで検索する。
 * 
 * @param {string} hinmokuCd 品目コード
 * @param {string} endpointNm エンドポイント名
 * @returns SIYO1001.RESPONSE
 */
function _selectSiyosyoMainWork(hinmokuCd, endpointNm) {
    var sql = " SELECT * "
        + "   FROM SIYOSYO_MAIN_WORK"
        + "  WHERE HINMOKU_CD = '" + hinmokuCd + "'";
    return TalonDbUtil.select(TALON.getDbConfig(), sql);
}

/**
 * 仕様書メインワークを品目コードキーで削除する。
 * 
 * @param {string} hinmokuCd 品目コード
 */
function _deleteSiyosyoMainWork(hinmokuCd) {
    var del_sql = "DELETE FROM SIYOSYO_MAIN_WORK WHERE HINMOKU_CD = '" + hinmokuCd + "' AND ( COPY_FLG IS NULL OR COPY_FLG = '0')"
    TalonDbUtil.delete(TALON.getDbConfig(), del_sql);
}

/**
 * 見積発注書検索情報（SIYO1000）を品目コードキーで削除する。
 * 
 * @param {string} hinmokuCd 品目コード
 */
function _deleteSiyo1000(hinmokuCd) {
    var del_sql = "DELETE FROM SIYO1000 WHERE HINMOKU_CD = '" + hinmokuCd + "'";
    var count = TalonDbUtil.delete(TALON.getDbConfig(), del_sql);
    if (0 < count) {
        TALON.getLogger().writeInfo('SIYO1000を削除しました。' + count + "件")
    }
}

/**
 * 見積発注書検索情報（SIYO1000）のINSERTを行う。
 * 
 * @param {*} hinmokuCd 品目コード
 */
function _insertSiyo1000(hinmokuCd) {
    var userData = TALON.getUserInfoMap();
    var sysdate = new java.util.Date();
    var map = new Array();
    map['HINMOKU_CD'] = hinmokuCd;
    map['KENSAKU_DATE'] = sysdate;
    map['CREATED_DATE'] = sysdate;
    map['CREATED_BY'] = userData['USER_ID'];
    map['CREATED_PRG_NM'] = userData['FUNC_ID'];
    map['UPDATED_DATE'] = sysdate;
    map['UPDATED_BY'] = userData['USER_ID'];
    map['UPDATED_PRG_NM'] = userData['FUNC_ID'];
    map['MODIFY_COUNT'] = 0;
    TalonDbUtil.insertByMap(TALON.getDbConfig(), 'SIYO1000', map, Object.keys(map));
}

/**
 * 見積発注書検索情報（SIYO1000）の更新を行う。
 * 
 * @param {*} sysdate システム日付
 * @param {*} hinmokuCd 品目コード
 * @returns 更新件数
 */
function _updateSIYO1000(sysdate, hinmokuCd) {
    var userData = TALON.getUserInfoMap();
    var itemColNameTbl = [
        'HINMOKU_CD',
        'TORIKOMI_DATE',
        'UPDATED_DATE',
        'UPDATED_BY',
        'UPDATED_PRG_NM'
    ];

    var itemDataList = new Array();
    itemDataList['HINMOKU_CD'] = hinmokuCd;
    itemDataList['TORIKOMI_DATE'] = sysdate;
    itemDataList['UPDATED_DATE'] = sysdate;
    itemDataList['UPDATED_BY'] = userData['USER_ID'];
    itemDataList['UPDATED_PRG_NM'] = userData['FUNC_ID'];

    //MAP WHERE句セット
    var whereList = new Array();
    whereList.push([null, '=', 'HINMOKU_CD']);

    // 更新処理を実行
    return TalonDbUtil.updateByMap(TALON.getDbConfig(), 'SIYO1000',
        itemDataList, itemColNameTbl, whereList);
}

/**
 * 見積発注書検索詳細情報（SIYO1001）品目コードキーで削除する。
 * 
 * @param {string} hinmokuCd 品目コード
 */
function _deleteSiyo1001(hinmokuCd) {
    var del_sql = "DELETE FROM SIYO1001 WHERE HINMOKU_CD = '" + hinmokuCd + "'";
    var count = TalonDbUtil.delete(TALON.getDbConfig(), del_sql);
    if (0 < count) {
        TALON.getLogger().writeInfo('SIYO1001を削除しました。' + count + "件")
    }
}


/**
 * 見積発注書検索詳細情報（SIYO1001）のINSERTを行う。
 * 
 * @param {*} endpointNm エンドポイント名
 * @param {*} hinmokuCd 品目コード
 * @param {*} json JSON文字列
 */
function _insertSiyo1001(endpointNm, hinmokuCd, jsonObj) {
    var userData = TALON.getUserInfoMap();
    var sysdate = new java.util.Date();
    var map = new Array();
    map['ENDPOINT_NM'] = endpointNm;
    map['HINMOKU_CD'] = hinmokuCd;
    map['RESPONSE'] = JSON.stringify(jsonObj);
    map['KENSAKU_DATE'] = sysdate;
    map['CREATED_DATE'] = sysdate;
    map['CREATED_BY'] = userData['USER_ID'];
    map['CREATED_PRG_NM'] = userData['FUNC_ID'];
    map['UPDATED_DATE'] = sysdate;
    map['UPDATED_BY'] = userData['USER_ID'];
    map['UPDATED_PRG_NM'] = userData['FUNC_ID'];
    map['MODIFY_COUNT'] = 0;
    TalonDbUtil.insertByMap(TALON.getDbConfig(), 'SIYO1001', map, Object.keys(map));
}

/**
 * 見積発注書検索詳細情報（SIYO1001）の更新を行う。
 * 
 * @param {*} sysdate システム日付
 * @param {*} hinmokuCd 品目コード
 * @returns 更新件数
 */
function _updateSIYO1001(sysdate, hinmokuCd) {
    var userData = TALON.getUserInfoMap();

    var itemColNameTbl = [
        'HINMOKU_CD',
        'TORIKOMI_DATE',
        'UPDATED_DATE',
        'UPDATED_BY',
        'UPDATED_PRG_NM'
    ];

    var itemDataList = new Array();
    itemDataList['HINMOKU_CD'] = hinmokuCd;
    itemDataList['TORIKOMI_DATE'] = sysdate;
    itemDataList['UPDATED_DATE'] = sysdate;
    itemDataList['UPDATED_BY'] = userData['USER_ID'];
    itemDataList['UPDATED_PRG_NM'] = userData['FUNC_ID'];

    //MAP WHERE句セット
    var whereList = new Array();
    whereList.push([null, '=', 'HINMOKU_CD']);

    // 更新処理を実行
    return TalonDbUtil.updateByMap(TALON.getDbConfig(), 'SIYO1001',
        itemDataList, itemColNameTbl, whereList);
}

/**
 * 見積発注書システムの検索結果(SIYO1001)から検索結果Jsonを取得する。
 * 
 * @param {string} hinmokuCd 品目コード
 * @param {string} endpointNm エンドポイント名
 * @returns SIYO1001.RESPONSE
 */
function selectSIYO1001(hinmokuCd, endpointNm) {
    var sql = " SELECT * "
        + "   FROM SIYO1001"
        + "  WHERE HINMOKU_CD = '" + hinmokuCd + "'"
        + "    AND ENDPOINT_NM = '" + endpointNm + "'";
    var recList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    if (recList == null || recList.length == 0) {
        TALON.getLogger().writeInfo('データなし 品目コード:' + hinmokuCd + " エンドポイント名:" + endpointNm);
        return "{}";
    }
    return recList[0]["RESPONSE"];
}

/**
 * 指定URLに対してJSONデータをPOST送信する（トークン・APIキー・タイムアウト・リトライ対応）
 * 
 * @param {string} method - メソッド（GET/POST）
 * @param {string} url - リクエスト先URL
 * @param {Object} data - 送信するデータオブジェクト（自動でJSON化）
 * @param {Object} [headers] - 追加ヘッダー（例：Authorizationやx-api-key）
 * @param {number} [connectTimeoutMs=5000] - 接続タイムアウト（ミリ秒）
 * @param {number} [readTimeoutMs=5000] - 読み取りタイムアウト（ミリ秒）
 * @param {number} [retryCount=3] - リトライ回数（デフォルト3回）
 * @returns {string} レスポンスボディ（正常時）
 * @throws {Error} 通信失敗またはHTTPエラー時（エラーレスポンス付き）
 */
function callApi(method, url, data, headers, connectTimeoutMs, readTimeoutMs, retryCount) {

    TALON.getLogger().writeInfo('[method]' + method);
    TALON.getLogger().writeInfo('[url]' + url);
    TALON.getLogger().writeInfo('[data]' + data);
    TALON.getLogger().writeInfo('[headers]' + headers);
    TALON.getLogger().writeInfo('[connectTimeoutMs]' + connectTimeoutMs);
    TALON.getLogger().writeInfo('[readTimeoutMs]' + readTimeoutMs);
    TALON.getLogger().writeInfo('[retryCount]' + retryCount);

    var URL = Java.type("java.net.URL");
    var HttpURLConnection = Java.type("java.net.HttpURLConnection");
    var OutputStreamWriter = Java.type("java.io.OutputStreamWriter");
    var BufferedReader = Java.type("java.io.BufferedReader");
    var InputStreamReader = Java.type("java.io.InputStreamReader");
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

    connectTimeoutMs = connectTimeoutMs || 5000;
    readTimeoutMs = readTimeoutMs || 5000;
    retryCount = (retryCount !== undefined) ? retryCount : 3;

    var lastError = null;

    for (var attempt = 0; attempt <= retryCount; attempt++) {
        try {
            var connection = new URL(url).openConnection();
            connection.setRequestMethod(method);
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setConnectTimeout(connectTimeoutMs);
            connection.setReadTimeout(readTimeoutMs);


            if (headers) {
                for (var key in headers) {
                    connection.setRequestProperty(key, headers[key]);
                }
            }

            TALON.getLogger().writeInfo('header:' + connection.getRequestProperties());

            // POST/PUT かつ data が存在する場合のみ出力ストリームへ書き込み
            if ((method === "POST" || method === "PUT") && data != null) {
                connection.setDoOutput(true);
                var writer = new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8);
                writer.write(JSON.stringify(data));
                writer.flush();
                writer.close();
            }

            var responseCode = connection.getResponseCode();

            // 正常応答（200）の場合
            if (responseCode === 200) {
                var reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
                var response = "";
                var line;
                while ((line = reader.readLine()) !== null) {
                    response += line;
                }
                reader.close();
                return JSON.parse(response);
            } else {
                // エラー時のレスポンスを読み取り
                var errorResponse = "";
                var errorStream = connection.getErrorStream();
                if (errorStream != null) {
                    var errorReader = new BufferedReader(new InputStreamReader(errorStream, StandardCharsets.UTF_8));
                    var line;
                    while ((line = errorReader.readLine()) !== null) {
                        errorResponse += line;
                    }
                    errorReader.close();
                }
                throw new Error("HTTP error: " + responseCode + (errorResponse ? " - " + errorResponse : ""));
            }

        } catch (e) {
            lastError = e;
            if (attempt < retryCount) {
                TALON.getLogger().writeDebug("Attempt " + (attempt + 1) + " failed: " + e.message + " → retrying...");
            } else {
                throw lastError;
            }
        }
    }
}

/**
 * 仕様書メインワークに取込を行う。
 * 
 * @param {*} hinmokuCd 品目コード
 */
function siyosyoTorikomi(hinmokuCd) {

    var sysdate = new java.util.Date();

    // 品目コードをキーに事前に取得した検索結果を取得
    var ankenObj = JSON.parse(selectSIYO1001(hinmokuCd, ENDPOINT_NM_ANKEN)); // 案件情報
    var mitsumoriObj = JSON.parse(selectSIYO1001(hinmokuCd, ENDPOINT_NM_MITSUMORI_MEISAI)); // 見積情報(明細)
    var hacchuJsonObj = JSON.parse(selectSIYO1001(hinmokuCd, ENDPOINT_NM_HACCHU)); // 発注情報
    var initialJsonObj = JSON.parse(selectSIYO1001(hinmokuCd, ENDPOINT_NM_INITIAL_MEISAI)); // イニシャル情報(明細)

    // 仕様書メインワークの作成
    var siyosyoMap = _insertSiyosyoMainWork(sysdate, hinmokuCd, ankenObj, mitsumoriObj, hacchuJsonObj, initialJsonObj);

    // 取込日時を入れる
    _updateSIYO1000(sysdate, hinmokuCd); // SIYO1000
    _updateSIYO1001(sysdate, hinmokuCd); // SIYO1001

    // 工程順を登録する
    var nonCreateList = getNonCreateKouteiList(ankenObj, mitsumoriObj, hacchuJsonObj, initialJsonObj);
    setInitKoutei(siyosyoMap['SIYOSYO_SEQ'], siyosyoMap['SOUSU'], siyosyoMap['HYOMEN_SYORI_CD'], nonCreateList, "0");
}


/**
 * JustDBの検索結果によって、作成が不要な工程を判定する。
 * 
 * @param {*} ankenObj 案件情報
 * @param {*} mitsumoriObj 見積情報
 * @param {*} hacchuJsonObj 発注情報
 * @param {*} initialJsonObj イニシャルじ情報
 * @returns 作成が不要な工程リスト
 */
function getNonCreateKouteiList(ankenObj, mitsumoriObj, hacchuJsonObj, initialJsonObj) {
    var nonCreateList = [];
    // 見積.field_1661157731_23(穴埋め) の値がなしの場合に工程順から140、141を自動削除
    if (extractBeforeComma(mitsumoriObj.record.field_1661157731_23) == 'なし') {
        nonCreateList.push('140');
        nonCreateList.push('141');
    }
    // 見積.field_1661157731_22(TDR)の値がなしの場合に工程順から250を自動削除
    if (extractBeforeComma(mitsumoriObj.record.field_1661157731_22) == 'なし') {
        nonCreateList.push('250');
    }
    // 見積.field_1673848989(シルクA)の値がなしかつ見積.field_1673849032(シルクB)の値がなしの場合に工程順からシルク工程を自動削除
    if (extractBeforeComma(mitsumoriObj.record.field_1673848989) == '000' &&
        extractBeforeComma(mitsumoriObj.record.field_1673849032) == '000') {
        nonCreateList.push('240');
    }
    // 見積.field_1673848759(レジストA)の値がなしかつ見積.field_1673848861(レジストB)の値がなしの場合に工程順からレジスト工程を自動削除
    if (extractBeforeComma(mitsumoriObj.record.field_1673848759) == '000' &&
        extractBeforeComma(mitsumoriObj.record.field_1673848861) == '000') {
        nonCreateList.push('230');
    }
    if (!nonCreateList || nonCreateList.length == 0) {
        return [];
    }

    // 画面例工程コードから工程コードを取得する
    var sql = " SELECT DISTINCT KOUTEI_CD " +
        " FROM KOUTEI_MEISAI_MST " +
        "WHERE GAMEN_REI_KOUTEI_CD in (";
    var sep = "";
    for (var i = 0; i < nonCreateList.length; i++) {
        sql = sql + sep + "'" + nonCreateList[i] + "'";
        sep = ",";
    }
    sql = sql + ")";
    var recList = TalonDbUtil.select(TALON.getDbConfig(), sql);
    var kouteiCdList = [];
    for (var i = 0; i < recList.length; i++) {
        kouteiCdList.push(recList[i]['KOUTEI_CD']);
    }
    return kouteiCdList;
}

/**
 * 仕様書メインワークテーブルを作成する。
 * 
 * @param {Date} sysdate システム日時
 * @param {*} ankenObj 案件情報検索結果
 * @param {*} mitsumoriObj 見積明細検索結果
 * @param {*} hacchuJsonObj 発注情報検索結果
 * @param {*} initialJsonObj イニシャル情報検索結果
 */
function _insertSiyosyoMainWork(
    sysdate, hinmokuCd,
    ankenObj, mitsumoriObj, hacchuJsonObj, initialJsonObj) {

    if (ankenObj.record) {
        // 得意先名
        TALON.getLogger().writeInfo(ankenObj.record.field_1661230909_1);
        // 得意先CD
        TALON.getLogger().writeInfo(ankenObj.record.field_1674115320);
    }

    if (mitsumoriObj.record) {
        // 品名
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1690858981);
        // 表面処理
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661158203);
        // UL
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_14);
        // インピーダンス測定
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_22);
        // 穴埋め
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_23);
        // 銅箔厚/内層
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_24);
        // 銅箔厚/外層
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_25);
        // 面付数
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731);
        // 面付管理(Pcs管理orSheet管理)
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1663130350);
        // ランド径
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_17);
        // 最小仕上径
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_18);
        // 層数
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_7);
        // 無電解金【Ni】
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1673849341);
        // 電解金【Ni】
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1673849408);
        // 電解金【Au】
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1673849424);
        // ワークサイズ
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1685350584);
        // 取り数
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1692332127);
        // 品目コード(後)
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1692668521);
        // 品目コード(前)
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1690859781);
        // 基材グレード
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1661157731_13);
        // 製品サイズ(X)
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1688887352);
        // 製品サイズ(Y)
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1688888767);
        // 面付数
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1691634268);
        // 仕上げ厚
        TALON.getLogger().writeInfo(mitsumoriObj.record.field_1690751537);

    }

    if (hacchuJsonObj.record) {
        // 基材メーカー
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1714012704);
        // 板厚交差 プラス
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1673848281);
        // 板厚交差 マイナス
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1713766844_72);
        // 発注に関する備考
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1714013554);
        // 専用伝票
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1714013554);
        // 運送便
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1714012314);

        // 専用伝票
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1714012017);
        // 運送便
        TALON.getLogger().writeInfo(hacchuJsonObj.record.field_1713766844_62);

    }

    var userData = TALON.getUserInfoMap();
    var user_id = userData['USER_ID']
    var sysdate = new java.util.Date();

    var map = new Array();

    // 仕様書メインワークがあれば削除し、仕様書NOを引き継いでInsert
    var recList = _selectSiyosyoMainWork(hinmokuCd);
    var siyosyoNo = null;
    if (recList && 0 < recList.length) {
        siyosyoNo = recList[0]['SIYOSYO_NO'];
        TALON.getLogger().writeInfo("仕様書メインワークの既存データ削除し引継ぎ" + siyosyoNo);
        _deleteSiyosyoMainWork(hinmokuCd);
    } else {
        //siyosyoNo = TALON.getNumberingData('SIYOSYO_NO', 1)[0];
        siyosyoNo = getSiyoshoNo();
    }

    if (
        initialJsonObj &&
        initialJsonObj.record &&
        Array.isArray(initialJsonObj.record.field_1738141850)
    ) {
        var list = initialJsonObj.record.field_1738141850;

        var sql = " DELETE FROM SIYO5001 WHERE SIYOSYO_NO = '" + siyosyoNo + "'"
        TalonDbUtil.delete(TALON.getDbConfig(), sql);
        for (var i = 0; i < list.length; i++) {
            var rec = list[i].record;

            var qty = parseInt(rec.field_1738142279, 10) || 0;
            var unitPrice = parseInt(rec.field_1738142205, 10) || 0;
            var totalPrice = parseInt(rec.field_1738143318, 10);

            if (isNaN(totalPrice)) {
                totalPrice = qty * unitPrice;
            }

            var detailMap = {
                SIYOSYO_NO: siyosyoNo,
                HIYO_ID: rec.field_1738142131,
                HIYO_NM: rec.field_1738142172,
                TANI: rec.field_1738142205,
                QTY: qty,
                UNIT_PRICE: unitPrice,
                TOTAL_PRICE: totalPrice,
                CREATED_DATE: sysdate,
                CREATED_BY: user_id,
                CREATED_PRG_NM: "SIYO初期登録",
                UPDATED_DATE: sysdate,
                UPDATED_BY: user_id,
                UPDATED_PRG_NM: "SIYO初期登録",
                DEL_FLG: "0",
                MODIFY_COUNT: 0
            };


            TalonDbUtil.insertByMap(TALON.getDbConfig(), 'SIYO5001', detailMap, Object.keys(detailMap));
        }
    } else {
        TALON.getLogger().writeInfo("イニシャル費用データ（initialJsonObj.record.field_1738141850）は存在しないか無効です。");
    }

    putMapValue(map, 'SIYOSYO_SEQ', getSiyoNum("1"));
    putMapValue(map, 'SIYOSYO_NO', siyosyoNo);
    putMapValue(map, 'HINMOKU_CD', hinmokuCd.toUpperCase());
    putMapValue(map, 'HIN_NM', mitsumoriObj.record.field_1690858981);
    putMapValue(map, 'WORK_SIZE', convertWorkSizeToCode(mitsumoriObj.record.field_1685350584));
    putMapValue(map, 'SOUYUKOU_KIKAN', '12');
    putMapValue(map, 'HYOMEN_SYORI_CD', convertHyomenToCode(getJustKomokuCode(mitsumoriObj.record, "field_1661158203")));
    putMapValue(map, 'USER_NM', toHankakuKana(hacchuJsonObj.record.field_1713766844_17));
    putMapValue(map, 'SOUSU', extractNumberBeforeComma(mitsumoriObj.record.field_1661157731_7));
    putMapValue(map, 'MENTUKESU1', mitsumoriObj.record.field_1661157731);
    putMapValue(map, 'MENTUKESU2', mitsumoriObj.record.field_1691634268);
    putMapValue(map, 'ULNO', convertULNOToCode(mitsumoriObj.record.field_1661157731_14));
    putMapValue(map, 'TORISU', mitsumoriObj.record.field_1692332127);
    putMapValue(map, 'SEIHIN_SIZE_TATE', mitsumoriObj.record.field_1688887352);
    putMapValue(map, 'SEIHIN_SIZE_TATE_P', 0);
    putMapValue(map, 'SEIHIN_SIZE_TATE_M', 0);
    putMapValue(map, 'SEIHIN_SIZE_YOKO', mitsumoriObj.record.field_1688888767);
    putMapValue(map, 'SEIHIN_SIZE_YOKO_P', 0);
    putMapValue(map, 'SEIHIN_SIZE_YOKO_M', 0);
    var gaisoAry = mitsumoriObj.record.field_1661157731_25;
    var naisouAry = mitsumoriObj.record.field_1661157731_24;
    var gaisoVal = (Array.isArray(gaisoAry) && gaisoAry.length > 0) ? convertNaisoGaiso(gaisoAry[0]) : null;
    var naisouVal = (Array.isArray(naisouAry) && naisouAry.length > 0) ? convertNaisoGaiso(naisouAry[0]) : null;
    putMapValue(map, 'GAISOU', gaisoVal);
    putMapValue(map, 'NAISOU1', naisouVal);
    putMapValue(map, 'SIAGE_ATU', mitsumoriObj.record.field_1690751537);
    putMapValue(map, 'SIAGE_ATU_P', hacchuJsonObj.record.field_1673848281);
    putMapValue(map, 'SIAGE_ATU_M', hacchuJsonObj.record.field_1713766844_72);
    putMapValue(map, 'KIZAI_MAKER', convertKizaiMakerToCode(extractNumberBeforeColon(hacchuJsonObj.record.field_1714012704)));
    putMapValue(map, 'KIZAI_GRADE', convertKizaiGradeToCode(mitsumoriObj.record.field_1661157731_13[0]));
    putMapValue(map, 'BIKO', hacchuJsonObj.record.field_1714013554);
    putMapValue(map, 'COPY_FLG', "0");
    putMapValue(map, 'KOKIBANSU', "0");
    putMapValue(map, 'TRHK_CD', ankenObj.record.field_1674115320);
    putMapValue(map, 'KIN_TANSHI', getJustKomokuCode(mitsumoriObj.record, "field_1689693307") === "なし" ? "0" : "1"); // 0 なし 1 あり

    map['TOUROKU_ID'] = user_id;
    map['TOUROKU_DT'] = sysdate;
    map['KOUSIN_ID'] = user_id;
    map['KOUSIN_DT'] = sysdate;

    TalonDbUtil.insertByMap(TALON.getDbConfig(), 'SIYOSYO_MAIN_WORK', map, Object.keys(map));


    // 補足
    // 以下は編集時に修正を行う運用
    // 仕様書No
    // map['SIYOSYO_NO'] = '';
    // 仕様書Ver
    // map['SIYOSYO_VER'] = '';
    // 工場No
    // map['KOJO_NO'] = '';
    // 利益センターCd関連情報
    // map['RIEKI_CENTER_CD'] = '';
    // map['HIN_KAISOU_CD'] = '';
    // map['RIEKI_CENTER_SEQ'] = '';
    // 製品コード
    // map['SEIHIN_CD'] = '';
    // 穴明数
    // map['SOU_HIT'] = '';
    // ミニバイア
    // map['MINI_VIA'] = '';
    // 内外ライン幅
    // map['NAISOU_LINE_HABA'] = '';
    // map['GAISOU_LINE_HABA'] = '';
    // map['NAISOU2'] = '';

    // ライン間隔
    // map['LINE_KANKAKU'] = '';
    // ラインランド
    // map['LINE_RANDO'] = '';
    // ランド径
    // map['RANDO_KEI'] = '';

    // 最小仕上径
    // map['MIN_SIAGE_KEI'] = '';

    // 層構成番号
    // map['SOUKOUSEI_NO'] = '';

    // 検査規格
    // map['KENSA_KIKAKU'] = '';

    // IVH関連フラグ
    // 発注時には判断不可
    // map['IVH_FLG'] = '';
    // map['IVH_NAISO_FLG'] = '';
    // map['IVH_OYA_SIYO_SEQ'] = '';
    // map['IVH_OYA_SIYO_NO'] = '';
    // map['IVH_OYA_HINMOKU_CD'] = '';

    return map;
}

/**
 * map に安全に値をセットするユーティリティ関数
 * 値が null/undefined でも空文字に変換してセットする
 *
 * @param {Object} map - 対象のマップオブジェクト
 * @param {string} key - 設定するキー名
 * @param {*} value - 設定する値（任意型）
 */
function putMapValue(map, key, value) {
    if (value === null || value === undefined) {
        map[key] = "";
    } else {
        map[key] = String(value);
    }
}


/**
 * 内層/外層の変換を行う
 *
 * @param {string} name - カンマ区切りの銅箔名
 * @returns {string|null} - 変換後の名称（DSP2）、存在しない場合は null
 */
function convertNaisoGaiso(name) {
    // 空・null チェック
    if (!name || name.trim() === '') return null;

    // 数値文字列（整数）ならそのまま返す
    if (/^\d+$/.test(name)) {
        return name;
    }

    // 変換テーブルから取得
    var map = selectOne(TALON.getDbConfig(), "TLN_M_HANYO_CODE", null, {
        "KEY_CODE": name,
        "SIKIBETU_CODE": "SIYOH007"
    });

    return map ? map['DSP2'] : null;
}

function isBlank(str) {
    return str == null || /^\s*$/.test(str);
}


/**
 * 汎用コードマスタから作業サイズ名称に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertWorkSizeToCode(name) {


    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP5": extractBeforeComma(name),                  // 表示名称
        "SIKIBETU_CODE": "WORK_SIZE"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['KEY_CODE'] : null;
}

/**
 * 汎用コードマスタから表面処理に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertHyomenToCode(name) {
    TALON.getLogger().writeInfo("convertHyomenToCode: " + name);

    var name2 = convertHyomenToCode2(name);

    if (name2) name = name2;

    if (name == "フラックス（）") name = "ﾌﾗｯｸｽ";

    if (name == "鉛フリー半田レベラー") name = "鉛フリーレベラー";

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP3": name,                  // 表示名称
        "SIKIBETU_CODE": "HYOMEN_SYORI"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap, null);

    if (!map) {
        var tableName2 = "TLN_M_HANYO_CODE";
        var whereMap2 = {
            "DSP1": name,                  // 表示名称
            "SIKIBETU_CODE": "HYOMEN_SYORI_CD"   // ワークサイズを識別するコード
        };
        map = selectOne(TALON.getDbConfig(), tableName2, null, whereMap2, null);
    }

    return map ? map['KEY_CODE'] : null;
}

/**
 * 汎用コードマスタから表面処理に対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertHyomenToCode2(name) {
    TALON.getLogger().writeInfo("convertHyomenToCode: " + name);

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP1": name,                  // 表示名称
        "SIKIBETU_CODE": "SIYO_HYOMEN_HENKAN"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap, null);

    return map ? map['DPS2'] : null;
}


/**
 * 汎用コードマスタからULNOに対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertULNOToCode(name) {

    TALON.getLogger().writeInfo("convertULNOToCode: " + name);
    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP1": extractBeforeComma(name),                  // 表示名称
        "SIKIBETU_CODE": "UL_NO"
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['KEY_CODE'] : null;
}


/**
 * 汎用コードマスタから基材グレードに対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertKizaiGradeToCode(name) {

    var name1 = convertKizaiGradeToCode2(name);

    if (name1) name = name1
    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP2": name,                  // 表示名称　
        "SIKIBETU_CODE": "GRADE"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    if (!map) {
        var tableName2 = "TLN_M_HANYO_CODE";
        var whereMap2 = {
            "DSP1": name,                  // 表示名称
            "SIKIBETU_CODE": "GRADE"   // ワークサイズを識別するコード
        };
        map = selectOne(TALON.getDbConfig(), tableName2, null, whereMap2, null);
    }

    return map ? map['KEY_CODE'] : null;
}

/**
 * 汎用コードマスタから基材グレードに対応するコードを取得します。
 *
 * @param {string} name - 作業サイズの名称（例：S、M、Lなど）
 * @returns {string|null} 対応するコード（KEY_CODE）または null
 */
function convertKizaiGradeToCode2(name) {

    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP1": name,                  // 表示名称　
        "SIKIBETU_CODE": "SIYO_GRADE_HENKAN"   // ワークサイズを識別するコード
    };
    var map = selectOne(TALON.getDbConfig(), tableName, null, whereMap);

    return map ? map['DSP2'] : null;
}

/**
 * 汎用コードマスタから基材グレードに対応するコードを取得します。
 *
 * @param {string} name - 表示名称（例：S, M, Lなど。カンマ区切りの場合は先頭部分を使用）
 * @returns {string|null} KEY_CODE（該当がなければ null）
 */
function convertKizaiMakerToCode(name) {
    var tableName = "TLN_M_HANYO_CODE";
    var whereMap = {
        "DSP2": name,
        "SIKIBETU_CODE": "KIZAI_MAKER"
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


/**
 * カンマ（, または 全角，）の前の値を数値に変換して返す
 *
 * @param {*} value - 入力値（例: "2,2層", "３，三層"）
 * @returns {number|null} 抽出できれば数値、失敗したら null
 */
function extractNumberBeforeComma(value) {
    if (value == null) return null;

    var str = String(value);
    str = str.replace('，', ','); // 全角カンマを半角に統一

    var parts = str.split(',');
    if (parts.length === 0 || parts[0].trim() === "") return null;

    var num = parseInt(parts[0].trim(), 10);
    return isNaN(num) ? null : num;
}

/**
 * コロン（: または 全角：）の前の値を数値に変換して返す
 *
 * @param {*} value - 入力値（例: "6:日立,日立", "３：テスト"）
 * @returns {number|null} 抽出できれば数値、失敗したら null
 */
function extractNumberBeforeColon(value) {
    if (value == null) return null;

    var str = String(value);
    str = str.replace('：', ':'); // 全角コロンを半角に統一

    var parts = str.split(':');
    if (parts.length === 0 || parts[0].trim() === "") return null;

    var num = parseInt(parts[0].trim(), 10);
    return isNaN(num) ? null : num;
}


/**
 * コロン（:）の前の文字列を返す
 *
 * @param {string} value - 対象文字列（例: "6:日立,日立"）
 * @returns {string} コロンの前の部分（例: "6"）
 */
function extractBeforeColon(value) {
    if (typeof value !== 'string') return '';
    var parts = value.split(':');
    return parts.length > 0 ? parts[0] : null;
}

/**
 * 全角カタカナを半角カタカナに変換します（ES5対応）。
 * @param {string} str - 変換対象の文字列
 * @returns {string} - 半角カタカナに変換された文字列
 */
function toHankakuKana(str) {
    var kanaMap = {
        'ア': 'ｱ', 'イ': 'ｲ', 'ウ': 'ｳ', 'エ': 'ｴ', 'オ': 'ｵ',
        'カ': 'ｶ', 'キ': 'ｷ', 'ク': 'ｸ', 'ケ': 'ｹ', 'コ': 'ｺ',
        'サ': 'ｻ', 'シ': 'ｼ', 'ス': 'ｽ', 'セ': 'ｾ', 'ソ': 'ｿ',
        'タ': 'ﾀ', 'チ': 'ﾁ', 'ツ': 'ﾂ', 'テ': 'ﾃ', 'ト': 'ﾄ',
        'ナ': 'ﾅ', 'ニ': 'ﾆ', 'ヌ': 'ﾇ', 'ネ': 'ﾈ', 'ノ': 'ﾉ',
        'ハ': 'ﾊ', 'ヒ': 'ﾋ', 'フ': 'ﾌ', 'ヘ': 'ﾍ', 'ホ': 'ﾎ',
        'マ': 'ﾏ', 'ミ': 'ﾐ', 'ム': 'ﾑ', 'メ': 'ﾒ', 'モ': 'ﾓ',
        'ヤ': 'ﾔ', 'ユ': 'ﾕ', 'ヨ': 'ﾖ',
        'ラ': 'ﾗ', 'リ': 'ﾘ', 'ル': 'ﾙ', 'レ': 'ﾚ', 'ロ': 'ﾛ',
        'ワ': 'ﾜ', 'ヲ': 'ｦ', 'ン': 'ﾝ',
        'ガ': 'ｶﾞ', 'ギ': 'ｷﾞ', 'グ': 'ｸﾞ', 'ゲ': 'ｹﾞ', 'ゴ': 'ｺﾞ',
        'ザ': 'ｻﾞ', 'ジ': 'ｼﾞ', 'ズ': 'ｽﾞ', 'ゼ': 'ｾﾞ', 'ゾ': 'ｿﾞ',
        'ダ': 'ﾀﾞ', 'ヂ': 'ﾁﾞ', 'ヅ': 'ﾂﾞ', 'デ': 'ﾃﾞ', 'ド': 'ﾄﾞ',
        'バ': 'ﾊﾞ', 'ビ': 'ﾋﾞ', 'ブ': 'ﾌﾞ', 'ベ': 'ﾍﾞ', 'ボ': 'ﾎﾞ',
        'パ': 'ﾊﾟ', 'ピ': 'ﾋﾟ', 'プ': 'ﾌﾟ', 'ペ': 'ﾍﾟ', 'ポ': 'ﾎﾟ',
        'ァ': 'ｧ', 'ィ': 'ｨ', 'ゥ': 'ｩ', 'ェ': 'ｪ', 'ォ': 'ｫ',
        'ッ': 'ｯ', 'ャ': 'ｬ', 'ュ': 'ｭ', 'ョ': 'ｮ', 'ー': 'ｰ', '「': '｢', '」': '｣', '、': '､', '。': '｡'
    };

    return str.replace(/[\u30A1-\u30F6\u3001\u3002\u300C\u300Dー]/g, function (match) {
        return kanaMap[match] || match;
    });
}