module.exports = function(list, options) {
    if(list.length) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
};