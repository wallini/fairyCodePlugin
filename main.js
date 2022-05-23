"use strict";
const io = require("socket.io-client");
const tar = require("tar");
const glob = require("glob");
const fs = require("fire-fs");
const ss = require("socket.io-stream");
const fse = require("fs-extra");
const Path = require("path");
const genImport = require("./importHandle");

// let socket = io.connect("http://127.0.0.1:3001/");
// let socket = io.connect("http://192.168.88.137:3001/");
let socket = io.connect("http://118.24.60.222:9528/");
let outDir = "scripts";

const INTERFACE_DIR_NAME = "uiInterface";

let zipFile = "";

function firstUpperCase(str) {
  return str.replace(/^[a-z]/, (L) => L.toUpperCase());
}

let configJson = {
  filePrefix: "",
  outPath: "views",
  dirFilter: [],
  uiProject: "",
  bunldes: {},
};

let uiProject = "";

function readConfig() {
  let configPath = Path.normalize(`${Editor.Project.path}/codeConfig.json`);
  fse.ensureFileSync(configPath);
  let configStr = fs.readFileSync(configPath, { encoding: "utf8" });

  if (configStr.length) {
    configJson = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }));
    if (!configJson.dirFilter) {
      configJson.dirFilter = [];
    }
  } else {
    fs.writeFileSync(configPath, JSON.stringify(configJson), {
      encoding: "utf8",
    });
  }
}

function result(msg) {
  let result = JSON.parse(msg);

  if (result.errorMsg) {
    Editor.error(result.errorMsg);
    return;
  }

  let prefixPath = Path.normalize(
    `${Editor.Project.path}/assets/${outDir}/${configJson.outPath}`
  );

  //处理bundle的导出
  if (configJson.bunldes[uiProject]) {
    configJson.outPath = configJson.bunldes[uiProject].outPath;
    prefixPath = Path.normalize(
      `${Editor.Project.path}/assets/${configJson.outPath}`
    );
  }

  let outFiles = [];
  for (let key in result.codeFiles) {
    let item = result.codeFiles[key];

    let outPath = "";

    if (
      configJson.dirFilter.length &&
      !configJson.dirFilter.some(
        (dir) =>
          item.filePath.indexOf(`/${dir}/`) != -1 ||
          item.filePath.indexOf(`uiInterface/i${firstUpperCase(dir)}`) != -1 ||
          item.filePath.indexOf("GameBinder") != -1
      )
    ) {
      continue;
    }

    if (item.isInterface) {
      outPath = Path.resolve(`${prefixPath}/${INTERFACE_DIR_NAME}/`);
    } else {
      outPath = Path.resolve(`${prefixPath}${item.path}`);
    }

    fse.ensureDirSync(outPath);

    outFiles.push(item.filePath);
    let filePath = Path.normalize(`${prefixPath}${item.filePath}`);

    if (!fs.existsSync(filePath) || item.isInterface) {
      fs.writeFileSync(filePath, item.codeContent, { encoding: "utf8" });
    } else {
      let str = fs.readFileSync(filePath, { encoding: "utf8" });

      str = str.replace(
        / ?\/\* #region  uiVals \*\/([\s\S]*)\/\* #endregion uiVals \*\//g,
        ` /* #region  uiVals */\n` +
          item.valContent +
          `\n /* #endregion uiVals */`
      );

      str = str.replace(
        /\/\* #region  uiImports \*\/([\s\S]*)\/\* #endregion uiImports \*\//g,
        genImport(
          `/* #region  uiImports */\n` +
            item.imports +
            `\n/* #endregion uiImports */`,
          str
        )
      );

      let m = str.match(
        /\/\* #region  btnClick Events \*\/([\s\S]*)\/\* #endregion btnClick Events \*\//
      );

      if (m && m[1]) {
        let btnClickEventsStr = m[1];
        item.btnClickNames.forEach((name) => {
          if (btnClickEventsStr.indexOf(name + "(") == -1) {
            btnClickEventsStr += ` ${name}() {
    //todo ..
  }
  
`;

            str = str.replace(
              /\/\* #region  btnClick Events \*\/([\s\S]*)\/\* #endregion btnClick Events \*\//g,
              `/* #region  btnClick Events */\n` +
                btnClickEventsStr +
                `\n /* #endregion btnClick Events */`
            );
          }
        });
      } else {
        Editor.log(
          "==>请检查文件 region  btnClick Events 注释是否存在",
          filePath
        );
      }

      fs.writeFileSync(filePath, str, { encoding: "utf8" });
    }
  }

  fs.writeFileSync(
    Path.normalize(`${prefixPath}/${result.binderCode.filePath}`),
    result.binderCode.codeContent,
    { encoding: "utf8" }
  );

  if (configJson.dirFilter.length) {
    configJson.dirFilter.forEach((dir) => {
      Editor.assetdb.refresh(
        `db://assets/${outDir}/${configJson.outPath}/${dir}`,
        function (err, results) {
          Editor.error("err is", err);
        }
      );

      Editor.assetdb.refresh(
        `db://assets/${outDir}/${
          configJson.outPath
        }/uiInterface/i${firstUpperCase(dir)}Interface`,
        function (err, results) {
          Editor.error("err is", err);
        }
      );
    });
  } else {
    //处理bundle的刷新
    if (configJson.bunldes[uiProject]) {
      Editor.assetdb.refresh(
        `db://assets/${configJson.outPath}`,
        function (err, results) {}
      );
    } else {
      Editor.assetdb.refresh(
        `db://assets/${outDir}/${configJson.outPath}`,
        function (err, results) {}
      );
    }
  }

  glob(prefixPath + "/**/*.ts", {}, (err, files) => {
    let notUseFiles = files.filter((file) => {
      let arr = outFiles.filter((item) => {
        return file.indexOf(item) >= 0;
      });

      if (file.indexOf("GameBinder") != -1) {
        return false;
      }

      if (arr.length) {
        return false;
      } else {
        return true;
      }
    });

    if (notUseFiles.length) {
      Editor.error("没有使用的文件如下，请自行清理：");
      Editor.log(notUseFiles);
    }
  });

  Editor.log("生成完成");
}

