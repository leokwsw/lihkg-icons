export function importLog(prefix: string) {
  let today = new Date().toLocaleDateString("en-US", {timeZone: "Asia/Hong_Kong"});
  today = today.replace(/\//g, "-")

  let folderTimeStamp = Date.now()
  let folderPrefix = `${today}_${folderTimeStamp}`
  const fs = require('fs');
  const util = require('util');
  var log_file = fs.createWriteStream(`./log/${folderPrefix}_${prefix}_debug.log`, {flags: 'w'});
  var log_stdout = process.stdout;

  console.log = function (d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  };
}
