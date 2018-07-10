require('./../css/general.css');
require('./../css/overview.css');
require('./../library/fontawesome/fontawesome.js');

//handlebars
//var transactionTemplate = require('./../handlebars/transaction/transaction.hbs');
//var rowTemplate = require('./../handlebars/inventory/row.hbs');
var overviewOperationTemplate = require('./../handlebars/overview/overview_operation.hbs');
var overviewTotalTemplate = require('./../handlebars/overview/overview_total.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../library/calendar/calendar.js');

function init() {
    google.charts.load('current', {packages: ['corechart', 'line']});

    //Start Date
    var d1 = new Date();
    d1.setHours(globals.start_point, 0, 0, 0);

    //End Date
    var d2 = new Date();
    d2.setHours(globals.start_point, 0, 0, 0);
    d2.setDate(d1.getDate() + 1);

    if (globals.date_range == '7') {
        d1.setDate(d2.getDate() - 7);
        getTransactionReport(d1.valueOf()/1000, d2.valueOf()/1000 - 1);
    } else if(globals.date_range == '*') {
        d1 = '*';
        getTransactionReport(d1, d2);
    } else {
        getTransactionReport(d1.valueOf()/1000, d2.valueOf()/1000 - 1);
    }
}

function getTransactionReport(start_time, end_time) {
    var postData = {
        'start_time': start_time,
        'end_time': end_time
    };

    $.ajax({
        url: globals.base_url + '/transaction/get_transaction/',
        data: postData,
        dataType: 'json',
        type: "GET",
        success: function (response) {
            globals.transactions = response['transactions'];
            //console.log(response);

            if (globals.transactions.length || (globals.link_columns.cost && globals.link_columns.price)) {
                if (globals.date_range == '*') {
                    createOverviewGraph(globals.transactions);
                } else {
                    createOverviewGraph(globals.transactions, globals.start_epoch, globals.end_epoch);
                }
            }
        }
    });
}


function createOverviewGraph(transactions, startTime, endTime) {
    var transactionGraphArray = [];

    // if startTime and endTime is not given the assume end time is now and start time is end time + hour range
    //if (!startTime && !endTime) {
    //    // Add one to date to include this hour too
    //    endTime = new Date();
    //    endTime.setMinutes(0, 0, 0);
    //
    //    startTime = new Date();
    //    startTime.setMinutes(0, 0, 0);
    //    startTime.setHours(endTime.getHours() - 24);
    //} else {
    //
    //}

    startTime = new Date(parseInt(startTime)*1000);
    startTime.setMinutes(0, 0, 0);
    endTime = new Date(parseInt(endTime)*1000);
    endTime.setMinutes(0, 0, 0);

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
        loopRange = dayRange;

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
            var items = transaction['items'];

            //convert to milliseconds epoch
            var milliEpoch = parseInt(transaction['date']) * 1000;

            // If between current hour then calculate
            if(milliEpoch >= initialTime && milliEpoch <= rangeTime) {
                // Remove transaction from array
                transactions.splice(i, 1);
                // Calculate current transaction total (subtotal + tax - discount)
                var currentDiscount = 0;
                // Loop through the items to calculate discount
                for (var key in items) {
                    var item = items[key];
                    currentDiscount += parseFloat(item['discount'])*100;
                }

                var currentSubtotal = parseFloat(transaction['subtotal'])*100;
                var currentTax = Math.round(currentSubtotal*parseFloat(transaction['tax']));
                var currentTotal = currentSubtotal - currentDiscount + currentTax;

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
                        createOverviewGraph(globals.transactions, globals.start_epoch, globals.end_epoch);
                    }
                }
            },
            error: function (response) {
                console.log(JSON.stringify(response.responseJSON['error_msg']));
            }
        });
    });
    //LINK COLUMNS//
});

function createOverviewChart(seperation, array) {
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Payments');

    data.addRows(array);

    if(seperation == 'hour') {
        var dateRegex = "MMM d, h:mma - h:mma";
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

    //  google.charts.load('current', {'packages':['timeline']});
    //google.charts.setOnLoadCallback(drawChart);
    //
    //function drawChart() {
    //  var data = new google.visualization.DataTable();
    //  data.addColumn('string', 'Team');
    //  data.addColumn('date', 'Season Start Date');
    //  data.addColumn('date', 'Season End Date');
    //
    //  data.addRows([
    //    ['Baltimore Ravens',     new Date(2000, 8, 5), new Date(2001, 1, 5)],
    //    ['New England Patriots', new Date(2001, 8, 5), new Date(2002, 1, 5)],
    //    ['Tampa Bay Buccaneers', new Date(2002, 8, 5), new Date(2003, 1, 5)],
    //    ['New England Patriots', new Date(2003, 8, 5), new Date(2004, 1, 5)],
    //    ['New England Patriots', new Date(2004, 8, 5), new Date(2005, 1, 5)],
    //    ['Pittsburgh Steelers',  new Date(2005, 8, 5), new Date(2006, 1, 5)],
    //    ['Indianapolis Colts',   new Date(2006, 8, 5), new Date(2007, 1, 5)],
    //    ['New York Giants',      new Date(2007, 8, 5), new Date(2008, 1, 5)],
    //    ['Pittsburgh Steelers',  new Date(2008, 8, 5), new Date(2009, 1, 5)],
    //    ['New Orleans Saints',   new Date(2009, 8, 5), new Date(2010, 1, 5)],
    //    ['Green Bay Packers',    new Date(2010, 8, 5), new Date(2011, 1, 5)],
    //    ['New York Giants',      new Date(2011, 8, 5), new Date(2012, 1, 5)],
    //    ['Baltimore Ravens',     new Date(2012, 8, 5), new Date(2013, 1, 5)],
    //    ['Seattle Seahawks',     new Date(2013, 8, 5), new Date(2014, 1, 5)],
    //  ]);
    //
    //  var options = {
    //    height: 450,
    //    timeline: {
    //      groupByRowLabel: true
    //    }
    //  };
    //
    //  var chart = new google.visualization.Timeline(document.getElementById('chart_div'));
    //
    //  chart.draw(data, options);
    //}
