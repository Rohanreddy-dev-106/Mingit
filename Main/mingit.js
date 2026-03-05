/* The Mingit class in the provided JavaScript code implements basic version control functionalities
like initializing a repository, adding files, committing changes, and displaying commit history and
differences. */
import path from "path";
import fs from "fs/promises"; //fs sub module
import crypto from "crypto";
import chalk from 'chalk';
import { diffLines } from "diff";
class Mingit {
  //class varibles
  _repopath;
  _objectspath;
  _Head;
  _indexpath;
  constructor(repopath = ".") {
    //it maintains all paths..all propertys
    this._repopath = path.join(repopath, ".mingit");
    this._objectspath = path.join(this._repopath, "objects"); //.mingit/object
    this._Head = path.join(this._repopath, "HEAD"); //.mingit/HEAD
    this._indexpath = path.join(this._repopath, "index");
  }
  async init() {
    await fs.mkdir(this._objectspath, { recursive: true }); //recursive:true (Keep doing the same operation for all required levels until everything is created)
    try {
      await fs.writeFile(this._Head, "", { flag: "wx" }); //w-write,x-exclusive(writeonly)
      await fs.writeFile(this._indexpath, JSON.stringify([]), { flag: "wx" }); //w-write,x-exclusive(writeonly)
    } catch (error) {
      console.log("Already initialized the .mingit folder.");
    }
  }
  hashobject(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }
  async add(file) {
    const filedata = await fs.readFile(file, { encoding: "utf-8" }); //read the file
    const fileHash = this.hashobject(filedata); //create hash
    console.log(fileHash);
    const objfilepath = path.join(this._objectspath, fileHash);
    await fs.writeFile(objfilepath, filedata); //if thare write if not create.
    await this.updatestagingArea(file, fileHash);
    console.log(`File added successfully: ${file}`);
  }
  async updatestagingArea(filepath, filehash) {
    let indexfile = await fs.readFile(this._indexpath, { encoding: "utf-8" }); //"[]"
    indexfile = JSON.parse(indexfile); //pars []
    indexfile.push({
      path: filepath,
      hash: filehash,
    });
    //update staging Area [array]
    await fs.writeFile(this._indexpath, JSON.stringify(indexfile), {
      encoding: "utf-8",
    });
  }
  async commit(message) {
    let index = JSON.parse(
      await fs.readFile(this._indexpath, { encoding: "utf-8" }),
    );

    let parentcomment = await this.getCorrentHead();

    let CommetData = {
      time: new Date().toISOString(),
      Message: message,
      files: index,
      ParentCommit: parentcomment,
    };
    // create commit hash
    let commithash = crypto
      .createHash("sha1")
      .update(JSON.stringify(CommetData))
      .digest("hex");

    // save commit object
    await fs.writeFile(
      path.join(this._objectspath, commithash),
      JSON.stringify(CommetData, null, 2),
      { encoding: "utf-8" },
    );

    // update HEAD
    await fs.writeFile(this._Head, commithash, { encoding: "utf-8" });

    // clear staging area
    await fs.writeFile(this._indexpath, JSON.stringify([], null, 2), {
      encoding: "utf-8",
    });

    console.log(` Commit created: ${commithash}`);
  }

  async getCorrentHead() {
    try {
      return await fs.readFile(this._Head, { encoding: "utf-8" });
    } catch (error) {
      return null; // for first commit
    }
  }

  async logs() {
    let currentcommithash = await this.getCorrentHead();

    while (currentcommithash) {
      let Log = await fs.readFile(
        path.join(this._objectspath, currentcommithash),
        { encoding: "utf-8" }
      );

      Log = JSON.parse(Log);

      console.log(`commit_id ${currentcommithash}`);
      console.log(`Date: ${Log.time}`);
      console.log(`Message: ${Log.Message}`);
      console.log();

      currentcommithash = Log.ParentCommit;//Head->nextfile->nextfile(true)->null(false)
    }
  }
  async showCommitdiff(commethash) {
    let commitData = JSON.parse(await this.getcommetdata(commethash));
    if (!commitData) {
      console.log("commit is not found..");
      return;
    }

    console.log("chenges in the last commit are:");

    for (let file of commitData.files) {
      console.log(`File: ${file.path}`);

      let currentcontent = await this.getFilecontent(file.hash);

      if (commitData.ParentCommit) {
        let parentcontent = await this.getParentFilecontent(commitData.ParentCommit, file.path);

        if (parentcontent) {
          let oldlines = parentcontent
          let newlines = currentcontent
          const diff = diffLines(oldlines, newlines)


          diff.forEach(part => {
            if (part.added) {
              process.stdout.write(chalk.green('+ ' + part.value));
            } else if (part.removed) {
              process.stdout.write(chalk.red('- ' + part.value));
            } else {
              process.stdout.write(chalk.gray('  ' + part.value));
            }
          });

        } else {
          console.log("new file");
          console.log(`present_content -> ${currentcontent}`);
        }

      } else {
        console.log("first commit");
        console.log(`present_content -> ${currentcontent}`);
      }
    }
  }

  async getParentFilecontent(parentcommithash, filepath) {
    let parentData = JSON.parse(await this.getcommetdata(parentcommithash));
    let parentfile = parentData.files.find((f) => {
      return f.path === filepath;
    });
    if (!parentfile) {
      return null;
    }
    else {
      return await this.getFilecontent(parentfile.hash);
    }
  }

  async getcommetdata(currenthash) {
    let commetpath = path.join(this._objectspath, currenthash);
    try {
      return await fs.readFile(commetpath, { encoding: "utf-8" });
    } catch (error) {
      console.log(`Failed to Fetch commit ${error.message}`);
      return null;
    }
  }

  async getFilecontent(hash) {
    let objpath = path.join(this._objectspath, hash);
    return await fs.readFile(objpath, { encoding: "utf-8" });
  }
}
//init → add → updateStagingArea → commit → log
const mingit = new Mingit();

(async () => {
  //await mingit.init();
  // await mingit.add("sample.txt");
  //await mingit.commit("init-2-commit");
  // await mingit.logs();
  await mingit.showCommitdiff("b9da57e94e61fed5ffe47756244bb9c895cee8b1")
})();