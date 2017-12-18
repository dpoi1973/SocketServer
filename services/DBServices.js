/**
 * 校验用户的方法
 * 
 */
'uses strict';

const request = require('request');
const config = require('config');

const host = config.get('Common.dbRESTHost');

module.exports.authEdiUser = function (agentcode, username) {
  if (!agentcode || agentcode == null || agentcode == undefined) {
    agentcode = '';
  }
  const condition = { where: { userName: username, agentCode: agentcode } };
  const url = `http://${host}/api/clientmodules/findOne?filter=${encodeURIComponent(JSON.stringify(condition))}`;
  const options = {
    uri: url,
    json: true, // Automatically parses the JSON string in the response,
    timeout: 1500,
  };
  return new Promise((resovle, reject) => {
    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        if (body.userName) {
          resovle(body);
        } else {
          reject('检查用户名！');
        }
      } else if (error) {
        reject(error);
      } else {
        reject(body)
      }
    });
  });
};
module.exports = exports;
