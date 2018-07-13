require('./../css/general.css');
require('./../css/overview.css');
require('./../library/fontawesome/fontawesome.js');

//handlebars

var overviewOperationTemplate = require('./../handlebars/overview/overview_operation.hbs');
var overviewTemplate = require('./../handlebars/overview/overview.hbs');
var overviewTotalTemplate = require('./../handlebars/overview/overview_total.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../library/calendar/calendar.js');

function init() {
    google.charts.load('current', {packages: ['corechart', 'line']});

    var dates = createDates('today');
    var d1 = dates[0];
    var d2 = dates[1];

    globals.start_date = d1;
    globals.end_date = d2;

    if (globals.date_range == '7') {
        d1.setDate(d2.getDate() - 7);
        getTransactionReport(d1, d2, 'today');
    } else if(globals.date_range == '*') {
        d1 = '*';
        getTransactionReport(d1, d2, 'today');
    } else {
        getTransactionReport(d1, d2, 'today');
    }
}

function salesSummary(transactions) {
    var totalTax = 0;
    var totalDiscounts = 0;
    var totalCash = 0;
    var totalCredit = 0;
    var total = 0;

    var totalAmerican = 0;
    var totalDiscover = 0;
    var totalMaster = 0;
    var totalVisa = 0;

    //#Quantity
    var cashQuantity = 0;
    var creditQuantity = 0;
    var americanQuantity = 0;
    var discoverQuantity = 0;
    var masterQuantity = 0;
    var visaQuantity = 0;

    function incrementItem(item, quantity, value){
        item += value;
        quantity += 1;
    }

    for (var i = 0; i < transactions.length; i++) {
        var transaction = transactions[i];
        var subtotal = parseFloat(transaction['subtotal'])*100;
        var paymentType = transaction['payment_type'];
        totalTax += parseFloat(transaction['tax'])*100;
        total += subtotal;

        var items = transaction['items'];
        for (var d = 0; d <= items.length; d++) {
            var item = items[d];
            totalDiscounts += parseFloat(item['discount'])*100;
        }

        if(paymentType == "Cash") {
            incrementItem(totalCash, cashQuantity, subtotal);
        } else {
            incrementItem(totalCredit, creditQuantity, subtotal);
        }

        if(paymentType == "American Express") {
            incrementItem(totalAmerican, americanQuantity, subtotal);
        } else if(paymentType == "Discover") {
            incrementItem(totalDiscover, discoverQuantity, subtotal);
        } else if(paymentType == "MasterCard") {
            incrementItem(totalMaster, masterQuantity, subtotal);
        } else if(paymentType == "Visa") {
            incrementItem(totalVisa, visaQuantity, subtotal);
        }
    }
}

function createDates(type){
    //Start Date
    var d1 = new Date();
    d1.setHours(globals.start_point, 0, 0, 0);

    if(type == 'yesterday') {
        d1.setDate(d1.getDate() - 1);
    }

    //End Date
    var d2 = new Date();
    d2.setHours(globals.start_point, 0, 0, 0);
    d2.setDate(d1.getDate() + 1);

    return [d1, d2];
}

function getTransactionReport(startTime, endTime, type) {
    if (startTime != '*') {
        var epochStartTime = startTime.valueOf()/1000;
        var epochEndTime = endTime.valueOf()/1000;
    }

    var postData = {
        'start_time': epochStartTime,
        'end_time': epochEndTime
    };

    $.ajax({
        url: globals.base_url + '/transaction/get_transaction/',
        data: postData,
        dataType: 'json',
        type: "GET",
        success: function (response) {
            globals.transactions = response['transactions'];
            //console.log(response);
            response['link_columns'] = globals.link_columns;

            var $overviewWrapper = $('#overview-wrapper');
            $overviewWrapper.empty();
            $overviewWrapper.append(overviewTemplate(response));

            if (globals.transactions.length || (globals.link_columns.cost && globals.link_columns.price)) {
                if (globals.date_range == '*') {
                    createOverviewGraph(globals.transactions, false, false, type);
                } else {
                    createOverviewGraph(globals.transactions, startTime, endTime, type);
                }
            }
        }
    });
}


