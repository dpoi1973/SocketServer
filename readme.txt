-----这是对EDI导入导出系统的服务端------
socket.io配置和事件位于app.js
基础加解密方法、时间转换方法和维护表字段位于common里面
连接配置位于config里面
对外提供的http接口位于routes里面，ioconnect是登录验证
下面是service介绍：
DBServices ---  效验用户
EDIServices ---  EDI数据操作
encryptService --- 数据加解密
RabbitService --- 队列服务
transformService --- 本地数据效验转化
validatedService --- 数据字段长度效验

