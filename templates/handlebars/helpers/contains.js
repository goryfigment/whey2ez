module.exports = function(elem, list, options) {
    console.log(list)
    console.log(elem)
    if(list.indexOf(elem) > -1) {
        console.log(elem)
        console.log(list)
        return options.fn(this);
    }
    return options.inverse(this);
};