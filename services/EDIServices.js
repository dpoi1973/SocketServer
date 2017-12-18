/**
 * 
 * 对EDI的各种操作
 */

const encryptservice = require('./encryptService');
const transformservice = require('./transformService');
const vaildservice = require('./validatedService');
const transdate = require('../common/transdateutil');
const SendService = require('./SendService');
const config = require('config');
const adminuser = config.get('Common.userName');
const adminpass = config.get('Common.passWord');
const alihost = config.get('Common.aliHost');
const pdfpath = config.get('Common.pdfPath');
const pdfhost = config.get('Common.pdfHost');
const async = require('async');
const _ = require('lodash');
const request = require('request');
const fs = require('fs');


const sendService = new SendService();
var globalsocket = {};
var globalclients = [];
module.exports.socket = function (socket) {
    globalsocket = socket;
};
module.exports.ediClients = function (ediClients) {
    globalclients = ediClients;
};

/*
    根据COP_NO（内部编号）查询是否有可用的EDI_NO
*/
module.exports.getEDINO = function (formjson) {
    // console.log('getEDINO');
    let thisdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
    thisdatetime = transdate.transdate(thisdatetime);
    return new Promise((resolve, reject) => {
        let returnmessage = {};
        if (formjson.COP_NO == '') {
            returnmessage.err = '流水号不能为空！';
            reject(returnmessage);
        } else if (formjson.ie_flag == '') {
            returnmessage.err = '单证类型不能为空！';
            reject(returnmessage);
        } else if (formjson.DECL_PORT == '') {
            returnmessage.err = '申报口岸不能为空！';
            reject(returnmessage);
        } else if (formjson.agent_code == '') {
            returnmessage.err = '申报单位不能为空！';
            reject(returnmessage);
        } else {
            var id = "";
            for (var j = 0; j < globalclients.length; j++) {
                if (globalclients[j].name == formjson.username && globalclients[j].signunit == formjson.agent_code) {
                    id = globalclients[j].id;
                    // console.log(id);
                }
            }
            // console.log(id);
            if (globalsocket.sockets[id]) {
                try {
                    let selectcopsql = `select top 1 * from Form_Head where COP_NO = '${formjson.COP_NO}' and create_date>'${thisdatetime}';`;
                    // console.log(selectcopsql);
                    globalsocket.sockets[id].emit('select', selectcopsql, formcb => {
                        // console.log(formcb);
                        if (formcb) {
                            if (formcb.length > 1) {
                                console.error(`内部编号${formjson.COP_NO}重复`);
                                returnmessage.err = `内部编号${formjson.COP_NO}重复`;
                                reject(returnmessage)
                            } else {
                                if (formjson.ie_flag == formcb.ie_flag && formjson.DECL_PORT == formcb.DECL_PORT && formjson.COP_NO == formcb.COP_NO && formcb.is_status != '5') {
                                    console.error(`内部编号${formjson.COP_NO}已发送`)
                                    returnmessage.err = `内部编号${formjson.COP_NO}已发送`;
                                    reject(returnmessage);
                                } else
                                    if (formjson.ie_flag == formcb.ie_flag && formjson.DECL_PORT == formcb.DECL_PORT && formjson.COP_NO == formcb.COP_NO && formcb.is_status == '5') {
                                        // console.log('getedi' + formcb.EDI_NO);
                                        resolve(formcb.EDI_NO);
                                    } else {
                                        console.error(`内部编号${formjson.COP_NO}被占用`)
                                        returnmessage.err = `内部编号${formjson.COP_NO}被占用`;
                                        reject(returnmessage);
                                    }
                            }
                        } else {
                            let selectcopnosql = `SELECT top 1 ie_flag,pre_entry_id,agent_code,agent_name,is_status,username,create_date,del_flag,EDI_NO,COP_NO,DECL_PORT FROM Form_Head where EDI_NO<>'' and manual_no='' and trade_co='' and contr_no='' and i_e_date=''and d_date='' and trade_name='' and traf_name='' and agent_code<>'' and agent_name<>'' and del_flag in ('','0') and COP_NO='' and create_date>'${thisdatetime}' and ie_flag='${formjson.ie_flag}' and DECL_PORT='${formjson.DECL_PORT}' and pre_entry_id=EDI_NO order by create_date desc;`;
                            // let selectcopnosql1 = `select top 1 EDI_NO from Form_Head where  EDI_NO<>'' and manual_no='' and trade_co='' and contr_no='' and i_e_date=''and d_date='' and trade_name='' and traf_name='' and agent_code<>'' and agent_name<>'' and del_flag='0' and COP_NO='' and create_date>'2017-01-01' and ie_flag=${formjson.ie_flag} and DECL_PORT=${formjson.DECL_PORT} and pre_entry_id=EDI_NO`;
                            // let selectcopnosqlarr = [selectcopnosql,selectcopnosql1];
                            globalsocket.sockets[id].emit('select', selectcopnosql, formheadcb => {
                                if (formheadcb) {
                                    let useedinosql = `update Form_Head set COP_NO='${formjson.COP_NO}',del_flag='' where EDI_NO='${formheadcb.EDI_NO}' and create_date>'${thisdatetime}';`;
                                    globalsocket.sockets[id].emit('modify', useedinosql, cb => {
                                        if (cb == 1) {
                                            resolve(formheadcb.EDI_NO);
                                        } else {
                                            console.error('占用EDI_NO 失败');
                                            returnmessage.err = '占用EDI_NO 失败';
                                            reject(returnmessage);
                                        }
                                    })
                                } else {
                                    console.error('没有可用的EDI_NO');
                                    returnmessage.err = '没有可用的EDI_NO';
                                    reject(returnmessage);
                                }
                            })
                            // try {
                            //     let useedinosql = `update Form_Head set COP_NO='${formjson.COP_NO}',del_flag='' where EDI_NO in (select top 1 EDI_NO from Form_Head where EDI_NO<>'' and manual_no='' and trade_co='' and contr_no='' and i_e_date=''and d_date='' and trade_name='' and traf_name='' and agent_code<>'' and agent_name<>'' and del_flag in ('','0') and COP_NO='' and create_date>'2017-01-01' and ie_flag='${formjson.ie_flag}' and DECL_PORT='${formjson.DECL_PORT}' and pre_entry_id=EDI_NO order by create_date desc);`;
                            //     console.log(useedinosql);
                            //     globalsocket.sockets[id].emit('modify', useedinosql, cb => {
                            //         if (cb == 1) {
                            //             console.log('modifycb1');
                            //             let selectcopnosql = `select * from Form_Head where EDI_NO <> '' and COP_NO = '${formjson.COP_NO}'`;
                            //             globalsocket.sockets[id].emit('select', selectcopnosql, formheadcb => {
                            //                 console.log(`${formjson.COP_NO};${formheadcb.EDI_NO};`, cb);
                            //                 if (formheadcb) {
                            //                     resolve(formheadcb.EDI_NO);
                            //                 } else {
                            //                     console.error('占用EDI_NO 失败');
                            //                     returnmessage.err = '占用EDI_NO 失败';
                            //                     reject(returnmessage);
                            //                 }
                            //             })
                            //         } else {
                            //             console.error('没有可用的EDI_NO');
                            //             returnmessage.err = '没有可用的EDI_NO';
                            //             reject(returnmessage);
                            //         }

                            //     })
                            // } catch (ee) {
                            //     console.error(`${formjson.COP_NO};ee=`, ee);
                            //     if (!_.isArray(ee)) {
                            //         returnmessage.err = ee;
                            //     } else {
                            //         returnmessage.err = JSON.stringify(ee);
                            //     }
                            //     reject(returnmessage);
                            // }
                        }
                    });
                } catch (err) {
                    console.error('查询：', err);
                    if (!_.isArray(err)) {
                        returnmessage.err = err;
                    } else {
                        returnmessage.err = JSON.stringify(err);
                    }
                    reject(returnmessage);
                }
            } else {
                returnmessage.err = `机器：${formjson.username}断开连接`;
                reject(returnmessage);
            }
        }
    })
}

