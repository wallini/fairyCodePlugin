var Depends = /** @class */ (function () {
  function Depends() {
    this.defaultExport = "";
    this.exports = [];
  }
  return Depends;
})();
function getImportsArr(codeStr) {
  var m = codeStr.match(
    /\/\* #region  uiImports \*\/([\s\S]*)\/\* #endregion uiImports \*\//
  );
  var arrs = [];
  if (m && m.length) {
    arrs = m[1]
      .split(";")
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return item.length > 6;
      });
  }
  return arrs;
}
// 获取{ xx,x,xx} 中间的类型
function getImportDepends(importStr) {
  var midStr = importStr.match(/import ([\s\S]*) from/)[1];
  var defaultExport = "";
  var exportsStr = "";
  var m = midStr.match(/{([\s\S]*)}/);
  var arr = [];
  if (m && m.length == 2) {
    exportsStr = m[1];
    arr = m[1]
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .sort(function (a, b) {
        return a - b;
      });
  }
  if (!exportsStr) {
    defaultExport = midStr.trim();
  } else {
    defaultExport = midStr
      .replace("{" + exportsStr + "}", "")
      .replace(",", "")
      .trim();
  }
  return {
    defaultExport: defaultExport,
    exports: arr,
  };
}
function getImportFrom(importStr) {
  var m = importStr.match(/from ([\s\S]*)$/);
  if (m && m.length == 2) {
    return m[1];
  }
  return "";
}
function getCodeBody(codeStr) {
  return codeStr.replace(
    /\/\* #region  uiImports \*\/([\s\S]*)\/\* #endregion uiImports \*\//,
    ""
  );
}
function checkCodeBodyHasType(body, classType) {
  var reg = new RegExp(" " + classType, "g");
  if (body.match(reg)) {
    return true;
  }
  if (
    body.match("(" + classType + ")") ||
    body.match(classType + ".") ||
    body.match(classType + "\\[") ||
    body.match(": " + classType)
  ) {
    return true;
  }
  return false;
}
function genAdaptImportStr(newCodeStr, oldCodeStr) {
  if (oldCodeStr.indexOf("/* #region  uiImports */") == -1) {
    return newCodeStr;
  }
  var retArr = [];
  var newArr = getImportsArr(newCodeStr);
  var oldArr = getImportsArr(oldCodeStr);
  var newMap = {};
  var oldMap = {};
  var codeBody = getCodeBody(oldCodeStr);
  newArr.forEach(function (item) {
    var file = getImportFrom(item);
    newMap[file] = item;
  });
  oldArr.forEach(function (item) {
    var file = getImportFrom(item);
    oldMap[file] = item;
  });
  var _loop_1 = function (key) {
    var newImport = newMap[key];
    if (oldMap[key]) {
      var oldImport = oldMap[key];
      delete oldMap[key];
      var depends_1 = getImportDepends(newImport);
      var oldDepends = getImportDepends(oldImport);
      if (
        depends_1.defaultExport == oldDepends.defaultExport &&
        depends_1.exports.join() == oldDepends.exports.join()
      ) {
        retArr.push(newImport);
      } else {
        var changed_1 = false;
        var difExports = oldDepends.exports.filter(function (key) {
          return !depends_1.exports.includes(key);
        });
        difExports.forEach(function (key) {
          if (checkCodeBodyHasType(codeBody, key)) {
            depends_1.exports.push(key);
            changed_1 = true;
          }
        });
        if (changed_1) {
          var importStrNew = "";
          if (depends_1.defaultExport && depends_1.exports.length) {
            importStrNew =
              "import " +
              depends_1.defaultExport +
              ", { " +
              depends_1.exports.join() +
              " } from " +
              key;
          } else if (depends_1.defaultExport && !depends_1.exports.length) {
            importStrNew = "import " + depends_1.defaultExport + " from " + key;
          } else if (!depends_1.defaultExport && depends_1.exports.length) {
            importStrNew =
              "import { " + depends_1.exports.join(", ") + " } from " + key;
          }
          retArr.push(importStrNew);
        } else {
          retArr.push(newImport);
        }
      }
    } else {
      retArr.push(newImport);
    }
  };
  for (var key in newMap) {
    _loop_1(key);
  }
  var _loop_2 = function (key) {
    var oldImport = oldMap[key];
    var oldDepends = getImportDepends(oldImport);
    var depends = new Depends();
    if (
      oldDepends.defaultExport &&
      checkCodeBodyHasType(codeBody, oldDepends.defaultExport)
    ) {
      depends.defaultExport = oldDepends.defaultExport;
    }
    oldDepends.exports.forEach(function (item) {
      if (checkCodeBodyHasType(codeBody, item)) {
        depends.exports.push(item);
      }
    });
    var importStrNew = "";
    if (depends.defaultExport && depends.exports.length) {
      importStrNew =
        "import " +
        depends.defaultExport +
        ", { " +
        depends.exports.join() +
        " } from " +
        key;
    } else if (depends.defaultExport && !depends.exports.length) {
      importStrNew = "import " + depends.defaultExport + " from " + key;
    } else if (!depends.defaultExport && depends.exports.length) {
      importStrNew =
        "import { " + depends.exports.join(", ") + " } from " + key;
    }
    if (importStrNew) retArr.push(importStrNew);
  };
  for (var key in oldMap) {
    _loop_2(key);
  }
  var retStr = "";
  for (var i = 0; i < retArr.length; i++) {
    retStr += retArr[i] + ";";
    if (i != retArr.length - 1) {
      retStr += "\n";
    }
  }
  return "/* #region  uiImports */\n" + retStr + "\n/* #endregion uiImports */";
}
module.exports = genAdaptImportStr;
