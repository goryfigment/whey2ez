function numberCommaFormat(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), replace);
}

function scrollToElement($container, $element, speed){
    var elementTop = $element.offset().top;
    var elementHeight = $element.height();
    var containerTop = $container.offset().top;
    var containerHeight = $container.height();

    if ((((elementTop - containerTop) + elementHeight) > 0) && ((elementTop - containerTop) < containerHeight)) {

    } else {
        $container.animate({
            scrollTop: $element.offset().top - $container.offset().top + $container.scrollTop()
        }, speed);
    }
}


function upAndDownPopups(keyCode, $popup, $options, scroll) {
    var $selected = $popup.find('.selected');
    var $firstOption = $options.filter(':visible').eq(0);
    var $lastOption = $options.filter(':visible').eq(-1);

    if (keyCode == 40) { //down arrow
        var $nextOption = $selected.nextAll($options).filter(':visible').first();
        if($selected.length) {
            $selected.removeClass('selected');
            if($nextOption.length){
                $nextOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $nextOption, 50);
                }
            } else{
                $firstOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $firstOption, 50);
                }
            }
        } else {
            $firstOption.addClass('selected');
            if(scroll) {
                scrollToElement($popup, $firstOption, 50);
            }
        }
    } else if (keyCode == 38) { //up arrow
        var $prevOption = $selected.prevAll($options).filter(':visible').first();
        if($selected.length) {
            $selected.removeClass('selected');
            if($prevOption.length){
                $prevOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $prevOption, 50);
                }
            }else{
                $lastOption.addClass('selected');
                if(scroll) {
                    scrollToElement($popup, $lastOption, 50);
                }
            }
        } else {
            $lastOption.addClass('selected');
            if(scroll) {
                scrollToElement($popup, $lastOption, 50);
            }
        }
    } else if(keyCode == 13) { //enter button
        $selected.trigger('click');
    }
}

function currencyFormat(cents) {
    cents = Math.round(cents);

    if (cents == 0) {
        return cents.toFixed(2);
    } else if(cents < 100){
        if (cents > 0 || cents > -100) {
            return (cents/100).toFixed(2);
        } else {
            cents = cents.toString();
            return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
        }
    }else {
        cents = cents.toString();
        return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
    }
}

function currencyMath(leftVal, operator, curRightVal, round, both) {
    leftVal = parseFloat(leftVal);
    curRightVal = parseFloat(curRightVal) * 100;

    if (both == 'true') {
        leftVal = leftVal * 100;
    }

    var cents = {
        "+": curRightVal + leftVal,
        "-": curRightVal - leftVal,
        "*": curRightVal * leftVal,
        "/": curRightVal / leftVal,
        "%": curRightVal % leftVal
    }[operator];

    if (round == 'true') {
        cents = Math.round(cents);
    }

    if (cents == 0) {
        return cents.toFixed(2);
    } else {
        cents = cents.toString();
        return cents.substring(0,cents.length-2)+"."+cents.substring(cents.length-2)
    }
}

module.exports = {
    numberCommaFormat: numberCommaFormat,
    replaceAll: replaceAll,
    scrollToElement: scrollToElement,
    upAndDownPopups: upAndDownPopups,
    currencyFormat: currencyFormat,
    currencyMath: currencyMath
};