/*
    导入EDI，更新对应的几个表
*/
module.exports.updateEDINO = function (formjson) {
    return new Promise((resolve, reject) => {
        var id = "";
        let returnmessage = {};
        let thisdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
        let listdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
        thisdatetime = transdate.transdate(thisdatetime);
        listdatetime = transdate.transdatecn(listdatetime);
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == formjson.username && globalclients[j].signunit == formjson.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            returnmessage.EDI_NO = formjson.EDI_NO ? formjson.EDI_NO : '';
            try {
                // console.log(formjson);
                let formhead = transformservice.transformhead(formjson);
                formhead = encryptservice.encryptFormHead(formhead);
                let formlist = encryptservice.encryptFormList(formjson.formlist);
                let formcert = formjson.attachinfo;
                if (formcert != "") {
                    if (!_.isArray(formcert)) {
                        formcert = JSON.parse(formcert);
                    }
                } else {
                    formcert = [];
                }
                let container = formjson.container ? formjson.container : [];
                let certlist = formjson.certlist ? formjson.certlist : [];
                let updateformhead = `update Form_Head set ie_flag='${formhead.ie_flag}',pre_entry_id='${formhead.pre_entry_id}',customs_id='${formhead.pre_entry_id}',manual_no='${formhead.manual_no}',contr_no='${formhead.contr_no}',i_e_date='${formhead.i_e_date}',d_date='${formhead.d_date}',trade_co='${formhead.trade_co}',trade_name='${formhead.trade_name}',owner_code='${formhead.owner_code}',owner_name='${formhead.owner_name}',agent_code='${formhead.agent_code}',agent_name='${formhead.agent_name}',traf_mode='${formhead.traf_mode}',traf_name='${formhead.traf_name}',voyage_no='${formhead.voyage_no}',bill_no='${formhead.bill_no}',trade_mode='${formhead.trade_mode}',cut_mode='${formhead.cut_mode}',in_ratio='${formhead.in_ratio}',pay_way='${formhead.pay_way}',lisence_no='${formhead.lisence_no}',trade_country='${formhead.trade_country}',distinate_port='${formhead.distinate_port}',district_code='${formhead.district_code}',appr_no='${formhead.appr_no}',trans_mode='${formhead.trans_mode}',fee_mark='${formhead.fee_mark}',fee_rate='${formhead.fee_rate}',fee_curr='${formhead.fee_curr}',insur_mark='${formhead.insur_mark}',insur_rate='${formhead.insur_rate}',insur_curr='${formhead.insur_curr}',other_mark='${formhead.other_mark}',other_rate='${formhead.other_rate}',other_curr='${formhead.other_curr}',pack_no='${formhead.pack_no}',wrap_type='${formhead.wrap_type}',gross_wt='${formhead.gross_wt}',net_wt='${formhead.net_wt}',type_er='${formhead.type_er}',username='${formhead.username}',RaDeclNo='${formhead.RaDeclNo}',RaManualNo='${formhead.RaManualNo}',StoreNo='${formhead.StoreNo}',PrdtID='${formhead.PrdtID}',i_e_port='${formhead.i_e_port}',note_s='${formhead.note_s}',print_date='${formhead.print_date}',SUP_FLAG='${formhead.SUP_FLAG}',CollectTax='${formhead.CollectTax}',Two_Audit='${formhead.Two_Audit}',chk_surety='${formhead.chk_surety}',BILL_TYPE='${formhead.BILL_TYPE}',PaperLessTax='${formhead.PaperLessTax}',Tax_Amount='${formhead.Tax_Amount}',is_status_old='${formhead.is_status_old}',Tax_No='${formhead.Tax_No}',CBE='${formhead.CBE}',TRADE_CO_SCC='${formhead.TRADE_CO_SCC}',AGENT_CODE_SCC='${formhead.AGENT_CODE_SCC}',OWNER_CODE_SCC='${formhead.OWNER_CODE_SCC}',PROMISE_ITMES='${formhead.PROMISE_ITMES}',TRADE_AREA_CODE='${formhead.TRADE_AREA_CODE}',EDI_REMARK_2='${formhead.EDI_REMARK_2}',EDI_NO='${formhead.EDI_NO}',COP_NO='${formhead.COP_NO}',del_flag='0' where EDI_NO='${formhead.EDI_NO}' and COP_NO='${formhead.COP_NO}' and is_status='5' and pre_entry_id=EDI_NO and create_date>'${thisdatetime}';`;
                let freeformlist = `delete from Form_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let freeformcert = `delete from Form_Cert where PRE_ENTRY_ID='${formjson.pre_entry_id}';`;
                let freecontainer = `delete from Container_number where pre_entry_id='${formjson.pre_entry_id}';`;
                let freecertlist = `delete from Cert_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let countformlist = `select count(*) from Form_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let countformcert = `select count(*) from Form_Cert where PRE_ENTRY_ID='${formjson.pre_entry_id}';`;
                let countcontainer = `select count(*) from Container_number where pre_entry_id='${formjson.pre_entry_id}';`;
                let countcertlist = `select count(*) from Cert_List where pre_entry_id='${formjson.pre_entry_id}';`;
                // console.log(formlist);
                formlist = transformservice.transformlist(formlist, formhead);
                let updateformlist = '';
                let updateformcert = '';
                let updatecontainer = '';
                let updatecertlist = '';
                for (var i = 0; i < formlist.length; i++) {
                    var listsql = ` insert into Form_List values (`
                    for (var key in formlist[i]) {
                        listsql += (`'${formlist[i][key]}',`);
                    }
                    listsql = listsql.substring(0, (listsql.length - 1)) + ');'
                    updateformlist += listsql;
                }
                if (formcert.length != 0) {
                    formcert = transformservice.transformcert(formcert, formhead);
                    for (var i = 0; i < formcert.length; i++) {
                        var listsql = ` insert into Form_Cert (PRE_ENTRY_ID,FILE_NAME,FILE_TYPE,FORMAT_TYPE,OPNOTE,EDOCCOPID,EDOCOWNERCODE,EdocOwnerName,SIGNUNIT,SIGNTIME,GROUP_ID,TRADE_FILE_NAME,DECL_CODE,DECL_NAME,FILE_DIGEST,SIGN_CERT,FILE_SIGN,DATA_STATUS,DECL_TYPE,SEND_TIME,CREATE_TIME,EDI_NO) values (`
                        for (var key in formcert[i]) {
                            listsql += (`'${formcert[i][key]}',`);
                        }
                        listsql = listsql.substring(0, (listsql.length - 1)) + ');'
                        updateformcert += listsql;
                    }
                }
                if (container.length != 0) {
                    container = transformservice.transcontainer(container, formhead);
                    for (var i = 0; i < container.length; i++) {
                        var listsql = ` insert into Container_number values (`
                        for (var key in container[i]) {
                            listsql += (`'${container[i][key]}',`);
                        }
                        listsql = listsql.substring(0, (listsql.length - 1)) + ');'
                        updatecontainer += listsql;
                    }
                }
                if (certlist.length != 0) {
                    certlist = transformservice.transcertlist(certlist, formhead);
                    for (var i = 0; i < certlist.length; i++) {
                        certlist[i].order_no = `${i}`;
                        var listsql = ` insert into Cert_List values (`
                        for (var key in certlist[i]) {
                            listsql += (`'${certlist[i][key]}',`);
                        }
                        listsql = listsql.substring(0, (listsql.length - 1)) + ');'
                        updatecertlist += listsql;
                    }
                }
                let updatesql = freeformlist + updateformlist + freeformcert + updateformcert + freecontainer + updatecontainer + freecertlist + updatecertlist;
                async.waterfall([
                    function (callback) {
                        let formheadvaild = vaildservice.vaildformhead(formhead);
                        if (formheadvaild == 'ok') {
                            callback(null, 'ok')
                        } else {
                            callback('formead' + formheadvaild);
                        }
                    },
                    function (vaild, callback) {
                        let formlistvaild = vaildservice.vaildformlist(formlist);
                        if (formlistvaild == 'ok') {
                            callback(null, 'ok')
                        } else {
                            callback('formlist' + formlistvaild);
                        }
                    },
                    function (vaild, callback) {
                        if (certlist.length > 0) {
                            let certlistvaild = vaildservice.vaildcertlist(certlist);
                            if (certlistvaild == 'ok') {
                                callback(null, 'ok')
                            } else {
                                callback('certlist' + certlistvaild);
                            }
                        } else {
                            callback(null, 'certlist');
                        }
                    },
                    function (vaild, callback) {
                        if (container.length > 0) {
                            let containervaild = vaildservice.vaildcontainer(container);
                            if (containervaild == 'ok') {
                                callback(null, 'ok')
                            } else {
                                callback('container' + containervaild);
                            }
                        } else {
                            callback(null, 'container');
                        }
                    },
                    function (vaild, callback) {
                        globalsocket.sockets[id].emit('modify', updateformhead, formheadcb => {
                            if (formheadcb == 1) {
                                console.log(`formhead 更新了 ${formheadcb} 条`);
                                callback(null, formheadcb)
                            } else {
                                callback(formheadcb);
                            }
                        })
                    },
                    function (formheadcb, callback) {
                        globalsocket.sockets[id].emit('modify_bulk', updatesql, formcb => {
                            formcb = JSON.parse(formcb);
                            let sqlarr = updatesql.split(';');
                            let cbarr = [];
                            for (var i = 0; i < formcb.length; i++) {
                                let fo = {};
                                fo.sql = sqlarr[i];
                                fo.result = formcb[i];
                                cbarr.push(fo);
                            }
                            async.mapSeries(cbarr, function (mess, call) {
                                if (mess.result.length > 3) {
                                    call(mess);
                                } else {
                                    call(null, mess);
                                }
                            }, function (err, result) {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, result);
                                }
                            })
                        })
                    },
                    function (formcb, callback) {
                        globalsocket.sockets[id].emit('select', countformlist, formlistcb => {
                            if (formlistcb.Expr1000 == formjson.formlist.length) {
                                console.log(`formlistcb 更新了 ${formlistcb.Expr1000} 条`);
                                callback(null, formlistcb);
                            } else {
                                callback('formlist品名插入失败');
                            }
                        })
                    },
                    function (formlistcb, callback) {
                        globalsocket.sockets[id].emit('select', countformcert, formcertcb => {
                            if (formcertcb.Expr1000 == formjson.attachinfo.length) {
                                console.log(`formcertcb 更新了 ${formcertcb.Expr1000} 条`);
                                callback(null, formcertcb);
                            } else {
                                callback('formcert插入失败');
                            }
                        })
                    },
                    function (formcertcb, callback) {
                        globalsocket.sockets[id].emit('select', countcontainer, containercb => {
                            if (containercb.Expr1000 == formjson.container.length) {
                                console.log(`containercb 更新了 ${containercb.Expr1000} 条`);
                                callback(null, containercb);
                            } else {
                                callback('container插入失败');
                            }
                        })
                    },
                    function (containercb, callback) {
                        globalsocket.sockets[id].emit('select', countcertlist, certlistcb => {
                            if (certlistcb.Expr1000 == formjson.certlist.length) {
                                console.log(`certlistcb 更新了 ${certlistcb.Expr1000} 条`);
                                callback(null, certlistcb);
                            } else {
                                callback('certlist插入失败');
                            }
                        })
                    },
                ], function (err, result) {
                    if (err) {
                        if (!_.isArray(err)) {
                            returnmessage.err = err;
                        } else {
                            returnmessage.err = JSON.stringify(err);
                        }
                        reject(returnmessage)
                    } else {
                        returnmessage.success = `${formjson.pre_entry_id}导入成功`;
                        resolve(returnmessage);
                    }
                })
            } catch (err) {
                console.error('更新:', err);
                if (!_.isArray(err)) {
                    returnmessage.err = err;
                } else {
                    returnmessage.err = JSON.stringify(err);
                }
                reject(returnmessage);
            }
        } else {
            returnmessage.err = `机器：${formjson.username}断开连接`;
            reject(returnmessage);
        }
    })
}

/*
    根据EDI_NO和COP_NO释放EDI_NO
*/
module.exports.freeEDINO = function (formjson) {
    return new Promise((resolve, reject) => {
        var id = "";
        let returnmessage = {};
        let thisdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
        let listdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
        thisdatetime = transdate.transdate(thisdatetime);
        listdatetime = transdate.transdatecn(listdatetime);
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == formjson.username && globalclients[j].signunit == formjson.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                let isformhead = `select top 1 * from Form_Head where COP_NO = '${formjson.COP_NO}' and create_date>'${thisdatetime}';`;
                let freeformhead = `update Form_Head set del_flag='',manual_no='',contr_no='',d_date='',trade_co='',trade_name='',i_e_date='',traf_name='',COP_NO='',owner_code='',owner_name='' where COP_NO='${formjson.COP_NO}' and create_date>'${thisdatetime}';`;
                let freeformlist = `delete from Form_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let freeformcert = `delete from Form_Cert where PRE_ENTRY_ID='${formjson.pre_entry_id}';`;
                let freecontainer = `delete from Container_number where pre_entry_id='${formjson.pre_entry_id}';`;
                let freecertlist = `delete from Cert_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let deletesql = freeformlist + freeformcert + freecontainer + freecertlist;
                let countformlist = `select count(*) from Form_List where pre_entry_id='${formjson.pre_entry_id}';`;
                let countformcert = `select count(*) from Form_Cert where PRE_ENTRY_ID='${formjson.pre_entry_id}';`;
                let countcontainer = `select count(*) from Container_number where pre_entry_id='${formjson.pre_entry_id}';`;
                let countcertlist = `select count(*) from Cert_List where pre_entry_id='${formjson.pre_entry_id}';`;
                async.waterfall([
                    function (callback) {
                        globalsocket.sockets[id].emit('select', isformhead, formdata => {
                            if (formdata) {
                                if (formjson.COP_NO == formdata.COP_NO && formjson.EDI_NO == formdata.EDI_NO && formdata.is_status == '5') {
                                    callback(null, formdata);
                                } else if (formjson.COP_NO == formdata.COP_NO && formjson.EDI_NO == formdata.EDI_NO && formdata.is_status != '5') {
                                    callback(`${formjson.COP_NO}已发送`);
                                } else {
                                    callback(`${formjson.COP_NO}失败`);
                                }
                            } else {
                                callback(`'${formjson.COP_NO}错误`);
                            }
                        })
                    },
                    function (formdata, callback) {
                        globalsocket.sockets[id].emit('modify', freeformhead, formheadcb => {
                            if (formheadcb == 1) {
                                callback(null, formheadcb);
                            } else {
                                callback(`update ${formjson.COP_NO} formhead 失败`);
                            }
                        })
                    },
                    function (formheadcb, callback) {
                        globalsocket.sockets[id].emit('modify_bulk', deletesql, formcb => {
                            formcb = JSON.parse(formcb);
                            let sqlarr = deletesql.split(';');
                            let cbarr = [];
                            for (var i = 0; i < formcb.length; i++) {
                                let fo = {};
                                fo.sql = sqlarr[i];
                                fo.result = formcb[i];
                                cbarr.push(fo);
                            }
                            async.mapSeries(cbarr, function (mess, call) {
                                if (mess.result.length > 3) {
                                    call(mess);
                                } else {
                                    call(null, mess);
                                }
                            }, function (err, result) {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, result);
                                }
                            })
                        })
                    },
                    function (formcb, callback) {
                        globalsocket.sockets[id].emit('select', countformlist, formlistcb => {
                            if (formlistcb.Expr1000 == 0) {
                                callback(null, formlistcb);
                            } else {
                                callback('formlist删除失败');
                            }
                        })
                    },
                    function (formlistcb, callback) {
                        globalsocket.sockets[id].emit('select', countformcert, formcertcb => {
                            if (formcertcb.Expr1000 == 0) {
                                callback(null, formcertcb);
                            } else {
                                callback('formcert删除失败');
                            }
                        })
                    },
                    function (formcertcb, callback) {
                        globalsocket.sockets[id].emit('select', countcontainer, containercb => {
                            if (containercb.Expr1000 == 0) {
                                callback(null, containercb);
                            } else {
                                callback('container删除失败');
                            }
                        })
                    },
                    function (containercb, callback) {
                        globalsocket.sockets[id].emit('select', countcertlist, certlistcb => {
                            if (certlistcb.Expr1000 == 0) {
                                callback(null, certlistcb);
                            } else {
                                callback('certlist删除失败');
                            }
                        })
                    },
                ], function (err, result) {
                    if (err) {
                        if (!_.isArray(err)) {
                            returnmessage.err = err;
                        } else {
                            returnmessage.err = JSON.stringify(err);
                        }
                        reject(returnmessage)
                    } else {
                        returnmessage.success = `${formjson.COP_NO}删除成功`
                        resolve(returnmessage);
                    }
                })
            } catch (err) {
                console.error('释放:', err);
                if (!_.isArray(err)) {
                    returnmessage.err = err;
                } else {
                    returnmessage.err = JSON.stringify(err);
                }
                reject(returnmessage);
            }
        } else {
            returnmessage.err = `机器：${formjson.username}断开连接`;
            reject(returnmessage);
        }
    })
}

