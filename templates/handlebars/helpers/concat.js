module.exports = function() {
    var outStr = '';
    for(var arg in arguments){
        arguments[arg] = arguments[arg].toString();
        if(arguments[arg] !== '[object Object]'){
            if(arguments[arg] == 'base_url') {
                arguments[arg] = globals.base_url;
            }
            outStr += arguments[arg];
        }
    }
    return outStr;
};