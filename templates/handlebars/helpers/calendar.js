module.exports = function(row, start_day, month_length, block) {
    var accum = '';

    if(row == 1) {
        var cellDate = (7 - (start_day - 1)) - row * 7;
    } else {
        cellDate = row * 7 - (7 + (start_day - 1));
    }

    for(var i = 0; i < 7; ++i) {
        if(cellDate <= 0 || cellDate > month_length) {
            accum += block.fn('');
        } else {
            accum += block.fn(cellDate);
        }

        cellDate += 1;
    }
    return accum;
};