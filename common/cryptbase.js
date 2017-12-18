/**
 * 加解密方法
 */

var crypto = require('crypto');
const key = 'adgaw334^*^&#$#$W2343qwreqwr12  '; //replace with your key
const iv = 'E4ghj*Ghg7!rNIfb'; //replace with your IV



exports.encryptstring = (inputstr) => {
    const cipher = crypto.createCipheriv('aes256', key, iv);
    var crypted = cipher.update(inputstr, 'utf8', 'base64');
    crypted += cipher.final('base64');
    return crypted;//.split("\u0004")[0];
};


exports.decryptstring = (inputstr) => {
    const decipher = crypto.createDecipheriv('aes256', key, iv);
    var decrypted = decipher.update(inputstr, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};





var fs = require('fs');


exports.writeFile = (data, filename) => {
    var content = JSON.stringify(data);
    fs.writeFile(filename, content, function (err) {
        if (err) {
            console.log("An error ocurred creating the file " + err.message)
        }
        console.log("The file has been succesfully saved");
    });
}


exports.readFile = (filepath, callback) => {
    fs.readFile(filepath, 'utf-8', function (err, data) {
        if (err) {
            console.log(err);
        } else {
            callback("ok", data);
        }
    });

}   