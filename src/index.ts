import fse = require("fs-extra");
import {mapping} from "./mapping";
import {getCurrentTime} from "./time";

(async () => {
  let folderPath = process.cwd() + "/assets/"
  let body = ""
  for (let mappingKey in mapping) {
    for(let subFolder of ["faces_png","faces"]){
      let folders = fse.readdirSync(`${folderPath}${subFolder}/${mappingKey}/`)
      body += `## ${mapping[mappingKey]} [${(subFolder == "faces_png" ? "PNG" : "GIF")}]\n\n`
      folders.forEach(name => {
        body += `![${name.substring(0, name.indexOf("."))}](./assets/${subFolder}/${mappingKey}/${name})`
      })
      body += `\n\n`
    }
  }

  fse.readFile(process.cwd() + "/README_TEMPLATE", 'utf8', (err, data) => {
    if (err) return console.error(err)
    let result = data.replace("{body}", body);
    result = result.replace("{last_update}", getCurrentTime())
    fse.writeFile(process.cwd() + "/README.md", result, "utf8", (err) => {
      if (err) return console.error(err)
    })
  })

  //process.exit(0)

})()

