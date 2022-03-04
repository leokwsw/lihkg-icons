import fse = require("fs-extra")
import {mapping} from "./mapping";

(async () => {
  let folderPath = process.cwd() + "/assets/"
  let body = ""
  for (let mappingKey in mapping) {
    let folders = fse.readdirSync(`${folderPath}/${mappingKey}/`)
    body += `## ${mapping[mappingKey]}\n\n`
    folders.forEach(name => {
      body += `![${name.substring(0, name.indexOf("."))}](./assets/${mappingKey}/${name})`
    })
    body += `\n\n`
  }

  fse.readFile(process.cwd() + "/README_TEMPLATE", 'utf8', (err, data) => {
    if (err) return console.error(err)
    const result = data.replace("{body}", body);
    fse.writeFile(process.cwd() + "/README.md", result, "utf8", (err) => {
      if (err) return console.error(err)
    })
  })

  //process.exit(0)

})()

