/**
 * 利用本地字段对数据的转换效验
 * 
 */

const fs = require('fs');
const trans = require('../common/transdateutil');
const uuidV1 = require('uuid');
const replaceAll = function (achar, charA, charB) {
    var rep = new RegExp(charA, "g");
    return achar.replace(rep, charB);
}
const tablenames = require('../common/tablename.json');

var globalclient = [];
exports.client = function (client) {
    globalclient = client;
};

exports.transformhead = function (formhead) {
    var forml = {};
    var formld = tablenames.formheadtablename;
    for (var key1 in formld) {
        for (var key2 in formhead) {
            if (key1 == "pre_entry_id") {
                forml[key1] = formhead.EDI_NO;
            } else if (key1 == key2) {
                forml[key1] = formhead[key2];
            }
        }
        if (!forml[key1]) {
            forml[key1] = formld[key1];
        }
    }
    return forml;
}


exports.transformlist = function (formlist, formhead) {
    var formlistnew = [];
    for (var i = 0; i < formlist.length; i++) {
        formlist[i].FORM_LIST_GUID = replaceAll(uuidV1(), "-", "");
        formlist[i].create_date = formlist[i]['create_date'].substring(0, 8);
        var forml = {};
        var formld = tablenames.formlisttablename;
        for (var key1 in formld) {
            for (var key2 in formlist[i]) {
                if (key1 == "pre_entry_id") {
                    forml[key1] = formhead.EDI_NO;
                } else if (key1 == key2) {
                    forml[key1] = formlist[i][key2];
                }
            }
            if (!forml[key1]) {
                forml[key1] = formld[key1];
            }
        }
        formlistnew.push(forml);
    }
    return formlistnew;
}

exports.transcertlist = function (certlist, formhead) {
    var certlistnew = [];
    for (var i = 0; i < certlist.length; i++) {
        var certl = {};
        var certld = tablenames.certlisttablename;
        for (var key1 in certld) {
            for (var key2 in certlist[i]) {
                if (key1 == "pre_entry_id") {
                    certl[key1] = formhead.EDI_NO;
                } else if (key1 == key2) {
                    certl[key1] = certlist[i][key2];
                }
            }
            if (!certl[key1]) {
                certl[key1] = certld[key1];
            }
        }
        certlistnew.push(certl);
    }
    return certlistnew;
}


exports.transcontainer = function (container, formhead) {
    var containernew = [];
    for (var i = 0; i < container.length; i++) {
        var conta = {};
        var contad = tablenames.containertablename;
        for (var key1 in contad) {
            for (var key2 in container[i]) {
                if (key1 == "pre_entry_id") {
                    conta[key1] = formhead.EDI_NO;
                } else if (key1 == key2) {
                    conta[key1] = container[i][key2];
                }
            }
            if (!conta[key1]) {
                conta[key1] = contad[key1];
            }
        }
        containernew.push(conta);
    }
    return containernew;
}

exports.transformcert = function (formcert, formhead) {
    var formcertnew = [];
    var client = {};
    for (var j = 0; j < globalclient.length; j++) {
        if (globalclient[j].name == formhead.username) {
            client.pdfpath = globalclient[j].pdfpath;
            client.formattype = globalclient[j].formattype;
            client.signunit = globalclient[j].signunit;
            client.declcode = globalclient[j].declcode;
            client.declname = globalclient[j].declname;
        }
    }
    for (var i = 0; i < formcert.length; i++) {
        transpdftypes(formcert[i].filetype, OBJ, (result) => {
            var pdffilename = formcert[i].filename;
            var pdffilepath = client.pdfpath + '\\' + pdffilename;
            var pdffiletype = "0000000" + result.substring(1, 2);
            if (pdffiletype == '0000000A') {
                pdffiletype = '00000008';
            }
            var formc = {};
            var formcd = tablenames.formcerttablename;
            for (var key1 in formcd) {
                if (key1 == "PRE_ENTRY_ID") {
                    formc[key1] = formhead.EDI_NO;
                } else if (key1 == "FILE_TYPE") {
                    formc[key1] = pdffiletype;
                } else if (key1 == "FORMAT_TYPE") {
                    formc[key1] = client.formattype;
                } else if (key1 == "SIGNUNIT") {
                    formc[key1] = client.signunit;
                } else if (key1 == "SIGNTIME") {
                    formc[key1] = trans.transdatenode(new Date());
                } else if (key1 == "TRADE_FILE_NAME") {
                    formc[key1] = pdffilepath;
                } else if (key1 == "DATA_STATUS") {
                    formc[key1] = "0";
                } else if (key1 == "DECL_TYPE") {
                    formc[key1] = "F";
                } else if (key1 == "CREATE_TIME") {
                    formc[key1] = trans.transdate(new Date());
                } else if (key1 == "EDOCCOPID") {
                    formc[key1] = pdffilename;
                } else if (key1 == "EDOCOWNERCODE") {
                    formc[key1] = formhead.trade_co;
                } else if (key1 == "EdocOwnerName") {
                    formc[key1] = formhead.trade_name;
                } else if (key1 == "DECL_CODE") {
                    formc[key1] = client.declcode;
                } else if (key1 == "DECL_NAME") {
                    formc[key1] = client.declname;
                } else {
                    formc[key1] = formcd[key1];
                }
            }
            formcertnew.push(formc);
        });
    }
    return formcertnew;
}



const OBJ = {
    发票: '_1',
    装箱单: '_2',
    提运单: '_3',
    合同: '_4',
    其他1: '_5',
    其他2: '_6',
    其他3: '_7',
    代理报关委托协议: '_8',
    电子代理委托协议: '_A',
    减免税货物税款担保证明: '_B',
    减免税货物税款担保延期证明: '_C',
};
function transpdftypes(str, OBJ, callback) {
    for (var key in OBJ) {
        if (key == str) {
            callback(OBJ[key]);
        }
    }
}