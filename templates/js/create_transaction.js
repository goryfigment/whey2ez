require('./../css/general.css');
require('./../css/create_transaction.css');
require('./../library/fontawesome/fontawesome.js');

var $ = require('jquery');
var helper = require('./../js/helpers.js');

//handlebars
var searchItemTemplate = require('./../handlebars/create_transaction/search_item.hbs');
var resultItemTemplate = require('./../handlebars/create_transaction/result_item.hbs');
var discountItemTemplate = require('./../handlebars/create_transaction/discount_item.hbs');


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

    subtotal = helper.currencyFormat(subtotal*100);



    var tax = helper.currencyFormat((Math.round(subtotal*taxRate*100)/100)*100);
    var total = helper.currencyFormat(subtotal*100 + tax*100);

    var $receiptResultWrapper = $('#receipt-result-wrapper');
    $receiptResultWrapper.find('#subtotal').html(subtotal);
    $receiptResultWrapper.find('#tax').html(tax);
    $receiptResultWrapper.find('#total').html(total);
}

function getReceipt(data) {
    $.ajax({
        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
        url: globals.base_url + '/transaction/receipt/',
        data: JSON.stringify({'transaction': data}),
        dataType: 'json',
        type: "POST",
        success: function (response) {
            if(response['success']){
                console.log(JSON.stringify(response));
            }
        },
        error: function (response) {
            alert('ERROR CREATING RECEIPT')
        }
    });
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

        var $generatedHtml = $(resultItemTemplate(itemData));
        $generatedHtml.data('item', itemData);
        $resultContainer.append($generatedHtml);

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
        var $discountItem = $transactionItem.find('.discount-item');
        var $eachText = $quantityInput.siblings('.each-text');
        var quantity = parseInt($quantityInput.val());
        var itemSubtotal = (parseFloat($transactionItem.data('item')['price'])*100)*quantity;

        if (quantity == 0) {
            quantity = 1
        }

        if($discountItem.attr('data-type') == 'percent') {

            var discount = parseFloat($discountItem.attr('data-percent'))/100 * itemSubtotal;
            $discountItem.find('.discount').text(helper.currencyFormat(discount)+'-');
            var itemTotal = itemSubtotal - discount;
            var eachDiscountedItem = helper.currencyFormat(itemTotal/quantity);
            $quantityInput.attr('data-each', eachDiscountedItem);
            $eachText.text('@ ' + eachDiscountedItem + ' ea)');
        } else if($discountItem.attr('data-type') == 'dollar') {
            discount = parseFloat($discountItem.find('.discount-delete').attr('data-discount'))*100;
            itemTotal = itemSubtotal - discount;
            eachDiscountedItem = helper.currencyFormat(Math.ceil(itemTotal/quantity));
            $quantityInput.attr('data-each', eachDiscountedItem);
            $eachText.text('@ ' + eachDiscountedItem + ' ea)');
        } else {
            itemTotal = itemSubtotal;
        }

        var price = helper.currencyFormat(itemTotal);

        $transactionPrice.text(helper.currencyFormat(itemTotal));
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
        var $quantityInput = $transactionItem.find('.quantity-input');
        var quantity = parseInt($quantityInput.val());
        if(quantity == 0){
            quantity = 1;
        }

        var $eachText = $quantityInput.siblings('.each-text');

        if(moneyValue != '') {
            if(numberRegex.test(moneyValue)) {
                var discount = parseFloat(moneyValue);
                $discountWrapper.html(discountItemTemplate({'type': 'dollar', 'total': discount.toFixed(2)}));
                $discountButton.removeClass('active');
                $discountSubmitWrapper.removeClass('active');

                var itemTotalDiscounted = transactionPrice*100 - discount*100;
                var eachDiscountedItem = helper.currencyFormat(itemTotalDiscounted/quantity);

                $quantityInput.attr('data-each', eachDiscountedItem);
                $eachText.text('@ ' + eachDiscountedItem + ' ea)');
                $transactionPrice.text(helper.currencyFormat(itemTotalDiscounted));
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

                itemTotalDiscounted = transactionPrice*100 - discount*100;
                eachDiscountedItem = helper.currencyFormat(itemTotalDiscounted/quantity);

                $quantityInput.attr('data-each', eachDiscountedItem);
                $eachText.text('@ ' + eachDiscountedItem + ' ea)');
                $transactionPrice.text(helper.currencyFormat(itemTotalDiscounted));
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
        var $quantityInput = $transactionItem.find('.quantity-input');
        var $eachText = $quantityInput.siblings('.each-text');
        var quantity = parseInt($quantityInput.val());
        if(quantity == 0){
            quantity = 1;
        }


        $discountDelete.closest('.discount-item').remove();
        var itemSubtotal = price*100 + discount*100;
        var eachItem = helper.currencyFormat(itemSubtotal/quantity);

        $quantityInput.attr('data-each', eachItem);
        $eachText.text('@ ' + eachItem + ' ea)');

        $transactionPrice.text(helper.currencyFormat(itemSubtotal));

        calculateTotal();

        $transactionItem.find('.discount-button').addClass('active');
    });

    $(document).on('click', '#transaction-submit-button', function () {
        var storeId = $(this).data('id');
        var storeType = $(this).data('type');
        var paymentType = $('.payment-type.selected').attr('data-payment_type');
        var memo = $('#memo-input').val().trim();
        var $receiptResultWrapper = $('#receipt-result-wrapper');
        var subtotal = $receiptResultWrapper.find('#subtotal').text();
        var tax = $receiptResultWrapper.find('#tax-rate').data('tax');
        var taxRate = $receiptResultWrapper.find('#tax-rate').text();
        var taxTotal = $receiptResultWrapper.find('#tax').text();
        var total = $receiptResultWrapper.find('#total').text();
        var items = {};

        $('.transaction-item').each(function() {
            var $transactionItem = $(this);
            var quantity = parseInt($transactionItem.find('.quantity-input').val().trim());
            var itemId = $transactionItem.attr('data-id');
            var itemName = $transactionItem.find('.transaction-name').text();
            var discount =  parseFloat($(this).find('.discount').text().replace('-', ''));
            var price = $transactionItem.data('item')['price'];
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

        for (var key in items) {
            var current_item = items[key];
            current_item['discount'] = helper.currencyFormat(parseFloat(current_item['discount'])*100);
        }

        var postData = {
            'payment_type': paymentType,
            'subtotal': subtotal,
            'tax': tax,
            'memo': memo,
            'items': items,
            'store_type': storeType,
            'store_id': storeId,
            'tax_rate': taxRate,
            'tax_total': taxTotal,
            'total': total,
            'tax_percent': globals.tax_percent
        };

        $.ajax({
            headers: {"X-CSRFToken": $(this).siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/transaction/create_transaction/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                console.log(JSON.stringify(response));

                for (var key in postData['items']) {
                    var current_item = items[key];
                    current_item['paid'] = helper.currencyFormat(parseFloat(current_item['price'])*100 - parseFloat(current_item['discount'])*100);
                }

                getReceipt(postData);

                alert('Transaction Created!');

                var $receiptSection = $('#receipt-section');
                $receiptSection.empty();
                $receiptSection.append(receiptTemplate({'tax_percent': globals.tax_percent}));
                $receiptSection.find('#tax-rate').data('tax', globals.tax);
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    alert('Permission Denied');
                } else {
                    alert(response.responseText);
                }
            }
        });
    });
});