function createOverviewGraph(transactions, startTime, endTime, type) {
    var transactionGraphArray = [];
    var hourRange = Math.abs(endTime - startTime) / 3.6e6;
    var dayRange = Math.abs(endTime - startTime) / 8.64e7;

    if (hourRange <= 24 && dayRange <= 1) {
        var seperation = 'hour';
        var differenceTime = 3599999;
        var loopRange = hourRange;

        function addDate(time) {
            time.setHours(time.getHours() + 1);
        }
        //Subtract hour by one since we add one in the for loop
        startTime.setHours(startTime.getHours() - 1);
    } else {
        seperation = 'day';
        differenceTime = 86399999;
        loopRange = Math.round(dayRange);

        function addDate(time) {
            time.setDate(time.getDate() + 1);
        }

        //Subtract day by one since we add one in the for loop
        startTime.setDate(startTime.getDate() - 1);
    }

    var templateCash = 0;
    var templateCredit = 0;
    var templateDiscount = 0;
    var templateTax = 0;
    var templateTotal = 0;

    // Loop through the day
    for (var t = 1; t <= loopRange; t++) {
        addDate(startTime);
        var initialTime = startTime.valueOf();
        var initialTimestamp = new Date(initialTime);
        var rangeTime = initialTime + differenceTime;

        var hourTotal = 0;

        // Loop through the transaction
        for (var i = 0; i < transactions.length; i++) {
            var transaction = transactions[i];

            //convert to milliseconds epoch
            var milliEpoch = parseInt(transaction['date']) * 1000;

            // If between current hour then calculate
            if(milliEpoch >= initialTime && milliEpoch <= rangeTime) {

                // Remove transaction from array
                transactions.splice(i, 1);
                i -= 1;
                // Calculate current transaction total (subtotal + tax - discount)
                var currentDiscount = 0;
                // Loop through the items to calculate discount
                var items = transaction['items'];
                for (var d = 0; d <= items.length; d++) {
                    var item = items[d];
                    currentDiscount += parseFloat(item['discount'])*100;
                }

                var currentSubtotal = parseFloat(transaction['subtotal'])*100;
                var currentTax = parseFloat(transaction['tax'])*100;
                //var currentTax = helper.currencyMath(currentSubtotal, '*', transaction['tax'], true, false);
                var currentTotal = currentSubtotal - currentDiscount + parseFloat(transaction['tax']);

                hourTotal += currentTotal;

                //Handle template totals
                if(transaction['payment_type'] == 'Cash') {
                    templateCash += currentTotal;
                } else {
                    templateCredit += currentTotal;
                }
                templateDiscount += currentDiscount;
                templateTax += currentTax;
                templateTotal += currentTotal;
            }
        }
        transactionGraphArray.push([initialTimestamp, parseFloat(helper.currencyFormat(hourTotal))]);
    }

    function callback() {
        createOverviewChart(seperation, transactionGraphArray)
    }

    google.charts.setOnLoadCallback(callback);
    var $overviewTotalWrapper = $('#overview-total-wrapper');
    $overviewTotalWrapper.empty();
    $overviewTotalWrapper.append(overviewTotalTemplate({
        'cash': helper.currencyFormat(templateCash),
        'credit': helper.currencyFormat(templateCredit),
        'discount': helper.currencyFormat(templateDiscount),
        'tax': helper.currencyFormat(templateTax),
        'total': helper.currencyFormat(templateTotal)
    }));

    $('#'+type+'-button').addClass('active');
}

function tabHandler($clickedTab) {
    $clickedTab.siblings('.active').removeClass('active');
    $clickedTab.addClass('active');

    var $wrapper = $($clickedTab.attr('data-wrapper'));
    $wrapper.siblings('.active').removeClass('active');
    $wrapper.addClass('active');
}

function popupHandler(e, popupData) {
    e.stopPropagation();
    var $overlay = $('#operation-overlay');
    $overlay.empty();
    $overlay.addClass('active');
    $overlay.append(overviewOperationTemplate(popupData));
}