function bindSocketEvent(socket) {
  socket.on("buildResult", (msg) => {
    try {
      result(msg);
    } catch (error) {
      Editor.error(error);
    }
  });
  socket.on("disconnect", function () {
    socket.connect();
  });
}
bindSocketEvent(socket);

module.exports = {
  isWork: 0,
  load() {
    // execute when package loaded
  },

  unload() {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    open() {
      // open entry panel registered in package.json
      // Editor.Panel.open("fairgui_code_plugin");
    },
    gencode() {
      readConfig();
      if (this.isWork) {
        if (this.isWork > 3) {
          return;
        }
        Editor.log(`太频繁了，${this.isWork}s后再试`);
        return;
      }
      if (!socket.connected) {
        socket.connect();
        return;
      }

      let index = Editor.Project.path.lastIndexOf("/");
      let projectName = Editor.Project.path.substring(index + 1);
      let zipName = `${projectName.trim()}.zip`;

      if (!fs.existsSync(Editor.Project.path + "/UIProject/")) {
        Editor.log("文件夹名称为UIProject， 当前项目找不到！");
        return;
      }

      uiProject = configJson.uiProject;
      if (configJson.bunldes[uiProject]) {
        configJson.filePrefix = configJson.bunldes[uiProject].filePrefix;
      }

      glob(
        Editor.Project.path +
          `/UIProject/${configJson.uiProject}/assets/**/*.xml`,
        {},
        (err, files) => {
          if (err) {
            Editor.error("报错了" + err);
          } else {
            files = files.map((name) => {
              let index = name.indexOf("assets");
              name = name.substring(index);
              return name;
            });
            Editor.log("生成开始");
            this.isWork = 5;

            let id = setInterval(() => {
              this.isWork--;
              if (this.isWork <= 0) {
                clearInterval(id);
              }
            }, 1000);

            if (Editor.isDarwin) {
              fse.ensureDirSync("/tmp/");
              zipFile = "/tmp/" + zipName;
            } else {
              zipFile = zipName;
            }

            if (configJson.outDir) {
              outDir = configJson.outDir;
            }
            tar
              .c(
                {
                  gzip: true,
                  sync: true,
                  cwd: Path.normalize(
                    Editor.Project.path + `/UIProject/${configJson.uiProject}`
                  ),
                },
                files
              )
              .pipe(fs.createWriteStream(zipFile))
              .on("finish", function () {
                let stream = ss.createStream();
                socket.emit(
                  "setConfig",
                  JSON.stringify({
                    filePrefix: configJson.filePrefix,
                  })
                );
                ss(socket).emit("uploadZip", stream, { name: zipName });
                fs.createReadStream(zipFile).pipe(stream);
              });
          }
        }
      );
    },
    clicked() {
      Editor.log("Button clicked!");
    },
  },
};
