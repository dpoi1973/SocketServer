//维护单一进程
function processSendQueue() {
    if ((!globalProcessingflag)) {
        globalProcessingflag = true;
        if(maxdate<"20170201"){
            maxdate = "20170201";
        }
        if(istoday != maxdate.substring(0,8)){
            istoday = maxdate.substring(0,8);
            todaycount = 0;
        }
        start(maxdate,istoday)
            .then(ok => {
                globalProcessingflag = false;
                if (globalNeedProcessflag) {
                    globalNeedProcessflag = false;
                    processSendQueue();
                }
            })
            .catch(err => {
                logger.log('error', err);
                globalProcessingflag = false;
                if (globalNeedProcessflag) {
                    globalNeedProcessflag = false;
                    processSendQueue();
                }
            })
    }
    else
        globalNeedProcessflag = true;
}