/*
    下载随附单据
*/
module.exports.download = function (pdfjson, mesEDI_NO, username, agentCode) {
    return new Promise((resolve, reject) => {
        var id = "";
        let returnmessage = {};
        returnmessage.EDI_NO = mesEDI_NO.EDI_NO;
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == username && globalclients[j].signunit == agentCode) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                async.mapSeries(pdfjson, function (json, callback) {
                    let datapath = json.fileurl.substring(20);
                    let filename = json.filename;
                    const options = {
                        uri: encodeURI(`${pdfhost}${datapath}`),
                        json: true, // Automatically parses the JSON string in the response,
                        timeout: 3000,
                    };
                    request(options, (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            // console.log('得到pdf接口正确指令，返回的是：', body);
                            let filepath = pdfpath + body;
                            fs.readFile(filepath, (err, data) => {
                                globalsocket.sockets[id].emit('getpdf', filename, data, cb => {
                                    if (cb == 'downloadfinish') {
                                        fs.exists(filepath, function (exists) {
                                            if (exists) {
                                                console.log(filename + "文件存在1");
                                                fs.unlinkSync(filepath);
                                                callback(null, cb);
                                            } else {
                                                console.log(filename + "文件不存在1")
                                                callback(null, cb);
                                            }
                                        })
                                    } else {
                                        console.error("pdf", cb);
                                        fs.exists(filepath, function (exists) {
                                            if (exists) {
                                                // console.log(filename + "文件存在2D");
                                                fs.unlinkSync(filepath);
                                                callback(cb);
                                            } else {
                                                // console.log(filename + "文件不存在2D")
                                                callback(cb);
                                            }
                                        })
                                    }
                                })
                            })
                        } else if (error) {
                            console.error('得到pdf接口错误指令，返回的是：', error);
                            callback(error);
                        } else {
                            console.error('得到pdf接口错误指令，返回的是：', body);
                            callback(body);
                        }
                    });
                }, function (err, result) {
                    if (err) {
                        if (!_.isArray(err)) {
                            returnmessage.err = err;
                        } else {
                            returnmessage.err = JSON.stringify(err);
                        }
                        reject(err);
                    } else {
                        if (mesEDI_NO) {
                            returnmessage = mesEDI_NO;
                            resolve(returnmessage);
                        } else {
                            returnmessage.success = result;
                            resolve(returnmessage);
                        }
                    }
                })
            } catch (err) {
                console.error('下载：', err);
                if (!_.isArray(err)) {
                    returnmessage.err = err;
                } else {
                    returnmessage.err = JSON.stringify(err);
                }
                reject(returnmessage);
            }
        } else {
            returnmessage.err = `机器：${pdfjson[0].username}断开连接`;
            reject(returnmessage);
        }
    })
}



