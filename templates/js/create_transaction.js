require('./../css/general.css');
require('./../css/create_transaction.css');
require('./../library/fontawesome/fontawesome.js');

var $ = require('jquery');
var helper = require('./../js/helpers.js');

//handlebars
var searchItemTemplate = require('./../handlebars/create_transaction/search_item.hbs');
var resultItemTemplate = require('./../handlebars/create_transaction/result_item.hbs');
var discountItemTemplate = require('./../handlebars/create_transaction/discount_item.hbs');
var receiptTemplate = require('./../handlebars/create_transaction/receipt.hbs');


function init() {
    $('#inventory-search').focus();
    var $searchInput = $('#search-input');
    var $transactionSubmitButton =  $('#transaction-submit-button');
    $searchInput.data('type', globals.type);
    $searchInput.data('id', globals.id);

    $transactionSubmitButton.data('type', globals.type);
    $transactionSubmitButton.data('id', globals.id);
    var $taxRate = $('#tax-rate');
    $taxRate.data('tax', globals.tax);
}

function calculateTotal() {
    var taxRate = parseFloat($('#tax-rate').data('tax'));
    var subtotal = 0;

    $('.transaction-item').each(function() {
        subtotal += parseFloat($(this).find('.transaction-price').text());
    });

    var tax = Math.round(subtotal*taxRate*100)/100;
    var total = subtotal + tax;

    var $receiptResultWrapper = $('#receipt-result-wrapper');
    $receiptResultWrapper.find('#subtotal').html(subtotal.toFixed(2));
    $receiptResultWrapper.find('#tax').html(tax.toFixed(2));
    $receiptResultWrapper.find('#total').html(total.toFixed(2));
}

