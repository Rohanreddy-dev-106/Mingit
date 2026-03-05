/** @format */

import path from "path";
import fs from "fs/promises"; //fs sub module
import crypto from "crypto";

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

      currentcommithash = Log.ParentCommit;
    }
  }
}
  //init → add → updateStagingArea → commit → log
  const mingit = new Mingit();

(async () => {
  //await mingit.init();
  //await mingit.add("sample.txt");
  //await mingit.commit("init-3-commit");
  await mingit.logs();
})();