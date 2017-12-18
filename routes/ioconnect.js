/**
 * 效验用户连接的返回
 * 
 */

const DBService = require('../services/DBServices');
const async = require('async');
const config = require('config');
const adminuser = config.get('Common.userName');
const adminpass = config.get('Common.passWord');

module.exports = (socket, next) => {
    const handshake = socket.handshake;
    //   console.log('begin authorization');
    if (handshake.query.username == adminuser && handshake.query.password == adminpass) {
        console.log('admin连接成功');
        next();
    } else {
        DBService.authEdiUser(handshake.query.zhidancompany, handshake.query.username)
            .then((data) => {
                if (data) {
                    next();
                } else {
                    next(new Error('用户不存在'));
                }
            })
            .catch((e) => {
                // console.error(e);
                // console.log('not authorization');
                next(new Error('用户不存在'));
            });
    }
};
