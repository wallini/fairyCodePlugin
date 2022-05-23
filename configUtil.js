const fse = require("fs-extra");
const glob = require("glob");
const path = require("path");

function main() {
  const args = process.argv.slice(2);
  let bundleName = "";
  if (args[0] == "-b") {
    bundleName = args[1];
  }

  let filePrefix = "";
  // let filePrefix = "MJ";
  if (args[2] == "-p") {
    filePrefix = args[3];
  }

  if (bundleName.length) {
    //生成bundle的uiconfig配置文件
    const scanDir = `./assets/${bundleName}/views/**/*.ts`;
    glob(scanDir, (err, scanFiles) => {
      const files = scanFiles
        .filter((file) => !file.includes("uiInterface"))
        .filter((file) => !file.includes("GameBinder.ts"));

      let gameBinderClass = "";
      let gamebinderPath = "";
      let classMap = {};
      const pkgNamesSet = new Set();

      files.forEach((file) => {
        const regexStr = `./assets/${bundleName}/views/(.*)/.*`;
        const rx = new RegExp(regexStr);

        const pkgName = rx.exec(file)[1];
        const className = path.basename(file, ".ts");
        const isDialog = className.endsWith("Dialog");
        pkgNamesSet.add(pkgName);
        console.log("pkgName", pkgName, className, isDialog);

        classMap[className] = {
          pkgName,
          isDialog,
          bundleName,
        };

        if (gameBinderClass.length == 0) {
          gameBinderClass = `${filePrefix}Gamebinder`;
          gamebinderPath = `./views/${gameBinderClass}`;
        }
      });

      console.log(gameBinderClass, gamebinderPath);
      console.log(JSON.stringify(classMap, null, 2));

      let codeStr = `import ${filePrefix}GameBinder from "./views/${filePrefix}GameBinder";
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
        `./assets/${bundleName}/${filePrefix}UIconfig.ts`,
        codeStr,
        "utf8"
      );

      //
    });
  } else {
    //生成大厅的uiconfig配置文件
    const scanDir = `./assets/scripts/views/**/*.ts`;
    glob(scanDir, (err, scanFiles) => {
      const files = scanFiles
        .filter((file) => !file.includes("uiInterface"))
        .filter((file) => !file.includes("GameBinder.ts"));

      let gameBinderClass = "";
      let gamebinderPath = "";
      let classMap = {};
      const pkgNamesSet = new Set();

      files.forEach((file) => {
        const regexStr = `./assets/scripts/views/(.*)/.*`;
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
          gamebinderPath = `./views/${gameBinderClass}`;
        }
      });

      console.log(gameBinderClass, gamebinderPath);
      console.log(JSON.stringify(classMap, null, 2));

      let codeStr = `import GameBinder from "./views/GameBinder";
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
        `./assets/scripts/${filePrefix}UIConfig.ts`,
        codeStr,
        "utf8"
      );

      //
    });
  }
}

main();
