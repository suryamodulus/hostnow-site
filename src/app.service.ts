import {
  BadRequestException,
  Injectable, 
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {join} from 'path';
const { pipeline } = require('stream/promises');
const extractZip = require('extract-zip')
const fse = require('fs-extra')
const fg = require('fast-glob');
const util = require('util');
const mvP = util.promisify(require('mv'));
const chmodrP = util.promisify(require('chmodr'));
const unzipper = require('unzipper');

@Injectable()
export class AppService {
  async uploadSite(req, res): Promise<any> {
    if (!req.isMultipart()) {
      return res.send(new BadRequestException('Request is not multipart'))
    }
    const data = await req.file()
    const siteDomain = `${data.fields['subdomain']['value']}.hostnow.site`
    const sitePath = `/srv/sites/${siteDomain}`
    await fse.remove(sitePath)
    await this.handleZipFile(data, sitePath)
    await this.cleanMacOSJunkFiles(sitePath)
    await this.handleZipFileRootDir(sitePath)
    return res.send({ data: 'Uploaded Successfully', siteDomain });
  }

  async handleZipStream(data, sitePath){
    return pipeline(
      data.file,
      unzipper.Extract({ path: sitePath })
    );
  }

  async handleZipFile(data, sitePath){
    const siteZipPath = `${sitePath}.zip`
    await pipeline(
      data.file,
      fse.createWriteStream(siteZipPath)
    );
    await extractZip(siteZipPath, { dir: sitePath })
    await fse.remove(siteZipPath)
    await chmodrP(sitePath, 0o744)
  }

  async cleanMacOSJunkFiles(sitePath){
    const files = await fg([`${sitePath}/**/.DS_Store`, `${sitePath}/**/__MACOSX`], { onlyFiles: false });
    await Promise.all(files.map(file => fse.remove(file)))
  }

  async handleZipFileRootDir(sitePath){
    const dirStruct = (await fse.readdir(sitePath, { withFileTypes: true }))
    .reduce((output, obj) => {
      if(obj.isDirectory()){
        output['dirName'] = obj.name
        output['dirs']++
      }
      else if(obj.isFile()){
        output['files']++
      }
      return output
    }, {dirs: 0, files: 0, dirName: null})
    if(dirStruct.dirs === 1 && dirStruct.files === 0){
      const tmpFolderPath = join(sitePath, uuidv4())
      await fse.rename(join(sitePath, dirStruct.dirName), tmpFolderPath)
      await this.moveAllFiles(sitePath, tmpFolderPath)
      await fse.remove(tmpFolderPath)
    };
  }

  async moveAllFiles(sitePath, tmpFolderPath){
    return fg(join(tmpFolderPath, "**"), { expandDirectories: true })
    .then(entryPaths => entryPaths.map(entryPath => {
      return mvP(entryPath, entryPath.replace(tmpFolderPath, sitePath) , { mkdirp: true });
    }))
    .then(p => Promise.all(p))
  }
}