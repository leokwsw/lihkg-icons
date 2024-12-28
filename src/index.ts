import rp = require("request-promise-native");
import fs = require("fs-extra");
import AdmZip = require("adm-zip");
import jsdom = require("jsdom");
import {DOMWindow} from "jsdom";
import r from "request";
import {mapping} from "./mapping";
import * as moment from 'moment-timezone';
import 'moment/locale/zh-hk';
import {importLog} from "./saveLog";

// @ts-ignore
const {JSDOM} = jsdom

async function getWebWindow(url: string, jar: r.CookieJar, version: string): Promise<DOMWindow> {
  let mainRes = await rp({
    url,
    resolveWithFullResponse: true,
    timeout: 2000,
    jar: jar,
    headers: {
      "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
    },
  })

  if (!mainRes) {
    return null
  }

  return (new JSDOM(mainRes.body)).window
}

function searchBracket(text: string): number {
  let depth = 0;
  let isStr = false;

  for (let count = 0; count < text.length; count++) {
    const char = text[count];

    if (char === '"') {
      isStr = !isStr;
    }

    if (!isStr) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
      }
    }

    if (depth === 0) {
      return count;
    }
  }

  return -1; // Return -1 if no closing bracket is found
}

(async _ => {
  importLog("index")

  moment.tz.setDefault("Asia/HongKong");
  const jar = rp.jar()

  let versionRes = await rp("https://itunes.apple.com/lookup?bundleId=com.lihkg.forum-ios")
  let version = JSON.parse(versionRes)["results"][0]["version"]

  console.log("iOS version : " + version)

  let res = await rp({
    url: "https://lihkg.com/api_v2/system/property",
    headers: {
      "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
    },
    jar: jar
  })


  console.log("res")
  console.log(res)

  let assetUrl = JSON.parse(res)["response"]["asset"]["patch"][0]["url"]
  let fileName: string = assetUrl.split("/")[assetUrl.split("/").length - 1]
  console.log("assetUrl : " + assetUrl)

  fs.writeFileSync(`property/${version}-${fileName.replace(".zip", "")}.json`, JSON.stringify(JSON.parse(res), null, 2))
  rp({
    method: "get",
    url: assetUrl,
    jar: jar,
    encoding: null,
    headers: {
      "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
    },
  }).then(async res => {
    fs.writeFileSync(fileName, res)

    const fileSizeInBytes = fs.statSync(fileName).size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

    if (fileSizeInMegabytes > 0) {
      let folderName = fileName.split(".")[0]

      const zip = new AdmZip(fileName);

      zip.extractAllTo(folderName, true);

      fs.rmdirSync("assets/faces", {recursive: true})
      fs.rmdirSync("assets/faces_png", {recursive: true})


      fs.moveSync(`${folderName}/limoji.json`, "assets/limoji.json", {overwrite: true})
      fs.moveSync(`${folderName}/assets/faces`, "assets/faces", {overwrite: true})
      fs.moveSync(`${folderName}/assets/faces_png`, "assets/faces_png", {overwrite: true})


      const {document}: DOMWindow = await getWebWindow("https://lihkg.com", jar, version)

      let bodyScripts = document.getElementsByTagName("body")[0]
        .getElementsByTagName("script")

      let mainScriptUrl = ""

      for (let i = 0; i < bodyScripts.length; i++) {
        let bodyScript = bodyScripts[i]
        let bodyScriptSrc = bodyScript.getAttribute("src")
        if (
          bodyScriptSrc != undefined &&
          bodyScriptSrc.indexOf("lihkg.com") >= 0 &&
          bodyScriptSrc.endsWith("main.js")
        ) {
          mainScriptUrl = bodyScriptSrc
        }
      }

      let mainJsResStr: string = await rp({
        method: "GET",
        url: mainScriptUrl,
        jar: jar,
        headers: {
          "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
        },
      })


      let startPos = mainJsResStr.indexOf("{normal:{icons:{\"assets/faces/normal/")
      mainJsResStr = mainJsResStr.substring(startPos)

      let endPos = searchBracket(mainJsResStr)
      mainJsResStr = mainJsResStr.substring(0, endPos + 1)

      mainJsResStr = mainJsResStr.replace(/!0/g, "1")

      if (fs.existsSync("./src/tmp.ts")) {
        fs.removeSync("./src/tmp.ts")
      }

      fs.writeFileSync("./src/mainJson.ts", `export default ${mainJsResStr}`, "utf8");

      // fix the key not match for "xm" and "Xmas"
      fs.writeFileSync("./assets/main.json", JSON.stringify(require("./mainJson").default, null, 2).replace("\"xmas\"", "\"xm\""))

      fs.removeSync("./src/mainJson.ts")

      const limoji = require('../assets/limoji.json');
      const mainJson = require('../assets/main.json')

      let mainContent = "| Code | Name | Preview | View |\n"
      mainContent += "| --- | --- | --- | --- |\n"
      mainContent += "| (All) | N/A | N/A | [View](./view/all.md) |\n"

      let allContent = "# All icons\n"

      for (const packDict of limoji.emojis) {
        let cat = packDict.cat

        let icons = packDict["icons"]

        let specialList = []

        if (mainJson[cat] && Object.keys(mainJson[cat]).indexOf("special") >= 0) {
          let specialDict: { [key: string]: string } = mainJson[cat]["special"]

          if (Object.keys(specialDict).length > 0) {
            Object.keys(specialDict).forEach(gifPath => {
              let code = specialDict[gifPath]
              let pngPath = gifPath.replace(/\.gif/g, ".png").replace(/faces/g, "faces_png")
              specialList.push([code, gifPath, pngPath])
            })
          }
        }

        let merge = []
        merge.push(...icons)
        merge.push(...specialList)

        let viewContent = ""
        viewContent += `## ${cat} [${mapping[cat] ? mapping[cat] : cat}]\n`

        let showOn = packDict["show_on_2"]

        if (showOn) {
          let showOnArray: any[] = showOn
          viewContent += `\n`
          viewContent += `### Show On\n`
          for (const showOnObj of showOnArray) {
            if (Object.keys(showOnObj).includes("keywords")) {
              viewContent += `Keywords : ${(showOnObj["keywords"] as string[]).join(", ")}\n`
            } else if (Object.keys(showOnObj).includes("start_time") && Object.keys(showOnObj).includes("end_time")) {
              viewContent += `From ${moment(showOnObj["start_time"]).tz("Asia/HongKong").format()}\n\n`
              viewContent += `To ${moment(showOnObj["end_time"]).tz("Asia/HongKong").format()}\n`
            } else if (Object.keys(showOnObj).includes("user_ids")) {
              viewContent += `User ID: ${(showOnObj["user_ids"] as string[]).join(", ")}\n`
            } else {
              console.log("cat" + cat)
              console.log("showOnObj")
              console.log(showOnObj)
            }
          }
          viewContent += `\n`
        }

        viewContent += `| Filename | Emoji | GIF | PNG |\n`
        viewContent += `| --- | --- | --- | --- |\n`

        for (let element of merge) {
          let split = element[1].split("/")
          let name = split[split.length - 1].split(".")[0]
          let code = element[0], gif = element[1], png = element[2]
          viewContent += `| ${name} | \`${code}\` | ![${name}](../${gif}) | ![${name}](../${png}) |\n`
        }

        viewContent += "\n"

        fs.writeFileSync(`./view/${cat}.md`, viewContent)

        mainContent += `| ${cat} | ${mapping[cat] ? mapping[cat] : cat} | ![${merge[0][1]}](${merge[0][1]}) | [View](./view/${cat}.md) |\n`

        allContent += viewContent
      }

      let readmeTemplate = fs.readFileSync("./README_TEMPLATE", "utf8")

      let result = readmeTemplate.replace("{body}", mainContent);

      fs.writeFileSync("./README.md", result, "utf8")
      fs.writeFileSync(`./view/all.md`, allContent)

      // fs.rmdirSync(folderName, {recursive: true})
      fs.rm(fileName)
    }
  })
})()

