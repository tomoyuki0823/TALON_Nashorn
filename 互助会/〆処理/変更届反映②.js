setHenkoList();

// ========== Orchestrator ==========
function setHenkoList() {
  try {
    var db           = TALON.getDbConfig();
    var conditionMap = TALON.getConditionData() || {};
    var lineDataMap  = TALON.getTargetData()   || {};

    var input = validateInputs(conditionMap);
    if (!input.ok) return; // エラーは内部でaddErrorMsg済み

    var where = { SHORI_TUKI: input.SHORI_TUKI };
    var list  = selectList(db, "TK_HENKO2", null, where, null) || [];

    for (var i = 0; i < list.length; i++) {
      var henkoMap = list[i] || {};

      // 1) 空白値を除去（null/undefined/空文字/空白のみを除外）
      var filtered = pickNonBlank(henkoMap);

      // 2) 主キー TK_NO の存在チェック（※空ならスキップ）
      var tkNo = asStr(henkoMap["TK_NO"]);
      if (!tkNo) {
        // 仕様上、TK_NOで一意特定するため、無い行は更新しない
        // 必要なら addInfoMsg 等に変更
        TALON.addErrorMsg("TK_HENKO2 の行で TK_NO が空のため更新スキップしました。");
        continue;
      }
      // 主キーは WHERE に必要なので filtered にも保持しておく（消していないはずだが明示で上書き）
      filtered["TK_NO"] = tkNo;

      // 3) 値が何も無ければスキップ（TK_NOのみ=実質更新無しの防止）
      if (Object.keys(filtered).length <= 1) {
        // TK_NO しか残っていない（他が空）→更新の意味が薄いのでスキップ
        continue;
      }

      // 4) 更新実行：キーは TK_NO 固定
      updateByMapEx(db, "TK_MEMBER", filtered, ["TK_NO"], false);
    }

    // 5) 月締め更新（DVSがあればDVS+月、無ければ月全体）
    updateCloseStatus(db, input.SHORI_TUKI, lineDataMap);

  } catch (e) {
    TALON.addErrorMsg(asMessage(e));
  }
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

// ========== Domain Ops ==========
function updateCloseStatus(db, SHORI_TUKI, lineDataMap) {

  var updateMap = {
    SIME_STATUS: "02",
    SHORI_TUKI: SHORI_TUKI
  };

  updateByMapEx(db, "TK_SIME_01", updateMap,  ["SHORI_TUKI"], false);
}

/**
 * JavaのMapを受け取り、空白値(null/undefined/空文字/空白のみ)を除去した
 * JavaScriptオブジェクトを返す
 */
function pickNonBlank(javaMap) {
  var out = {};
  var it = javaMap.keySet().iterator();
  while (it.hasNext()) {
    var k = it.next();
    var v = javaMap.get(k);
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      out[k] = v;
    }
  }
  return out;
}


function asStr(v) {
  return (v === null || v === undefined) ? "" : String(v).trim();
}

function asMessage(e) {
  return (e && e.message) ? e.message : String(e);
}
