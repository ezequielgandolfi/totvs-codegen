import http from "http"
import url from "url"
import fs from "fs"
import path from "path"
import codeGen from "./codegen"
import cache from "./cache"
import { IApplication } from 'model'

interface IResponse { status?:number, data?:Buffer|string }

let dataDirectory = path.join(__dirname, 'data')
let tableDirectory = path.join(dataDirectory, 'table')
let appDirectory = path.join(dataDirectory, 'application')

let getTemplateIndex = ():Promise<IResponse> => {
    return new Promise(resolve => {
        let fname = path.join(dataDirectory, 'template.index.json')
        fs.readFile(fname, (err,data) => {
            if (data)
                resolve({status:200, data:data})
            else
                resolve({status:500, data:'500 Template index not found'})
        })
    })
}

let getTableIndex = ():Promise<IResponse> => {
    return new Promise(resolve => {
        let fname = path.join(dataDirectory, 'table.index.json')
        fs.readFile(fname, (err,data) => {
            if (data)
                resolve({status:200, data:data})
            else
                resolve({status:500, data:'500 Table index not found'})
        })
    })
}

let getTable = (table:string):Promise<IResponse> => {
    return new Promise(resolve => {
        let fname = path.join(tableDirectory, `${table}.json`)
        fs.readFile(fname, (err,data) => {
            if (data)
                resolve({status:200, data:data})
            else
                resolve({status:500, data:'500 Table definition not found'})
        })
    })
}

let getApplication = (name:string):Promise<IResponse> => {
    let app = cache.application(name)
    return new Promise(resolve => {
        if (app)
            resolve({status:200, data:JSON.stringify(app)})
        else
            resolve({status:500, data:'500 Application not found'})
    })
}

let searchApplication = (filter:string):Promise<IResponse> => {
    let apps = cache.applications()
    let result = []
    let filterData: {table?,name?,q?} = {}
    let filters = (filter?.split('&') || [])
    filters.forEach(f => {
        let v = f.split('=')
        if (v.length == 2)
            filterData[v[0]] = v[1]        
    })
    return new Promise(resolve => {
        apps.forEach(app => {
            if (filterData.name) {
                if (app.name != filterData.name)
                    return
            }
            if (filterData.table) {
                if (app.table != filterData.table)
                    return
            }
            if (filterData.q) {
                let ok = false
                if (app.table == filterData.q)
                    ok = true
                if (app.name == filterData.q)
                    ok = true
                if (!ok)
                    return
            }
            result.push(app)
        })
        resolve({status:200, data: JSON.stringify(result)})
    })
}

let createApplication = (data?:string):Promise<IResponse> => {
    cache.reset()
    return new Promise(resolve => {
        try {
            let appData: IApplication = {}
            if (data)
                appData = JSON.parse(data)
            else
                throw "500";
            //
            let applicationName = appData.name
            let fname = path.join(appDirectory,`${applicationName}.json`)
            fs.writeFile(fname,data,(err) => {
                if (err)
                    throw "500"
                resolve({status:200, data:JSON.stringify(appData)})
            })
        } 
        catch {
            resolve({status:500, data:'500 - Application data error'})
        }
    })
}

let updateApplication = (name:string,data?:string):Promise<IResponse> => {
    cache.reset()
    return new Promise(resolve => {
        try {
            let appData: IApplication = {}
            if (data)
                appData = JSON.parse(data)
            else
                throw "500";
            //
            appData.name = name
            let applicationName = appData.name
            let fname = path.join(appDirectory,`${applicationName}.json`)
            fs.writeFile(fname,data,(err) => {
                if (err)
                    throw "500"
                resolve({status:200, data:JSON.stringify(appData)})
            })
        } 
        catch {
            resolve({status:500, data:'500 - Application data error'})
        }
    })
}

let postGenerate = (data?:string):Promise<IResponse> => {
    return new Promise(resolve => {
        try {
            let appData: any = {}
            if (data)
                appData = JSON.parse(data)
            else
                throw "500";
            //
            let templates = appData.templates
            let applicationName = appData.application
            let session = appData.session
            // if ((!templates)||(!applicationName)||(!session))
            //     throw "500"
            //
            codeGen.generate(applicationName,session,templates)
                .then(folder => {
                    let result = {
                        application: applicationName,
                        outputPath: folder
                    }
                    resolve({status:200, data:JSON.stringify(result)})
                })
                .catch((e) => { throw e })
        } 
        catch {
            resolve({status:500, data:'500 - Application data error'})
        }
    })
}

var apiServer = {
    request: (req: http.IncomingMessage, res: http.ServerResponse, data?: string) => {
        try {
            let requestUrl = url.parse(<string>req.url)

            let stringPath = requestUrl.pathname
            let methodPath = stringPath.split('/').slice(2)

            let writeResponse = (response:IResponse) => {
                res.writeHead(response.status || 204, { "Content-Type": "application/json" })
                res.write(response.data)
                res.end()
            }

            if ((req.method == 'GET')&&(methodPath.length == 1)) {
                switch (methodPath[0]) {
                    case 'template':
                        getTemplateIndex().then(v => writeResponse(v))
                        break
                    case 'table':
                        getTableIndex().then(v => writeResponse(v))
                        break
                    case 'application':
                        searchApplication(requestUrl.query).then(v => writeResponse(v))
                        break
                    default:
                        throw "Not found"
                }
            }
            else if ((req.method == 'POST')&&(methodPath.length == 1)) {
                switch (methodPath[0]) {
                    case 'application':
                        createApplication(data).then(v => writeResponse(v))
                        break
                    case 'generate':
                        postGenerate(data).then(v => writeResponse(v))
                        break
                    default:
                        throw "Not found"
                }
            }
            else if ((req.method == 'GET')&&(methodPath.length == 2)) {
                switch (methodPath[0]) {
                    case 'table':
                        getTable(methodPath[1]).then(v => writeResponse(v))
                        break
                    case 'application':
                        getApplication(methodPath[1]).then(v => writeResponse(v))
                        break
                    default:
                        throw "Not found"
                }
            }
            else if ((req.method == 'PUT')&&(methodPath.length == 2)) {
                switch (methodPath[0]) {
                    case 'application':
                        updateApplication(methodPath[1],data).then(v => writeResponse(v))
                        break
                    default:
                        throw "Not found"
                }
            }
            else {
                res.writeHead(404, { "Content-Type": "text/plain" })
                res.write("404 Not Found\n")
                res.end()
                return
            }
        }
        catch (e) {
            res.writeHead(500)
            res.end()
            console.log(e)
        }
    }
}

export default apiServer