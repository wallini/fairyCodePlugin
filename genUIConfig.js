const fse = require("fs-extra");
const glob = require("glob");
const path = require("path");

const EditorPath = Editor.Project.path;

function genUIConfigCode(bundleName, filePrefix, configJson) {
  if (bundleName.length) {
    //生成bundle的uiconfig配置文件
    const scanDir = EditorPath + `/assets/${configJson.outPath}/**/*.ts`;
    glob(scanDir, (err, scanFiles) => {
      const files = scanFiles
        .filter((file) => !file.includes("uiInterface"))
        .filter((file) => !file.includes("GameBinder.ts"))
        .filter((file) => !file.includes("UIConfig.ts"));

      let gameBinderClass = "";
      let classMap = {};
      const pkgNamesSet = new Set();

      files.forEach((file) => {
        const regexStr = EditorPath + `/assets/${configJson.outPath}/(.*)/.*`;
        const rx = new RegExp(regexStr);

        const pkgName = rx.exec(file)[1];
        const className = path.basename(file, ".ts");
        const isDialog = className.endsWith("Dialog");
        pkgNamesSet.add(pkgName);

        classMap[className] = {
          pkgName,
          isDialog,
          bundleName,
        };

        if (gameBinderClass.length == 0) {
          gameBinderClass = `${filePrefix}Gamebinder`;
        }
      });

      let codeStr = `import ${filePrefix}GameBinder from "./${filePrefix}GameBinder";
`;
      //configmap
      codeStr += "\n const map = " + JSON.stringify(classMap, null, 2) + "\n";

      //pkgNamesMap
      let pkgNamesMap = {};
      Array.from(pkgNamesSet).forEach((item) => (pkgNamesMap[item] = item));

      //uires noraml code

      codeStr += `

export default function UIConfigInit(dependsFuncInit: Function) {
  dependsFuncInit();
  ${filePrefix}GameBinder.bindAll();
  gg.uiRes.addUIconfig(map);
}
      `;

      fse.writeFileSync(
        EditorPath + `/assets/${configJson.outPath}/${filePrefix}UIConfig.ts`,
        codeStr,
        "utf8"
      );
    });
  } else {
    //生成大厅的uiconfig配置文件
    const scanDir = `${EditorPath}/assets/scripts/${configJson.outPath}/**/*.ts`;
    glob(scanDir, (err, scanFiles) => {
      const files = scanFiles
        .filter((file) => !file.includes("uiInterface"))
        .filter((file) => !file.includes("GameBinder.ts"))
        .filter((file) => !file.includes("UIConfig.ts"));

      let gameBinderClass = "";
      let classMap = {};
      const pkgNamesSet = new Set();

      files.forEach((file) => {
        const regexStr = `./assets/scripts/${configJson.outPath}/(.*)/.*`;
        const rx = new RegExp(regexStr);

        const pkgName = rx.exec(file)[1];
        const className = path.basename(file, ".ts");
        const isDialog = className.endsWith("Dialog");
        pkgNamesSet.add(pkgName);
        console.log("pkgName", pkgName, className, isDialog);

        classMap[className] = {
          pkgName,
          isDialog,
          bundleName: "",
        };

        if (gameBinderClass.length == 0) {
          gameBinderClass = `Gamebinder`;
          gamebinderPath = `./${configJson.outPath}/${gameBinderClass}`;
        }
      });

      let codeStr = `import GameBinder from "./GameBinder";
`;
      //configmap
      codeStr += "\n const map = " + JSON.stringify(classMap, null, 2) + "\n";

      //pkgNamesMap
      let pkgNamesMap = {};
      Array.from(pkgNamesSet).forEach((item) => (pkgNamesMap[item] = item));

      // codeStr +=
      //   "const PkgNamesMap = " + JSON.stringify(pkgNamesMap, null, 2) + "\n";

      //uires noraml code

      codeStr += `

export default function UIConfigInit(dependsFuncInit: Function) {
  dependsFuncInit();
  ${filePrefix}GameBinder.bindAll();
  gg.uiRes.addUIconfig(map);
}
      `;

      fse.writeFileSync(
        EditorPath +
          `/assets/scripts/${configJson.outPath}/${filePrefix}UIConfig.ts`,
        codeStr,
        "utf8"
      );

      //
    });
  }
}

module.exports = genUIConfigCode;
