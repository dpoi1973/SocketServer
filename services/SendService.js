/**
 * 发送队列service
 * 
 */

var i = 0;
var fs = require('fs');
const MQService = require('./RabbitService');
const config = require('config');
const resultqName = config.get('Common.ediCustomsResultQ');// 'edicustomsResults';
const formheadqName = config.get('Common.ediFormheadQ');// 'ediformhead';;
const decresultqName = config.get('Common.decResultQ');
const ftppdfqName = config.get('Common.ftpPdfQ');
const mqservice = new MQService(resultqName);

function SendService() {
}

SendService.prototype.postcustomsresult = (data, fn) => {
    console.log('send to queue', i++, resultqName);
    mqservice.sendToQueue(data, resultqName)
        .then((ok) => {
            fn({ status: 'OK' });
        })
        .catch((err) => {
            fn({ status: 'Error', err });
        });

    return this;
};

SendService.prototype.postformhead = (data, fn) => {
    console.log('send to queue', i++, formheadqName);
    mqservice.sendToQueue(data, formheadqName)
        .then((ok) => {
            fn({ status: 'OK' });
        })
        .catch((err) => {
            fn({ status: 'Error', err });
        });
    return this;
};

SendService.prototype.postdecresult = (data, fn) => {
    mqservice.sendToQueue(data, decresultqName)
        .then((ok) => {
            fn({ status: 'OK' });
        })
        .catch((err) => {
            fn({ status: 'Error', err });
        });

    return this;
};

SendService.prototype.postftppdf = (data, fn) => {
    mqservice.sendToQueue(data, ftppdfqName)
        .then((ok) => {
            fn({ status: 'OK' });
        })
        .catch((err) => {
            fn({ status: 'Error', err });
        });

    return this;
};

module.exports = exports = SendService;
