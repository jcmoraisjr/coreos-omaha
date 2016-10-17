const argparse = require("argparse");
const http = require("http");
const xml2js = require("xml2js");
const parsexml = xml2js.parseString;
const xmlbuilder = new xml2js.Builder();

const argparser = new argparse.ArgumentParser({
    addHelp: false,
    description: "CoreOS Omaha",
});
argparser.addArgument("--date", {
    defaultValue: false,
    nargs: 0,
});
argparser.addArgument("--trustproxy", {
    defaultValue: false,
    nargs: 0,
});
argparser.addArgument("--listen", {
    defaultValue: 8000,
});
argparser.addArgument("--servername", {
    defaultValue: "update.core-os.net",
});
argparser.addArgument("--urlbase", {
    required: true,
});
argparser.addArgument("--channel", {
    required: true,
    action: "append",
});
const args = argparser.parseArgs();

function log(data) {
    var datetime = "";
    if (args.date) {
        datetime = "[" + new Date().toISOString().replace("T", " ") + "] ";
    }
    console.log(datetime + data);
}

function logApp(app, data) {
    log(app.$.remote + " | " + app.$.machineid + " | " + app.$.track + " | " + data)
}

var channels = {};
args.channel.forEach((item) => {
    var channel = {};
    var channelItem = item.split(",");
    channelName = channelItem[0];
    channel.version = channelItem[1];
    channel.size = channelItem[2];
    channel.hash = channelItem[3];
    channel.sha256 = channelItem[4];
    channels[channelName] = channel;
    log("Channel " + channelName + " version " + channel.version)
});

function noUpdateResponse(app) {
    return {
        "response":{
            "$":{
                "protocol":"3.0",
                "server":args.servername
            },
            "daystart":{
                "$":{
                    "elapsed_seconds":"0"
                }
            },
            "app":{
                "$":{
                    "appid":app.$.appid,
                    "status":"ok"
                },
                "updatecheck":{
                    "$":{
                        "status":"noupdate"
                    }
                }
            }
        }
    };
}

function downloadResponse(app) {
    var channel = channels[app.$.track];
    return {
        "response":{
            "$":{
                "protocol":"3.0",
                "server":args.servername
            },
            "daystart":{
                "$":{
                    "elapsed_seconds":"0"
                }
            },
            "app":{
                "$":{
                    "appid":app.$.appid,
                    "status":"ok"
                },
                "updatecheck":{
                    "$":{
                        "status":"ok"
                    },
                    "urls":{
                        "url":{
                            "$":{
                                "codebase":args.urlbase + "/" + channel.version + "/"
                            }
                        }
                    },
                    "manifest":{
                        "$":{
                            "version":channel.version
                        },
                        "packages":{
                            "package":{
                                "$":{
                                    "hash":channel.hash,
                                    "name":"update.gz",
                                    "size":channel.size,
                                    "required":"false"
                                }
                            }
                        },
                        "actions":{
                            "action":{
                                "$":{
                                    "event":"postinstall",
                                    "sha256":channel.sha256,
                                    "needsadmin":"false",
                                    "IsDelta":"false",
                                    "DisablePayloadBackoff":"true",
                                }
                            }
                        }
                    }
                }
            }
        }
    };
}

function okResponse(app) {
    return {
        "response":{
            "$":{
                "protocol":"3.0",
                "server":args.servername
            },
            "daystart":{
                "$":{
                    "elapsed_seconds":"0"
                }
            },
            "app":{
                "$":{
                    "appid":app.$.appid,
                    "status":"ok"
                }
            }
        }
    };
}

function writeXML(res, converter) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml");
    xmlResponse = xmlbuilder.buildObject(converter());
    res.write(xmlResponse);
}

function handleError(res) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain");
    res.write("Bad request\n");
}

function checkUpdateRequest(app) {
    var version = channels[app.$.track].version;
    if (app.$.version != version) {
        logApp(app, "Update version from " + app.$.version + " to " + version);
        return downloadResponse(app);
    }
    logApp(app, "Already updated version " + version);
    return noUpdateResponse(app);
}

function handleRequest(app, res) {
    if (app.updatecheck) {
        writeXML(res, () => {
            return checkUpdateRequest(app);
        });
    } else if (app.event) {
        logApp(app, "Event " + JSON.stringify(app.event[0].$));
        writeXML(res, () => {
            return okResponse(app);
        });
    } else {
        handleError(res);
    }
}

const server = http.createServer((req, res) => {
    var body = "";
    req.on("data", (chunk) => {
        body += chunk;
    });
    req.on("end", () => {
        parsexml(body, {}, (err, data) => {
            try {
                if (!err) {
                    var app = data.request.app[0];
                    if (args.trustproxy) {
                        app.$.remote = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    } else {
                        app.$.remote = req.connection.remoteAddress;
                    }
                    handleRequest(app, res);
                } else {
                    log(err);
                    handleError(res);
                }
            } catch(e) {
                log(e);
                handleError(res);
            } 
            res.end();
        });
    });
});

process.on("SIGTERM", () => {
  process.exit();
});

server.listen(args.listen);
log("Listening :" + args.listen);