/*
    根据EDI_NO查询formhead、formlist、container、certlist
*/
module.exports.getFormHead = function (formjson) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == formjson.username && globalclients[j].signunit == formjson.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                async.waterfall([
                    function (callback) {
                        let isformhead = `select count(*) from Form_Head where pre_entry_id = '${formjson.EDI_NO}';`;
                        globalsocket.sockets[id].emit('select', isformhead, formheadcb => {
                            if (formheadcb.Expr1000 > 1) {
                                callback(`${formjson.EDI_NO}存在多个`);
                            } else {
                                callback(null, null);
                            }
                        })
                    },
                    function (data, callback) {
                        let getformhead = `SELECT ie_flag,pre_entry_id,customs_id,manual_no,contr_no,i_e_date,d_date,trade_co,trade_name,owner_code,owner_name,agent_code,agent_name,traf_mode,traf_name,
    voyage_no,bill_no,trade_mode,cut_mode,in_ratio,pay_way,lisence_no,trade_country,distinate_port,district_code,appr_no,trans_mode,fee_mark,fee_rate,fee_curr,insur_mark,insur_rate,
    insur_curr,other_mark,other_rate,other_curr,pack_no,wrap_type,gross_wt,net_wt,ex_source,type_er,entry_group,is_status,username,create_date,del_flag,RaDeclNo,RaManualNo,StoreNo,PrdtID,
    i_e_port,note_s,print_date,SUP_FLAG,CollectTax,Two_Audit,chk_surety,BILL_TYPE,PaperLessTax,Tax_Amount,is_status_old,Tax_No,CBE,TRADE_CO_SCC,AGENT_CODE_SCC,OWNER_CODE_SCC,PROMISE_ITMES,
    TRADE_AREA_CODE,EDI_REMARK_2,EDI_NO,COP_NO,DECL_PORT from Form_Head where pre_entry_id = '${formjson.EDI_NO}';`;
                        globalsocket.sockets[id].emit('select', getformhead, formheadcb => {
                            if (formheadcb) {
                                callback(null, encryptservice.decryptFormHead(formheadcb));
                            } else {
                                callback(`${formjson.EDI_NO}没有formhead`);
                            }
                        })
                    },
                    function (formheadcb, callback) {
                        let getformlist = `SELECT pre_entry_id,g_no,code_t,code_s,g_name,g_model,qty_1,g_unit,decl_price,trade_total,trade_curr,qty_conv,unit_1,ver_no,prdt_no,use_to,origin_country,contr_item,qty_2,
  unit_2,duty_mode,work_usd,create_date,entry_group,FORM_LIST_GUID,SUP_TYPE,DESTINATION_COUNTRY from Form_List where pre_entry_id = '${formheadcb.pre_entry_id}'`;
                        globalsocket.sockets[id].emit('selectarray', getformlist, formlistcb => {
                            if (formlistcb != "") {
                                if (!_.isArray(formlistcb)) {
                                    formlistcb = encryptservice.decryptFormList(JSON.parse(formlistcb));
                                }
                            } else {
                                formlistcb = [];
                            }
                            formheadcb.formlist = formlistcb;
                            callback(null, formheadcb);
                        })
                    },
                    function (formheadcb, callback) {
                        let getcertlist = `SELECT pre_entry_id,order_no,docu_code,cert_code from Cert_List where pre_entry_id = '${formheadcb.pre_entry_id}'`;
                        globalsocket.sockets[id].emit('selectarray', getcertlist, certlistcb => {
                            if (certlistcb != "") {
                                if (!_.isArray(certlistcb)) {
                                    certlistcb = JSON.parse(certlistcb);
                                }
                            } else {
                                certlistcb = [];
                            }
                            formheadcb.certlist = certlistcb;
                            callback(null, formheadcb);
                        })
                    },
                    function (formheadcb, callback) {
                        let getcontainer = `SELECT pre_entry_id,order_no,container_no,container_model,container_wt from Container_number where pre_entry_id = '${formheadcb.pre_entry_id}'`;
                        globalsocket.sockets[id].emit('selectarray', getcontainer, containercb => {
                            if (containercb != "") {
                                if (!_.isArray(containercb)) {
                                    containercb = JSON.parse(containercb);
                                }
                            } else {
                                containercb = [];
                            }
                            formheadcb.container = containercb;
                            callback(null, formheadcb);
                        })
                    }
                ],
                    function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${pdfjson[0].agent_code} 机器名：${pdfjson[0].username}  no such connection`);
        }
    })
}


/*
    根据EDI_NO查询formhed、formlist、customsresult；
*/
module.exports.getCustomsResults = function (ENTRY_ID, EDI_NO, username, agent_code) {
    return new Promise((resolve, reject) => {
        var id = "";
        let thisdatetime = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);
        let listdatetime = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);
        thisdatetime = transdate.transdate(thisdatetime);
        listdatetime = transdate.transdatecn(listdatetime);
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == username && globalclients[j].signunit == agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                async.waterfall([
                    function (callback) {
                        let isformhead = `select count(*) from Form_Head where EDI_NO = '${EDI_NO}';`;
                        globalsocket.sockets[id].emit('select', isformhead, formheadcb => {
                            if (formheadcb.Expr1000 > 1) {
                                callback(`${formjson.EDI_NO}存在多个`);
                            } else {
                                callback(null, null);
                            }
                        })
                    },
                    function (data, callback) {
                        let getformhead = `SELECT ie_flag,pre_entry_id,customs_id,manual_no,contr_no,i_e_date,d_date,trade_co,trade_name,owner_code,owner_name,agent_code,agent_name,traf_mode,traf_name,
    voyage_no,bill_no,trade_mode,cut_mode,in_ratio,pay_way,lisence_no,trade_country,distinate_port,district_code,appr_no,trans_mode,fee_mark,fee_rate,fee_curr,insur_mark,insur_rate,
    insur_curr,other_mark,other_rate,other_curr,pack_no,wrap_type,gross_wt,net_wt,ex_source,type_er,entry_group,is_status,username,create_date,del_flag,RaDeclNo,RaManualNo,StoreNo,PrdtID,
    i_e_port,note_s,print_date,SUP_FLAG,CollectTax,Two_Audit,chk_surety,BILL_TYPE,PaperLessTax,Tax_Amount,is_status_old,Tax_No,CBE,TRADE_CO_SCC,AGENT_CODE_SCC,OWNER_CODE_SCC,PROMISE_ITMES,
    TRADE_AREA_CODE,EDI_REMARK_2,EDI_NO,COP_NO,DECL_PORT from Form_Head where EDI_NO = '${EDI_NO}' and create_date>'${thisdatetime}';`;
                        globalsocket.sockets[id].emit('select', getformhead, formheadcb => {
                            if (formheadcb) {
                                if(formheadcb.error){
                                    callback(formheadcb.error);
                                } else
                                if (ENTRY_ID == EDI_NO) {
                                    callback(EDI_NO);
                                } else {
                                    formheadcb.pre_entry_id = ENTRY_ID;
                                    callback(null, encryptservice.decryptFormHead(formheadcb));
                                }
                            } else {
                                console.error('回执查询的formhead有错：', formheadcb);
                                callback(`${EDI_NO}找不到该报关单`);
                            }
                        })
                    },
                    function (formheadcb, callback) {
                        let getformlist = `SELECT pre_entry_id,g_no,code_t,code_s,g_name,g_model,qty_1,g_unit,decl_price,trade_total,trade_curr,qty_conv,unit_1,ver_no,prdt_no,use_to,origin_country,contr_item,qty_2,
  unit_2,duty_mode,work_usd,create_date,entry_group,FORM_LIST_GUID,SUP_TYPE,DESTINATION_COUNTRY from Form_List where pre_entry_id = '${formheadcb.pre_entry_id}' and create_date > '${listdatetime}';`;
                        globalsocket.sockets[id].emit('selectarray', getformlist, formlistcb => {
                            if (formlistcb != "") {
                                if (!_.isArray(formlistcb)) {
                                    formlistcb = encryptservice.decryptFormList(JSON.parse(formlistcb));
                                }
                                if (formlistcb.error) {
                                    console.error(formlistcb.error)
                                    callback(formlistcb.error)
                                } else {
                                    formheadcb.formlist = formlistcb;
                                    callback(null, formheadcb);
                                }
                            } else {
                                formlistcb = [];
                                formheadcb.formlist = formlistcb;
                                callback(null, formheadcb);
                            }

                        })
                    },
                    function (formheadcb, callback) {
                        let getcertlist = `SELECT pre_entry_id,order_no,docu_code,cert_code from Cert_List where pre_entry_id = '${formheadcb.pre_entry_id}'`;
                        globalsocket.sockets[id].emit('selectarray', getcertlist, certlistcb => {
                            if (certlistcb != "") {
                                if (!_.isArray(certlistcb)) {
                                    certlistcb = JSON.parse(certlistcb);
                                }
                                if (certlistcb.error) {
                                    console.error(certlistcb.error);
                                    callback(certlistcb.error)
                                } else {
                                    formheadcb.certlist = certlistcb;
                                    callback(null, formheadcb);
                                }
                            } else {
                                certlistcb = [];
                                formheadcb.certlist = certlistcb;
                                callback(null, formheadcb);
                            }
                        })
                    },
                    function (formheadcb, callback) {
                        let getcontainer = `SELECT pre_entry_id,order_no,container_no,container_model,container_wt from Container_number where pre_entry_id = '${formheadcb.pre_entry_id}'`;
                        globalsocket.sockets[id].emit('selectarray', getcontainer, containercb => {
                            if (containercb != "") {
                                if (!_.isArray(containercb)) {
                                    containercb = JSON.parse(containercb);
                                }
                                if (containercb.error) {
                                    console.error(containercb.error);
                                    callback(containercb.error)
                                } else {
                                    formheadcb.container = containercb;
                                    callback(null, formheadcb);
                                }
                            } else {
                                containercb = [];
                                formheadcb.container = containercb;
                                callback(null, formheadcb);
                            }
                        })
                    },
                    // function (formheadcb, callback) {
                        // globalsocket.sockets[id].emit('uploadformcert', ENTRY_ID, (result) => {
                        //     if (result.substring(0, 3) != 'err') {
                        //         result = JSON.parse(result);
                        //         async.mapSeries(result, function (pdfdata, cb) {
                        //             // let bufferg = new Buffer(pdfdata.content, 'hex');
                        //             // console.log(bufferg)
                        //             try {
                        //                 var ftpobj = {
                        //                     buffergg: pdfdata.content,
                        //                     filename: pdfdata.name,
                        //                     username: username,
                        //                     agent_code: agent_code,
                        //                 }
                        //                 sendService.postftppdf(ftpobj, fn => {
                        //                     if (fn.status == 'Error') {
                        //                         cb(fn);
                        //                     } else {
                        //                         cb(null, fn)
                        //                     }
                        //                 })
                        //             } catch (err) {
                        //                 cb(err);
                        //             }
                        //         }, function (err, resu) {
                        //             if (err) {
                        //                 callback(err);
                        //             } else {
                        //                 callback(null, formheadcb);
                        //             }
                        //         })
                        //     } else {
                        //         callback(null, formheadcb);
                        //     }
                        // })
                    // }
                ],
                    function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${agent_code} 机器名：${username}  no such connection`);
        }
    })
}

