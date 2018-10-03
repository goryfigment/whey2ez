//handlebars
var linkColumnsTemplate = require('./../handlebars/operation/link_columns.hbs');
var storeItemTemplate = require('./../handlebars/operation/store_item.hbs');
//libraries
var $ = require('jquery');

function popupHandler(e, popupData, template) {
    e.stopPropagation();
    var $overlay = $('#operation-overlay');
    $overlay.empty();
    $overlay.addClass('active');
    $overlay.append(template(popupData));
}

$(document).ready(function() {
    $(document).on('click', '.link-columns-button', function (e) {
        popupHandler(e, globals.stores[$(this).closest('.store-item').attr('data-id')], linkColumnsTemplate);
    });

    $(document).on('click', '#link-columns-submit', function () {
        var $wrapper = $('#operation-settings-scroll-wrapper');

        var postData = {
            'store_id': $(this).attr('data-id'),
            'link_columns': {
                'name': $wrapper.find('#name-column-input').val(),
                'price': $wrapper.find('#price-column-input').val(),
                'quantity': $wrapper.find('#quantity-column-input').val(),
                'cost': $wrapper.find('#cost-column-input').val()
            }
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/account/save_settings/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //JSON.stringify(response);
                var $storeContainer = $('.store-container');
                $storeContainer.empty();
                $storeContainer.append(storeItemTemplate({'stores': globals.stores}));

                $('#operation-overlay').removeClass('active');
                globals.stores[response['id']] = response;
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#import-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#import-wrapper').find('.error').text(response.responseText).show();
                }
            }
        });
    });


});