$(document).ready(function() {
    init();

    $(document).on('click', '.tab:not(.active)', function () {
        tabHandler($(this));
    });

    //OPERATION POPUP//
    $(document).on('click', '#operation-popup-wrapper', function (e) {
        e.stopPropagation();
    });

    $(document).on('click', 'body', function () {
        $('#operation-overlay').removeClass('active');
    });
    //OPERATION POPUP//

    //LINK COLUMNS//
    $(document).on('click', '#quantity-link', function (e) {
        if(!globals.link_columns['quantity']) {
            popupHandler(e, {type: "quantity", columns: globals.columns, link_columns: globals.link_columns});
        }
    });

    $(document).on('click', '#price-link', function (e) {
        if(!globals.link_columns['price']) {
            popupHandler(e, {type: "price", columns: globals.columns, link_columns: globals.link_columns});
        }
    });

    $(document).on('click', '#cost-link', function (e) {
        if(!globals.link_columns['cost']) {
            popupHandler(e, {type: "cost", columns: globals.columns, link_columns: globals.link_columns});
        }
    });

    $(document).on('click', '#name-link', function (e) {
        if(!globals.link_columns['name']) {
            popupHandler(e, {type: "name"});
        }
    });

    $(document).on('click', '#link-column-submit', function () {
        var $operationOverlay = $('#operation-overlay');
        var $linkColumnInput = $operationOverlay.find('#link-column-input');

        var postData = {
            link_type: $linkColumnInput.attr('data-type'),
            column: $linkColumnInput.val()
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/operation/link_columns/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));

                // Show updated inventory
                //var $inventoryWrapper = $('#transaction-wrapper');
                //$inventoryWrapper.empty();
                //$inventoryWrapper.append(transactionTemplate({
                //    'columns': globals.columns,
                //    'link_columns': response,
                //    'transaction': globals.transaction,
                //    //'start_time':
                //}));

                // Remove popup
                $('#operation-overlay').removeClass('active');

                // CACHE THE DATA
                globals.link_columns = response;

                // Hide Links that was linked
                if (globals.link_columns.price){
                    $('#price-link').hide();
                }

                if (globals.link_columns.cost){
                    $('#cost-link').hide();
                }

                if(globals.link_columns.cost && globals.link_columns.price) {
                    if (globals.date_range == '*') {
                        createOverviewGraph(globals.transactions);
                    } else {
                        createOverviewGraph(globals.transactions, globals.start_date, globals.end_date);
                    }
                }

                $('#' + type + '-button').addClass('active');
            },
            error: function (response) {
                console.log(JSON.stringify(response.responseJSON['error_msg']));
            }
        });
    });
    //LINK COLUMNS//

    //OVERVIEW//
    $(document).on('click', '.graph-button:not(.active)', function () {
        var type = $(this).attr('data-type');
        var dates = createDates(type);
        var d1 = dates[0];
        var d2 = dates[1];

        if (globals.date_range == '7') {
            d1.setDate(d2.getDate() - 7);
            getTransactionReport(d1, d2, type);
        } else if(globals.date_range == '*') {
            d1 = '*';
            getTransactionReport(d1, d2, type);
        } else {
            getTransactionReport(d1, d2, type);
        }
    });
    //OVERVIEW//

    // CALENDAR //
    $(document).on('click', '#calendar-submit', function () {
        var $calendarWrapper = $(this).closest('#calendar-wrapper');
        var $calendarInputWrapper = $calendarWrapper.find('#calendar-input-wrapper');
        var firstDateString = $calendarInputWrapper.attr('data-first-selected-date');
        var lastDateString = $calendarInputWrapper.attr('data-last-selected-date');

        if(typeof firstDateString == 'undefined' || firstDateString == '') {
            firstDateString = lastDateString.replace('23:59:59', '00:00:00');
        } else if(typeof lastDateString == 'undefined' || lastDateString == '') {
            if(firstDateString.indexOf('00:00:00') !== -1) {
                lastDateString = firstDateString.replace('00:00:00', '23:59:59');
            } else {
                lastDateString = firstDateString.replace('23:59:59', '00:00:00');
            }
        }

        var firstDate = new Date(firstDateString);
        var lastDate = new Date(lastDateString);
        console.log(lastDate)

        getTransactionReport(firstDate, lastDate, '');

        $calendarWrapper.find('#calendar-exit').click();
    });
    // CALENDAR //
});

function createOverviewChart(seperation, array) {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Payments');

    data.addRows(array);

    if(seperation == 'hour') {
        var dateRegex = "MMM d, h:mma - h:59a";
    } else if(seperation == 'day') {
        dateRegex = "MMM d, h:mma";
    }

    var date_formatter = new google.visualization.DateFormat({
        pattern: dateRegex
    });
    date_formatter.format(data, 0);

    var options = {
        curveType: 'function',
        animation: {
            startup: true,
            duration: 1500,
            easing: 'out'
        },
        height: 240,
        width: 500,
        lineWidth: 3,
        pointSize: 0,
        chartArea: {
            left: '0%',
            right: '0%',
            top: '0%',
            bottom: '0%',
            width: '100%',
            height: '100%'
        },
        series: {
            //0: { color: '#0EC160' },
            0: { color: '#08E8FF' }
        },
        hAxis: {
            title: '',
            format: 'MMM dd',
            gridlines: {
                color: 'transparent'
            },
            textStyle: {
                color: 'bfbfbf'
            },
            titleTextStyle: {
                color: 'bfbfbf'
            },
            textPosition: 'none'
        },
        vAxis: {
            title: '',
            format: 'currency',
            minValue: 0,
            gridlines: {
                color: 'transparent'
            },
            textStyle: {
                color: 'bfbfbf'
            },
            titleTextStyle: {
                color: 'bfbfbf'
            },
            //viewWindow: {
            //    min: 0
            //},
            textPosition: 'none'
        },
        legend: { position: 'none' },
        trendlines: {
            0: {
                type: 'polynomial',
                opacity: 0.4,
                pointSize: 0,
                tooltip: false,
                enableInteractivity: false
            }
        },
        focusTarget: 'category',
        backgroundColor: 'transparent'
    };

    var overviewChart = document.getElementById('overview-chart');
    var chart = new google.visualization.LineChart(overviewChart);

    chart.draw(data, options);
}