/*
    根据时间跑回执触发
*/
module.exports.getCustomresult = function (data) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == data.username && globalclients[j].signunit == data.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                globalsocket.sockets[id].emit('getCustomresult', data.datetime, (result) => {
                    resolve(result);
                })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${data.agent_code} 机器名：${data.username}  no such connection`);
        }
    })

}


/*
    根据时间返回报关单号和EDI_NO的list
*/
module.exports.getEDIList = function (data) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == data.username && globalclients[j].signunit == data.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                let getedilist = `select top ${data.datasize} pre_entry_id,EDI_NO,create_date from Form_Head where create_date >= '${data.datatime}'`;
                globalsocket.sockets[id].emit('selectarray', getedilist, (edilist) => {
                    if (edilist != "") {
                        if (!_.isArray(edilist)) {
                            edilist = JSON.parse(edilist);
                            resolve(edilist);
                        }
                    } else {
                        edilist = [];
                        resolve(edilist);
                    }
                })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${data.agent_code} 机器名：${data.username}  no such connection`);
        }
    })

}

/*
    回传pdf
*/
module.exports.uploadformcert = function (data) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == data.username && globalclients[j].signunit == data.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                globalsocket.sockets[id].emit('uploadformcert', data.pre_entry_id, (result) => {
                    if (result.substring(0, 3) != 'err') {
                        result = JSON.parse(result);
                        async.mapSeries(result, function (pdfdata, cb) {
                            // let bufferg = new Buffer(pdfdata.content, 'hex');
                            // console.log(bufferg)
                            try {
                                var ftpobj = {
                                    buffergg: pdfdata.content,
                                    filename: pdfdata.name,
                                    username: data.username,
                                    agent_code: data.agent_code,
                                }
                                sendService.postftppdf(ftpobj, fn => {
                                    if (fn.status == 'Error') {
                                        cb(fn);
                                    } else {
                                        cb(null, fn)
                                    }
                                })
                            } catch (err) {
                                cb(err);
                            }
                        }, function (err, resu) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(resu);
                            }
                        })
                    } else {
                        callback(null, formheadcb);
                    }
                })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${data.agent_code} 机器名：${data.username}  no such connection`);
        }
    })

}


/*
    根据EDI_NO查询formhead状态
*/
module.exports.getstatus = function (EDI_NO, username, agent_code) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == username && globalclients[j].signunit == agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                async.waterfall([
                    function (callback) {
                        let isformhead = `select count(*) from Form_Head where EDI_NO = '${EDI_NO}';`;
                        globalsocket.sockets[id].emit('select', isformhead, formheadcb => {
                            if (formheadcb.Expr1000 > 1) {
                                callback(`${formjson.EDI_NO}存在多个`);
                            } else {
                                callback(null, null);
                            }
                        })
                    },
                    function (data, callback) {
                        let getformhead = `select * from Form_Head where EDI_NO = '${EDI_NO}';`;
                        globalsocket.sockets[id].emit('select', getformhead, formheadcb => {
                            if (formheadcb) {
                                callback(null, encryptservice.decryptFormHead(formheadcb));
                            } else {
                                console.error('回执查询的formhead有错：', formheadcb);
                                callback(`${EDI_NO}找不到该报关单`);
                            }
                        })
                    }
                ],
                    function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${agent_code} 机器名：${username}  no such connection`);
        }
    })
}

