const app = require('express')();
const bodyParser = require('body-parser');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');
const config = require('config');
const _ = require('lodash');
const async = require('async');
const posthost = config.get('Common.postHost');
const adminuser = config.get('Common.userName');
const port = process.env.PORT || 8008;

const ioconnect = require('./routes/ioconnect');
const edirouter = require('./routes/edirouter');
const EDIService = require('./services/EDIServices');
const transformService = require('./services/transformService');
const SendService = require('./services/SendService');
const sendService = new SendService();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

server.listen(port);

app.engine('jade', require('jade').__express);

app.get('/', (req, res) => {
  res.render('indexx.jade');
});


app.use('/api', edirouter.defualtrouter);
const ioedis = io.of('/ediclients');
ioedis.use(ioconnect);

EDIService.socket(ioedis);
// edirouter.socket(ioedis);
let adminsocketid = '';
let ediClients = [];

ioedis.on('connection', (socket) => {
  socket.emit('hi', 'connected');
  let edimachine = {};
  let ediname = socket.handshake.query.username;
  let pdfpath = socket.handshake.query.pdfpath ? socket.handshake.query.pdfpath : '';
  let signunit = socket.handshake.query.zhidancompany ? socket.handshake.query.zhidancompany : '';
  let declcode = socket.handshake.query.cardno ? socket.handshake.query.cardno : '';
  let declname = socket.handshake.query.zhidanperson ? socket.handshake.query.zhidanperson : '';
  let formattype = 'US';
  let ediid = socket.id;
  let status = '监控中';
  let flag = true;
  if (ediname == adminuser) {
    flag = false;
    console.log('admin in ')
    adminsocketid = ediid;
  }
  //  else {
  //   socket.broadcast.to(adminsocketid).emit('log', ediClients);
  // }
  _.map(ediClients, (data) => {
    if (data.name == ediname) {
      for (let i = 0; i < ediClients.length; i++) {
        if (ediClients[i].name == ediname) {
          ediClients[i].id = ediid;
        }
      }
      flag = false;
    }
  });
  if (flag) {
    edimachine.name = ediname;
    edimachine.id = ediid;
    edimachine.pdfpath = pdfpath;
    edimachine.signunit = signunit;
    edimachine.declcode = declcode;
    edimachine.declname = declname;
    edimachine.formattype = formattype;
    ediClients.push(edimachine);
  }
  socket.on('disconnect', (data) => {
    for (let i = 0; i < ediClients.length; i++) {
      if (ediClients[i].id == socket.id) {
        console.log(ediClients[i].name, '断开连接')
        ediClients.splice(i, 1);
      }
    }
    console.log('连接中的客户端：', ediClients);
    // socket.broadcast.to(adminsocketid).emit('log', ediClients);
    // edirouter.ediClients(ediClients);
    EDIService.ediClients(ediClients);
    transformService.client(ediClients);
  });


  socket.on('hello', (data, fn) => {
    fn('ok');
  })

  EDIService.ediClients(ediClients);
  transformService.client(ediClients);
  console.log('连接中的客户端：', ediClients)

  socket.on('rsvinfo', function (customresult, cb) {
    console.log('收到客户端回执来自：', customresult.USERNAME, '内容是：', customresult.obj.ENTRY_ID, customresult.obj.EDI_NO, customresult.obj.CHANNEL);
    async.waterfall([
      function (callback) {
        if (customresult.obj.CHANNEL == 'L' || customresult.obj.CHANNEL == 'J') { // == 'L'
          if (customresult.obj.EDI_NO == 'EDI179000028706681') {
            callback(null, null)
          } else {
            EDIService.getCustomsResults(customresult.obj.ENTRY_ID, customresult.obj.EDI_NO, customresult.USERNAME, customresult.agent_code).then(result => {
              console.log('channel为L或J时成功得到formhead');
              sendService.postformhead(result, fn => {
                // console.log(fn);
                if (fn.status == 'Error') {
                  callback(fn);
                } else {
                  callback(null, fn)
                }
              })
            })
              .catch(err => {
                console.error('读取formhead失败，原因是：', err);
                callback(err);
              });
          }
        } else if (customresult.obj.CHANNEL == 'Z' || customresult.obj.CHANNEL == 'D') {
          EDIService.getDecresult(customresult.obj.ENTRY_ID, customresult.USERNAME, customresult.agent_code).then(result => {
            console.log('channel为Z或D时成功得到改单数据');
            sendService.postdecresult(result, fn => {
              // console.log(fn);
              if (fn.status == 'Error') {
                callback(fn);
              } else {
                callback(null, fn)
              }
            })
          })
        } else {
          callback(null, null);
        }
      },
      function (edistatus, callback) {
        var customsres = {};
        customsres.username = customresult.USERNAME;
        customsres.pre_Entry_ID = customresult.obj.ENTRY_ID;
        customsres.Entry_ID = customresult.obj.ENTRY_ID;
        customsres.Notice_Date = customresult.obj.NOTICE_DATE;
        customsres.Channel = customresult.obj.CHANNEL;
        customsres.Note = customresult.obj.NOTE;
        customsres.Decl_Port = customresult.obj.DECL_PORT;
        customsres.Agent_Name = customresult.obj.AGENT_NAME;
        customsres.Declare_No = customresult.obj.DECLARE_NO;
        customsres.Trade_Co = customresult.obj.TRADE_CO;
        customsres.Pack_No = customresult.obj.PACK_NO;
        customsres.Bill_No = customresult.obj.BILL_NO;
        customsres.Traf_Mode = customresult.obj.TRAF_MODE;
        customsres.Voyage_No = customresult.obj.VOYAGE_NO;
        customsres.Net_WT = customresult.obj.NET_WT;
        customsres.Cross_WT = customresult.obj.GROSS_WT;
        customsres.EDI_NO = customresult.obj.EDI_NO;
        customsres.TODO_FLAG = customresult.obj.TODO_FLAG ? customresult.obj.TODO_FLAG : '';
        customsres.SUP_RESULT_INFO = customresult.obj.SUP_RESULT_INFO ? customresult.obj.SUP_RESULT_INFO : '';
        customsres.CID = customresult.obj.ENTRY_ID + customresult.obj.NOTICE_DATE + customresult.obj.CHANNEL;
        if (customresult.obj.I_E_DATE && customresult.obj.I_E_DATE.length > 8) {
          customresult.obj.I_E_DATE = customresult.obj.I_E_DATE.replace('-', '').replace('-', '').substring(0, 8);
        }
        if (customresult.obj.D_DATE && customresult.obj.D_DATE.length > 8) {
          customresult.obj.D_DATE = customresult.obj.D_DATE.replace('-', '').replace('-', '').substring(0, 8);
        }
        customsres.I_E_Date = customresult.obj.I_E_DATE ? customresult.obj.I_E_DATE : '';
        customsres.D_Date = customresult.obj.D_DATE ? customresult.obj.D_DATE : '';
        sendService.postcustomsresult(customsres, fn => {
          if (fn.status == 'Error') {
            callback(fn);
          } else {
            callback(null, fn)
          }
        })
      }
    ], function (err, result) {
      if (err) {
        cb(err)
      } else {
        cb('finish');
      }
    })
  });
})


