require('./../css/general.css');
require('./../css/transaction.css');
require('./../library/fontawesome/fontawesome.js');

//handlebars
var transactionTemplate = require('./../handlebars/transaction/transaction.hbs');
var transactionOperationTemplate = require('./../handlebars/transaction/transaction_operation.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../library/calendar/calendar.js');

function init() {
    $('[value="' + globals.date_range + '"]').prop('selected', true);
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
    $overlay.append(transactionOperationTemplate(popupData));
}

function getTransactionReport(start_time, end_time) {
    var postData = {
        'start_time': Math.ceil(start_time.valueOf()/1000),
        'end_time': Math.ceil(end_time.valueOf()/1000)
    };

    $.ajax({
        url: globals.base_url + '/transaction/get_transaction/',
        data: postData,
        dataType: 'json',
        type: "GET",
        success: function (response) {
            //console.log(response);

            var $transactionWrapper = $('#transaction-wrapper');
            response['link_columns'] = globals.link_columns;
            $transactionWrapper.empty();
            $transactionWrapper.append(transactionTemplate(response));
        }
    });
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
                var $inventoryWrapper = $('#transaction-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(transactionTemplate({
                    'columns': globals.columns,
                    'link_columns': response,
                    'transaction': globals.transaction,
                    //'start_time':
                }));

                // Remove popup
                $('#operation-overlay').removeClass('active');

                // CACHE THE DATA
                globals.link_columns = response;
            },
            error: function (response) {
                console.log(JSON.stringify(response.responseJSON['error_msg']));
            }
        });
    });
    //LINK COLUMNS//

    //CREATE TRANSACTION PAGE//
    $(document).on('click', '.create-transaction-button', function () {
        var $createTransactionButton = $(this);

        var $businessItem = $createTransactionButton.closest('.business-item');
        if($businessItem.length){
            var type = 'main';
            var id = $businessItem.attr('data-id');
        } else {
            type = 'store';
            id = $createTransactionButton.closest('.store-item').attr('data-id');
        }

        var createTransactionLink = document.getElementById('create-transaction-link');
        createTransactionLink.setAttribute("href", '/create_transaction?id=' + id + '&type=' + type);
        createTransactionLink.click();
    });
    //CREATE TRANSACTION PAGE//

    // UPDATE TRANSACTION //
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

        getTransactionReport(firstDate, lastDate);

        $calendarWrapper.find('#calendar-exit').click();
    });
    // UPDATE TRANSACTION //

    // SAVE SETTINGS //
    $(document).on('click', '#transaction-settings-submit', function () {
        //Get filters, Get default tax, Get every store tax
        var filter = [];
        var storeTax = {};

        var dateRange = $('#date-range-input').val();

        $('.filter-input:checked').each(function() {
            filter.push($(this).attr('data-name'));
        });

        $('.store-tax-input').each(function() {
            var $storeTaxInput = $(this);
            var storeId = $storeTaxInput.attr('data-store_id');
            var storeTaxValue = $storeTaxInput.val();
            storeTax[storeId] = $storeTaxInput.val();
        });

        var $businessTaxInput = $('.business-tax');
        var businessTax = $businessTaxInput.val();

        var postData = {
            'settings': {
                'date_range': dateRange,
                'filter': filter,
                'tax': businessTax
            },
            'store_tax': storeTax
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/transaction/save_settings/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
            }
        });

    });
    // SAVE SETTINGS //
});