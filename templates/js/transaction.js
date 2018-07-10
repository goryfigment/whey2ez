require('./../css/general.css');
require('./../css/transaction.css');
require('./../library/fontawesome/fontawesome.js');

//handlebars
var transactionTemplate = require('./../handlebars/transaction/transaction.hbs');
var transactionOperationTemplate = require('./../handlebars/transaction/transaction_operation.hbs');
var receiptSettingsTemplate = require('./../handlebars/transaction/receipt_settings.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../library/calendar/calendar.js');

function init() {
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

    $('#receipt-wrapper').append(receiptSettingsTemplate(globals.receipt_settings));

    $('#date-start-input [value="' + globals.start_point + '"]').prop('selected', true);
    $('#date-range-input [value="' + globals.date_range + '"]').prop('selected', true);
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
        'start_time': start_time,
        'end_time': end_time
    };

    $.ajax({
        url: globals.base_url + '/transaction/get_transaction/',
        data: postData,
        dataType: 'json',
        type: "GET",
        success: function (response) {
            //console.log(response);

            globals.start_time = response['start_time'];
            globals.end_time = response['end_time'];

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
                    'link_columns': response['link_columns'],
                    'transaction': globals.transaction,
                    'inventory': response['inventory'],
                    'start_time': globals.start_time,
                    'end_time': globals.end_time
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

        getTransactionReport(firstDate.valueOf()/1000, lastDate.valueOf()/1000);

        $calendarWrapper.find('#calendar-exit').click();
    });
    // UPDATE TRANSACTION //

    // SAVE SETTINGS //
    $(document).on('click', '#transaction-settings-submit', function () {
        //Get filters, Get default tax, Get every store tax
        var filter = [];
        var storeTax = {};

        var dateRange = $('#date-range-input').val();
        var startTime = $('#date-start-input').val();

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
                'tax': businessTax,
                'start_time': startTime
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

                var $settingResult = $('#settings-result');
                $settingResult.removeClass('denied');
                $settingResult.addClass('success');
                $settingResult.text('Saved!');
                $settingResult.show();
                $settingResult.fadeOut(2000);
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    var $settingResult = $('#settings-result');
                    $settingResult.removeClass('success');
                    $settingResult.addClass('denied');
                    $settingResult.text('Permission Denied');
                    $settingResult.show();
                    $settingResult.fadeOut(2000);
                }
            }
        });
    });
    // SAVE SETTINGS //

    // RECEIPT SETTINGS //
    $(document).on('click', '#add-footer-button, #add-header-button', function () {
        var $lineContainer = $(this).siblings('.line-container');
        var $receiptInputWrapper = $lineContainer.find('.receipt-input-wrapper');
        //Copy last item
        var $copyItem = $receiptInputWrapper.last().clone();
        var newNumber = String(parseInt($copyItem.attr('data-number')) + 1);
        $copyItem.attr('data-number', newNumber);
        $copyItem.find('.receipt-input-container .receipt-text-label').text('Text (Line ' + newNumber + ')');
        $copyItem.find('.receipt-text-input').val('');
        $lineContainer.append($copyItem);

        var $receiptPreviewWrapper = $('#receipt-'+$receiptInputWrapper.attr('data-type')+'-wrapper');
        var $copyPreviewItem = $receiptPreviewWrapper.find('.receipt-line').last().clone();
        $copyPreviewItem.attr('data-receipt_id', newNumber);
        $copyPreviewItem.text('');
        $receiptPreviewWrapper.append($copyPreviewItem);
    });

    $(document).on('click', '.delete-line-item', function () {
        var $item = $(this).closest('.receipt-input-wrapper');
        var $wrapper = $item.parent();
        var $items = $wrapper.find('.receipt-input-wrapper');

        var $receiptPreviewWrapper = $('#receipt-'+$item.attr('data-type')+'-wrapper');
        var $previewItem = $receiptPreviewWrapper.find('.receipt-line[data-receipt_id="' + $item.attr('data-number') + '"]');

        if($items.length > 1) {
            $item.remove();
            $previewItem.remove();

            var number = 1;

            $wrapper.find('.receipt-input-wrapper').each(function() {
                var $this = $(this);
                $this.attr('data-number', number);
                $this.find('.receipt-input-container .receipt-text-label').text('Text (Line ' + number + ')');
                number += 1;
            });

            number = 1;

            $receiptPreviewWrapper.find('.receipt-line').each(function() {
                var $this = $(this);
                $this.attr('data-receipt_id', number);
                number += 1;
            });
        }
    });

    $(document).on('click', '#save-receipt-settings', function () {
        var ipAddress = '';

        var header = {
            'lines': []
        };

        var footer = {
            'lines': []
        };

        function getLineData($this, lineType) {
            var text = $this.find('.receipt-text-input').val().trim();

            var currentData = {
                'size': $this.find('.font-size-input').val(),
                'align': $this.find('.font-alignment-input').val(),
                'text': text
            };

            if(text != '' && lineType == 'header') {
                header['lines'].push(currentData);
            } else if(text != '' && lineType == 'footer') {
                footer['lines'].push(currentData);
            }
        }

        $('#printer-address-wrapper').find('.printer-address').each(function() {
            ipAddress = ipAddress + $(this).val().trim() + '.';
        });

        $('#header-container').find('.header-item').each(function() {
            getLineData($(this), 'header');
        });

        $('#footer-container').find('.footer-item').each(function() {
            getLineData($(this), 'footer');
        });

        var postData = {
            'ip_address': ipAddress.substring(0, ipAddress.length - 1),
            'header': header,
            'footer': footer
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/transaction/save_receipt_settings/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));

                var $settingResult = $('#receipt-settings-result');
                $settingResult.removeClass('denied');
                $settingResult.addClass('success');
                $settingResult.text('Saved!');
                $settingResult.show();
                $settingResult.fadeOut(2000);
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    var $settingResult = $('#receipt-settings-result');
                    $settingResult.removeClass('success');
                    $settingResult.addClass('denied');
                    $settingResult.text('Permission Denied');
                    $settingResult.show();
                    $settingResult.fadeOut(2000);
                }
            }
        });
    });
    // RECEIPT SETTINGS //

    //RECEIPT PREVIEW //
    $(document).on('keydown keyup', '.receipt-text-input', function () {
        var $receiptTextInput = $(this);
        var lineId = $receiptTextInput.closest('.receipt-input-wrapper').attr('data-number');
        var textValue = $receiptTextInput.val();
        var $receiptInputWrapper = $receiptTextInput.closest('.receipt-input-wrapper');

        $('#receipt-'+$receiptInputWrapper.attr('data-type')+'-wrapper').find('[data-receipt_id="' + lineId + '"]').text(textValue);
    });

    $(document).on('focusin', '.font-alignment-input', function() {
        $(this).data('val', $(this).val());
    }).on('change','.font-alignment-input', function() {
        var $this = $(this);
        var lineId = $this.closest('.receipt-input-wrapper').attr('data-number');
        var $receiptLine = $('#receipt-header-wrapper').find('[data-receipt_id="' + lineId + '"]');

        $receiptLine.removeClass('align-'+$(this).data('val'));
        $receiptLine.addClass('align-'+$(this).val());
        $this.data('val', $(this).val());
    });

    $(document).on('focusin', '.font-size-input', function() {
        $(this).data('val', $(this).val());
    }).on('change','.font-size-input', function() {
        var $this = $(this);
        var lineId = $this.closest('.receipt-input-wrapper').attr('data-number');
        var $receiptLine = $('#receipt-header-wrapper').find('[data-receipt_id="' + lineId + '"]');

        $receiptLine.removeClass('font-'+$(this).data('val'));
        $receiptLine.addClass('font-'+$(this).val());
        $this.data('val', $(this).val());
    });
    //RECEIPT PREVIEW //
});