var Handlebars = require('handlebars');

module.exports = function(epoch) {
    var dateObject = new Date(parseInt(epoch) * 1000);
    var ampm = 'AM';
    var day = pad(dateObject.getDate());
    var month = pad(dateObject.getMonth());
    var year = dateObject.getFullYear();
    var hour = pad(dateObject.getHours());
    var min = pad(dateObject.getMinutes());

    function pad(value) {
        if(value < 10) {
            return '0' + value;
        } else {
            return value;
        }
    }

    if(hour>= 12) {
        if(hour>12) hour -= 12;
        ampm= 'PM';
    }

    return month + '/' + day + '/' + year + ' ' + hour + ':' + min + ampm

};