/**
 * 队列存储
 * 
 */
const config = require('config');

const mqConnStr = config.get('Common.mqServer');

const amqp = require('amqplib');

const open = amqp.connect(mqConnStr);

function mqSerivce(queueName) {
    this.qName = queueName;
    var tt = this;
    //   this.open=amqp.connect(mqConnStr);
    open.then((conn) => {
        conn.createChannel().then(ch => {
            tt.ch = ch;
        })
    })
}


mqSerivce.prototype.sendToQueue = function (data, qName) {
    var zz = this;
    const qname = this.queueName;
    return new Promise(function (resolve, reject) {
        // open.then((conn) => {
        //   return conn.createChannel();
        // }).then(ch => {
        var ch = zz.ch;
        ch.assertQueue(qName, { durable: true })
            .then(ok => {
                return ch.sendToQueue(qName, new Buffer(JSON.stringify(data)));
            })
            .then(ok => {
                if (ok)
                    resolve(true);
                else
                    reject(ok);
                //  })
            }).catch((e) => {
                reject(e);
            });
    });
};
module.exports = exports = mqSerivce;