$(document).ready(function() {
    init();

    $(document).on('click', 'body', function () {
        var $searchPopup = $('#search-popup');
        if($searchPopup.hasClass('active')){
            $searchPopup.removeClass('active');
        }
    });

    $(document).on('click', '#search-input', function (e) {
        e.stopPropagation();

        var $searchPopup = $('#search-popup');
        if(!$searchPopup.hasClass('active') && $searchPopup.children().length != 0){
            $searchPopup.addClass('active');
        }
    });

    $(document).on('keyup', '#search-input', function (e) {
        var $searchInput = $(this);
        var $searchPopup = $searchInput.siblings('#search-popup');
        var $searchItems = $searchPopup.find('.search-item');
        var $activeSearchItem = $searchPopup.find('.search-item.selected');
        var keycode = e.keyCode;

        if($searchPopup.is(':visible') && (keycode == 38 || keycode == 40)) {
            helper.upAndDownPopups(keycode, $searchPopup, $searchItems, true);
            return;
        } else if(keycode == 13 && $activeSearchItem.length) {
            $activeSearchItem.click();
            return;
        }

        var searchValue = $searchInput.val().toLowerCase().trim();
        var storeId = $searchInput.data('id');
        var storeType = $searchInput.data('type');

        var postData = {
            search_value: searchValue,
            id: storeId,
            type: storeType
        };

        if(searchValue.length > 0) {
            $.ajax({
                url: globals.base_url + '/inventory/search',
                data: postData,
                dataType: 'json',
                type: "GET",
                success: function (response) {
                    //console.log(JSON.stringify(response));
                    var searchList = response;

                    $searchPopup.empty();

                    if(searchList.length) {
                        $searchPopup.addClass('active');
                    } else {
                        $searchPopup.removeClass('active');
                    }

                    for (var i = 0; i < searchList.length; i++) {
                        var searchItem = searchList[i];
                        var $generatedHtml = $(searchItemTemplate(searchItem));
                        $generatedHtml.data('item_data', searchItem);
                        $searchPopup.append($generatedHtml);
                    }
                }
            });
        }
    });

    $(document).on('click', '.search-item', function () {
        var $searchItem = $(this);
        var itemData = $searchItem.data('item_data');

        var $searchPopup = $searchItem.closest('#search-popup');
        var $searchInput = $searchPopup.siblings('#search-input');
        var $resultContainer = $('#receipt-item-container');

        $searchPopup.removeClass('active');
        $searchInput.val(itemData['name']);

        var generatedHtml = resultItemTemplate(itemData);

        $resultContainer.append(generatedHtml);

        calculateTotal();
    });

    $(document).on({
        mouseenter: function () {
            var $searchItem = $(this);
            var $activeSearchItem = $searchItem.siblings('.selected');
            $activeSearchItem.removeClass('selected');
            $searchItem.addClass('selected');
        },
        mouseleave: function () {
           $(this).removeClass("selected");
        }
    }, '.search-item');

    //Payment type
    $(document).on('click', '.payment-type:not(.selected)', function () {
        var $paymentType = $(this);
        $paymentType.siblings('.selected').removeClass('selected');
        $paymentType.addClass('selected');
    });

    //Delete item
    $(document).on('click', '.delete-button', function () {
        var $deleteButton = $(this);
        $deleteButton.closest('.transaction-item').remove();

        calculateTotal();
    });

    //Quantity change
    $(document).on('click keyup', '.quantity-input', function () {
        var $quantityInput = $(this);
        var $transactionItem = $quantityInput.closest('.transaction-item');
        var $transactionPrice = $transactionItem.find('.transaction-price');
        var price = parseFloat($quantityInput.attr('data-each'))*parseInt($quantityInput.val());

        $transactionPrice.html(price.toFixed(2));
        calculateTotal();
    });

    $(document).on('click', '.quantity-input', function () {
        $(this).select();
    });

    $(document).on('click', '.discount-submit', function () {
        var $discountSubmit = $(this);
        var $transactionItem = $discountSubmit.closest('.transaction-item');
        var $discountMoneyInput = $discountSubmit.siblings('.discount-money-input');
        var moneyValue = $discountMoneyInput.val().trim();
        var $percentMoneyInput = $discountSubmit.siblings('.discount-percent-input');
        var percentValue = $percentMoneyInput.val().trim();
        var numberRegex = /^((^\d+$)|(\d+(\.\d *)?)|((\d*\.)?\d+))$/;
        var $discountWrapper = $transactionItem.find('.discount-wrapper');
        var $discountButton = $discountWrapper.siblings('.discount-button');
        var $discountSubmitWrapper = $discountWrapper.siblings('#discount-submit-wrapper');
        var $transactionPrice = $transactionItem.find('.transaction-price');
        var transactionPrice = parseFloat($transactionPrice.text());

        if(moneyValue != '') {
            if(numberRegex.test(moneyValue)) {
                var discount = parseFloat(moneyValue);
                $discountWrapper.html(discountItemTemplate({'type': 'dollar', 'total': discount.toFixed(2)}));
                $discountButton.removeClass('active');
                $discountSubmitWrapper.removeClass('active');

                $transactionPrice.text((transactionPrice - discount).toFixed(2));
                calculateTotal();
            } else {
                alert('Must be a number!')
            }
        } else if (percentValue != '') {
            if(numberRegex.test(percentValue)) {
                discount = parseFloat(percentValue)/100 * transactionPrice;
                $discountWrapper.html(discountItemTemplate({'type': 'percent', 'percent': percentValue, 'total': discount.toFixed(2)}));
                $discountButton.removeClass('active');
                $discountSubmitWrapper.removeClass('active');

                $transactionPrice.text((transactionPrice - discount).toFixed(2));
                calculateTotal();
            } else {
                alert('Must be a number!')
            }
        }
    });

    $(document).on('click', '.discount-button', function () {
        $(this).siblings('#discount-submit-wrapper').addClass('active');
    });

    $(document).on('click', '.discount-cancel', function () {
        $(this).closest('#discount-submit-wrapper').removeClass('active');
    });

    $(document).on('click', '.discount-delete', function () {
        var $discountDelete = $(this);
        var $transactionItem = $discountDelete.closest('.transaction-item');
        var $transactionPrice = $transactionItem.find('.transaction-price');
        var price = parseFloat($transactionPrice.text());
        var discount = parseFloat($discountDelete.attr('data-discount'));

        $discountDelete.closest('.discount-item').remove();
        $transactionPrice.text((price + discount).toFixed(2));
        calculateTotal();

        $transactionItem.find('.discount-button').addClass('active');
    });

    $(document).on('click', '#transaction-submit-button', function () {
        var storeId = $(this).data('id');
        var storeType = $(this).data('type');
        alert(storeType)
        var paymentType = $('.payment-type.selected').attr('data-payment_type');
        var memo = $('#memo-input').val().trim();
        var $receiptResultWrapper = $('#receipt-result-wrapper');
        var subtotal = $receiptResultWrapper.find('#subtotal').text();
        var tax = $receiptResultWrapper.find('#tax-rate').data('tax');
        var items = {};

        $('.transaction-item').each(function() {
            var $transactionItem = $(this);
            var quantity = parseInt($transactionItem.find('.quantity-input').val().trim());
            var itemId = $transactionItem.attr('data-id');
            var itemName = $transactionItem.find('.transaction-name').text();
            var discount =  parseFloat($(this).find('.discount').text().replace('-', ''));
            var price = $(this).find('.quantity-input').attr('data-each');
            if (itemId in items) {
                items[itemId]['quantity'] +=  quantity;
                items[itemId]['discount'] +=  discount;
            } else {
                items[itemId] = {};
                items[itemId]['name'] = itemName;
                items[itemId]['quantity'] = quantity;
                items[itemId]['discount'] = discount;
                items[itemId]['price'] = price;
            }
        });

        var postData = {
            'payment_type': paymentType,
            'subtotal': subtotal,
            'tax': tax,
            'memo': memo,
            'items': items,
            'store_type': storeType,
            'store_id': storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $(this).siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/transaction/create_transaction/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                if(response['success']){
                    console.log(JSON.stringify(response));
                    alert('Transaction Created!');

                    var $receiptSection = $('#receipt-section');
                    $receiptSection.empty();
                    $receiptSection.append(receiptTemplate({'tax_percent': globals.tax_percent}));
                    $receiptSection.find('#tax-rate').data('tax', globals.tax);

                    buildMessage();


                    function buildMessage() {
                        //Create an ePOS-Print Builder object
                        var builder = new epson.ePOSBuilder();
                        // Create a print document
                        builder.addTextLang('en');
                        builder.addTextSmooth(true);
                        builder.addTextFont(builder.FONT_A);
                        builder.addTextSize(3, 3);
                        builder.addText('Hello,\tWorld!\n');
                        builder.addCut(builder.CUT_FEED);
                        // Acquire the print document
                        var request = builder.toString();
                        //alert(request);

                        //Set the end point address
                        var address = 'http://192.168.22.205/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000';
                        // Create an ePOS-Print object
                        var epos = new epson.ePOSPrint(address);
                        // Send the print document
                        epos.send(request);
                    }




                } else {
                    alert('ERROR CREATING TRANSACTION')
                }


            }
        });
    });
});