/**
 * 获取当前连接的EDI信息
 */
module.exports.getadlledilist = function (data) {
    return new Promise((resolve, reject) => {
        if (data.username == adminuser && data.password == adminpass) {
            resolve(globalclients);
        } else {
            reject('没有获取权限！');
        }
    })
}

/**
 * 获取改单信息
 */
module.exports.getDecresult = function (EntryId, username, agent_code) {
    return new Promise((resolve, reject) => {
        var id = "";
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == username && globalclients[j].signunit == agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                let decdata = {};
                async.waterfall([
                    function (callback) {
                        let getdecresult = `SELECT ObjectID,Reply_Time,Status,Note,DecModSeqNo,EntryId FROM DecMod_Result where EntryId = '${EntryId}';`;
                        globalsocket.sockets[id].emit('selectarray', getdecresult, decresultcb => {
                            if (decresultcb != "") {
                                if (!_.isArray(decresultcb)) {
                                    decresultcb = JSON.parse(decresultcb);
                                }
                            } else {
                                decresultcb = [];
                            }
                            decdata.decresult = decresultcb;
                            callback(null, decresultcb);
                        })
                    },
                    function (decresultcb, callback) {
                        let getdecrelation = `SELECT ObjectID,ENTRY_ID,FILE_NAME,FILE_TYPE,OPNOTE,FORMAT_TYPE,EDOCCOPID,EDOCOWNERCODE,EDOCOWNERNAME,SIGNUNIT,SIGNTIME,EDOCSIZE,BIZ_TYPE,TRADE_CODE,GROUP_ID,TRADE_FILE_NAME,DECL_TYPE,
        DECL_CODE,DECL_NAME,FILE_DIGEST,SIGN_CERT,FILE_SIGN,DATA_STATUS,CREATE_TIME 
        FROM DecMod_EdoRelation where ENTRY_ID = '${EntryId}'`;
                        globalsocket.sockets[id].emit('selectarray', getdecrelation, decrelationcb => {
                            if (decrelationcb != "") {
                                if (!_.isArray(decrelationcb)) {
                                    decrelationcb = JSON.parse(decrelationcb);
                                }
                            } else {
                                decrelationcb = [];
                            }
                            decdata.decrelation = decrelationcb;
                            callback(null, decrelationcb);
                        })
                    },
                    function (decrelationcb, callback) {
                        let getdechead = `SELECT ObjectID,DecModSeqNo,DecModType,EntryId,DecModNote,CheckMark,DecSeqNo,OperType,Status,Create_Time,Update_Time,EntOpName,EntOpTele,FeedDept,User_Name  
        FROM DecMod_Head where EntryId = '${EntryId}'`;
                        globalsocket.sockets[id].emit('selectarray', getdechead, decheadcb => {
                            if (decheadcb != "") {
                                if (!_.isArray(decheadcb)) {
                                    decheadcb = JSON.parse(decheadcb);
                                }
                            } else {
                                decheadcb = [];
                            }
                            decdata.dechead = decheadcb;
                            callback(null, decheadcb);
                        })
                    },
                    function (decheadcb, callback) {
                        async.mapSeries(decheadcb, function (head, call) {
                            let getdeclist = `SELECT ObjectID,ListType,Gno,FieldId,OldValue,NewValue  
        FROM DecMod_List where ObjectID = '${head.ObjectID}'`;
                            globalsocket.sockets[id].emit('selectarray', getdeclist, declistcb => {
                                if (declistcb != "") {
                                    if (!_.isArray(declistcb)) {
                                        declistcb = JSON.parse(declistcb);
                                    }
                                } else {
                                    declistcb = [];
                                }
                                head.declist = declistcb;
                                call(null, declistcb);
                            })
                        }, function (err, result) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, result);
                            }
                        })
                    }
                ],
                    function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(decdata);
                        }
                    })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${agent_code} 机器名：${username}  no such connection`);
        }
    })
}


/*
    根据重置formhead状态
*/
module.exports.reloadstatus = function (data) {
    return new Promise((resolve, reject) => {
        var id = "";
        let thisdatetime = new Date(new Date() - 14 * 24 * 60 * 60 * 1000);
        thisdatetime = transdate.transdate(thisdatetime);
        for (var j = 0; j < globalclients.length; j++) {
            if (globalclients[j].name == data.username && globalclients[j].signunit == data.agent_code) {
                id = globalclients[j].id;
            }
        }
        if (globalsocket.sockets[id]) {
            try {
                let statussql = `update Form_Head set is_status = '5' where EDI_NO = '${data.EDI_NO}' and create_date>'${thisdatetime}' and (is_status = '' or is_status is null);`;
                globalsocket.sockets[id].emit('modify', statussql, cb => {
                    if (cb == 1) {
                        resolve('修改完成!');
                    } else {
                        reject('修改失败!')
                    }
                })
            } catch (err) {
                reject(err);
            }
        } else {
            reject(`公司：${data.agent_code} 机器名：${data.username}  no such connection`);
        }
    })
}