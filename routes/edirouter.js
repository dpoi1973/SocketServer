/**
 * 
 * 提供调用的api路由
 * 
 */


const express = require('express');
const request = require('request');
const config = require('config');
const host = config.get('Common.dbRESTHost');
const router = express.Router();
const ediservice = require('../services/EDIServices');
const _ = require('lodash');
const fs = require('fs');
router.get('/', (req, res) => {
    res.json({ message: 'hooray! welcome to our api!' });
});


/**
 * 导入EDI
 */
router.post('/update', (req, res) => {
    if (!req.body.COPNO || req.body.COPNO == '') {
        res.status(500).json({ err: "COPNO没有传输过来或者为空" });
    } else {
        var COPNO = req.body.COPNO;
        let returnmessage = {};
        let url = `http://${host}/api/formheadmssqls/findspreadmodel?COPNO=${COPNO}`;
        const options = {
            uri: url,
            json: true, // Automatically parses the JSON string in the response,
            timeout: 1500,
        };
        request(url, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let data = JSON.parse(body);
                console.log(data.pre_entry_id,data.EDI_NO,data.COP_NO,data.ie_flag,data.DECL_PORT,data.username)
                // data.username = 'WLD7';
                ediservice.getEDINO(data).then(result => {
                    console.log('占用结束!,开始更新!')
                    data.pre_entry_id = result;
                    data.EDI_NO = result;
                    return ediservice.updateEDINO(data);
                })
                    .then(result => {
                        console.log('更新结束!');
                        let formcert = data.attachinfo;
                        if (formcert != "") {
                            if (!_.isArray(formcert)) {
                                formcert = JSON.parse(formcert);
                            }
                        } else {
                            formcert = [];
                        }
                        if (formcert.length != 0) {
                            console.log('开始下载pdf!')
                            return ediservice.download(formcert, result, data.username, data.agent_code);
                        } else {
                            return result;
                        }
                    })
                    .then(result => {
                        // result.EDI_NO = data.EDI_NO;
                        res.status(200).json(result);
                    })
                    .catch(err => {
                        res.status(500).json(err);
                    })
            } else if (error) {
                returnmessage.err = error;
                res.status(500).json(returnmessage);
            } else {
                returnmessage.err = JSON.parse(body);
                res.status(500).json(returnmessage);
            }
        })
    }
});

/**
 * 下载pdf
 */
router.post('/downloadpdf', (req, res) => {
    var data = req.body;
    ediservice.download(data.pdfjson, data.mesEDI_NO, data.username, data.agentCode)
        .then(result => {
            res.status(200).json(result);
        })
        .catch(err => {
            res.status(500).json(err);
        })
});


/**
 * 释放EDI
 */
router.post('/free', (req, res) => {
    var data = req.body;
    // data.EDI_NO = 'EDI17B000036078328';
    // data.pre_entry_id = 'EDI17B000036078328';
    // data.COP_NO = 'BG201711KWGQ003207';
    // data.username = 'WLD7';
    // data.agent_code = '3120980025';
    ediservice.freeEDINO(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        res.status(200).json(err);
    })
});


/**
 * 根据EDI_NO查询对应EDI数据 {username,agent_code,EDI_NO}
 */
router.post('/getFormHead', (req, res) => {
    var data = req.body;
    console.log(data.EDI_NO);

    ediservice.getFormHead(data).then(result => {
        let respjson = {
            EDI_NO: data.EDI_NO,
            message: result
        }
        res.status(200).json(respjson);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
});


/**
 * 根据时间跑回当天的回执{username,agent_code,datetime}
 */
router.post('/getCustomresult', (req, res) => {
    var data = req.body;
    console.log(data.datetime);
    ediservice.getCustomresult(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
});


/**
 * 根据时间跑回指定size报关单号列表{username,agent_code,datasize,datatime}
 */
router.post('/getEDIList', (req, res) => {
    var data = req.body;
    console.log(data.datatime, data.datasize);
    ediservice.getEDIList(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
});


/**
 * 回传指定报关单号的pdf
 */
router.post('/uploadformcert', (req, res) => {
    var data = req.body;
    ediservice.uploadformcert(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
})


/**
 * 获取连接的EDI客户端 username&password
 */
router.get('/getAllEDIList', (req, res) => {
    var data = req.query;
    ediservice.getadlledilist(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
})

/**
 * 获取重置formhead状态 {EDI_NO,username,agent_code}
 */
router.post('/reloadStatus', (req, res) => {
    var data = req.body;
    ediservice.reloadstatus(data).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ err });
    })
})


module.exports.defualtrouter = router;