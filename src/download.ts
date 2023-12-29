import rp = require("request-promise-native");
import fs = require("fs-extra");
import AdmZip = require("adm-zip");

(async _ => {

  const jar = rp.jar()

  let versionRes = await rp("https://itunes.apple.com/lookup?bundleId=com.lihkg.forum-ios")
  let version = JSON.parse(versionRes)["results"][0]["version"]

  let res = await rp({
    url: "https://lihkg.com/api_v2/system/property",
    headers: {
      "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
    },
    jar: jar
  })

  let assetUrl = JSON.parse(res)["response"]["asset"]["patch"][0]["url"]
  let fileName: string = assetUrl.split("/")[assetUrl.split("/").length - 1]

  rp({
    method: "get",
    url: assetUrl,
    jar: jar,
    encoding: null,
    headers: {
      "User-Agent": `LIHKG/${version} iOS/14.7.1 iPhone/iPhone 6s`
    },
  }).then(res => {
    fs.writeFileSync(fileName, res)

    const fileSizeInBytes = fs.statSync(fileName).size;
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

    if (fileSizeInMegabytes > 0) {
      let folderName = fileName.split(".")[0]

      const zip = new AdmZip(fileName);

      zip.extractAllTo(folderName, true);

      fs.rmdirSync("assets/faces", {recursive: true})
      fs.rmdirSync("assets/faces_png", {recursive: true})

      fs.moveSync(`${folderName}/assets/faces`, "assets/faces", {overwrite: true})
      fs.moveSync(`${folderName}/assets/faces_png`, "assets/faces_png", {overwrite: true})

      require("./index")

      fs.rmdirSync(folderName, {recursive: true})
      fs.rm(fileName)
    }
  })
})()

