const glob = require("glob");
const fse = require("fs-extra");

const EditorPath = Editor.Project.path;

const metaMap = {};

function MetaRawTypeSet() {
  glob(`${EditorPath}/**/**.meta`, (err, files) => {
    files.forEach((file) => {
      if (metaMap[file]) {
        return;
      }

      let jsonObj = JSON.parse(fse.readFileSync(file, "utf-8"));

      if (jsonObj.type == "sprite") {
        jsonObj.type = "raw";
        jsonObj.subMetas = {};
      }

      fse.writeFileSync(file, JSON.stringify(jsonObj, null, 2));

      metaMap[file] = jsonObj;
    });
  });
}

module.exports = MetaRawTypeSet;
