/**
 * 
 * 对获取到的formhead formlist的循环加解密
 */


var util = require('../common/cryptbase');

exports.encryptFormHead = function (data) {
    if (data.owner_code == null || data.owner_code == "") {
        data.owner_code = "";
    } else {
        data.owner_code = util.encryptstring(data.owner_code);
    }
    if (data.contr_no == null || data.contr_no == "") {
        data.contr_no = "";
    } else {
        data.contr_no = util.encryptstring(data.contr_no);
    }
    if (data.owner_name == null || data.owner_name == "") {
        data.owner_name = "";
    } else {
        data.owner_name = util.encryptstring(data.owner_name);
    }
    if (data.agent_code == null || data.agent_code == "") {
        data.agent_code = "";
    } else {
        data.agent_code = util.encryptstring(data.agent_code);
    }
    if (data.agent_name == null || data.agent_name == "") {
        data.agent_name = "";
    } else {
        data.agent_name = util.encryptstring(data.agent_name);
    }
    if (data.traf_mode == null || data.traf_mode == "") {
        data.traf_mode = "";
    } else {
        data.traf_mode = util.encryptstring(data.traf_mode);
    }
    if (data.traf_name == null || data.traf_name == "") {
        data.traf_name = "";
    } else {
        data.traf_name = util.encryptstring(data.traf_name);
    }
    return data;
}

exports.encryptFormList = function (data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].code_t == null || data[i].code_t == "") {
            data[i].code_t = "";
        } else {
            data[i].code_t = util.encryptstring(data[i].code_t);
        }
        if (data[i].code_s == null || data[i].code_s == "") {
            data[i].code_s = "";
        } else {
            data[i].code_s = util.encryptstring(data[i].code_s);
        }
        if (data[i].g_name == null || data[i].g_name == "") {
            data[i].g_name = "";
        } else {
            data[i].g_name = util.encryptstring(data[i].g_name);
        }
        if (data[i].g_model == null || data[i].g_model == "") {
            data[i].g_model = "";
        } else {
            data[i].g_model = util.encryptstring(data[i].g_model);
        }
        if (data[i].origin_country == null || data[i].origin_country == "") {
            data[i].origin_country = "";
        } else {
            data[i].origin_country = util.encryptstring(data[i].origin_country);
        }
    }
    return data;
}


exports.decryptFormHead = function (data) {
    //  for (var i = 0; i < data.length; i++) {
    if (data.owner_code == null || data.owner_code == "") {
        data.owner_code = "";
    } else {
        data.owner_code = util.decryptstring(data.owner_code);
    }
    if (data.contr_no == null || data.contr_no == "") {
        data.contr_no = "";
    } else {
        data.contr_no = util.decryptstring(data.contr_no);
    }
    if (data.owner_name == null || data.owner_name == "") {
        data.owner_name = "";
    } else {
        data.owner_name = util.decryptstring(data.owner_name);
    }
    if (data.agent_code == null || data.agent_code == "") {
        data.agent_code = "";
    } else {
        data.agent_code = util.decryptstring(data.agent_code);
    }
    if (data.agent_name == null || data.agent_name == "") {
        data.agent_name = "";
    } else {
        data.agent_name = util.decryptstring(data.agent_name);
    }
    if (data.traf_mode == null || data.traf_mode == "") {
        data.traf_mode = "";
    } else {
        data.traf_mode = util.decryptstring(data.traf_mode);
    }
    if (data.traf_name == null || data.traf_name == "") {
        data.traf_name = "";
    } else {
        data.traf_name = util.decryptstring(data.traf_name);
    }
    // }
    return data;
}


exports.decryptFormList = function (data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].code_t == null || data[i].code_t == "") {
            data[i].code_t = "";
        } else {
            data[i].code_t = util.decryptstring(data[i].code_t);
        }
        if (data[i].code_s == null || data[i].code_s == "") {
            data[i].code_s = "";
        } else {
            data[i].code_s = util.decryptstring(data[i].code_s);
        }
        if (data[i].g_name == null || data[i].g_name == "") {
            data[i].g_name = "";
        } else {
            data[i].g_name = util.decryptstring(data[i].g_name);
        }
        if (data[i].g_model == null || data[i].g_model == "") {
            data[i].g_model = "";
        } else {
            data[i].g_model = util.decryptstring(data[i].g_model);
        }
        if (data[i].origin_country == null || data[i].origin_country == "") {
            data[i].origin_country = "";
        } else {
            data[i].origin_country = util.decryptstring(data[i].origin_country);
        }
    }
    return data;
}