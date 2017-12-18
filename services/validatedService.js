/**
 * 效验表字段的长度
 * 
 */


const async = require('async');
const form_list = {
    g_unit: 3,
    trade_curr: 3,
    unit_1: 3,
    use_to: 2,
    contr_item: 4,
    unit_2: 3,
    duty_mode: 1,
    entry_group: 4,
    DESTINATION_COUNTRY: 3,
    create_date: 10
};

const form_head = {
    ie_flag: 1,
    trade_mode: 4,
    cut_mode: 3,
    pay_way: 1,
    trade_country: 3,
    distinate_port: 4,
    district_code: 5,
    trans_mode: 1,
    fee_mark: 1,
    fee_curr: 3,
    insur_mark: 1,
    insur_curr: 3,
    other_mark: 1,
    other_curr: 3,
    type_er: 4,
    entry_group: 4,
    del_flag: 1,
    i_e_port: 4,
    SUP_FLAG: 1,
    CollecTax: 1,
    Two_Audit: 1,
    chk_surety: 1,
    BILL_TYPE: 1,
    PaperLessTax: 1,
    CBE: 3,
    TRADE_AREA_CODE: 3,
    DECL_PORT: 4
}

const cert_list = {
    order_no: 4,
    docu_code: 1
}

const container_number = {
    order_no: 4,
    container_model: 1
}



const form_head_cn = {
    ie_flag: '申报类型',
    trade_mode: '经营单位',
    cut_mode: '征免性质',
    pay_way: 'pay_way',
    trade_country: '起运国',
    distinate_port: '装货港',
    district_code: '境内目的地',
    trans_mode: '成交方式',
    fee_mark: '运费',
    fee_curr: '运率',
    insur_mark: '保费',
    insur_curr: '保费',
    other_mark: '杂费',
    other_curr: '杂费',
    type_er: 'type_er',
    entry_group: 'entry_group',
    del_flag: 'del_flag',
    i_e_port: '进口口岸',
    SUP_FLAG: 'SUP_FLAG',
    CollecTax: '票据类型',
    Two_Audit: 'Two_Audit',
    chk_surety: 'chk_surety',
    BILL_TYPE: '清单类型',
    PaperLessTax: 'PaperLessTax',
    CBE: 'CBE',
    TRADE_AREA_CODE: '贸易国别',
    DECL_PORT: '申报口岸'
}

const form_list_cn = {
    g_unit: '申报单位',
    trade_curr: '币制',
    unit_1: '法定单位',
    use_to: 'use_to',
    contr_item: '新贸税号',
    unit_2: '第二单位',
    duty_mode: '征免方式',
    entry_group: 'entry_group',
    DESTINATION_COUNTRY: '目的国',
    create_date: 'create_date'
};

const cert_list_cn = {
    order_no: '项号',
    docu_code: '编号'
}

const container_number_cn = {
    order_no: '箱号',
    container_model: '规格'
}

exports.vaildformhead = function (formhead) {
    for (var key in form_head) {
        for (var key1 in formhead) {
            if (key == key1) {
                if (charlength(formhead[key1]) > form_head[key]) {
                    throw (form_head_cn[key] + '长度大于' + form_head[key]);
                }
            }
        }
    }
    return ('ok');
}

exports.vaildformlist = function (formlist) {
    for (var i = 0; i < formlist.length; i++) {
        for (var key in form_list) {
            for (var key1 in formlist[i]) {
                if (key == key1) {
                    if (charlength(formlist[i][key1]) > form_list[key]) {
                        throw (form_list_cn[key] + '长度大于' + form_list[key]);
                    }
                }
            }
        }
    }
    return ('ok');

}

exports.vaildcertlist = function (certlist) {
    for (var i = 0; i < certlist.length; i++) {
        for (var key in cert_list) {
            for (var key1 in certlist[i]) {
                if (key == key1) {
                    if (charlength(certlist[i][key1]) > cert_list[key]) {
                        throw (cert_list_cn[key] + '长度大于' + cert_list[key]);
                    }
                }
            }
        }
    }
    return ('ok');
}


exports.vaildcontainer = function (contianer) {
    for (var i = 0; i < contianer.length; i++) {
        for (var key in container_number) {
            for (var key1 in contianer[i]) {
                if (key == key1) {
                    if (charlength(contianer[i][key1]) > container_number[key]) {
                        throw (container_number_cn[key] + '长度大于' + container_number[key]);
                    }
                }
            }
        }
    }
    return ('ok');
}



function charlength(str) {
    var realLength = 0, len = str.length, charCode = -1;
    for (var i = 0; i < len; i++) {
        charCode = str.charCodeAt(i);
        if (charCode >= 0 && charCode <= 128) realLength += 1;
        else realLength += 2;
    }
    return realLength;
}