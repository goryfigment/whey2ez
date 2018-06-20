module.exports = function(name_regex, item) {
    var re = /\{{.*?\}}/g;

    name_regex.replace(re, function(match) {
        var key = match.replace('{{', '').replace('}}', '');
        name_regex = name_regex.replace(match, item[key])
    });

    return name_regex;
};