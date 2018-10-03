require('./../css/general.css');
require('./../css/employee.css');
require('./../library/fontawesome/fontawesome.js');

//handlebars
//var inventoryTemplate = require('./../handlebars/inventory/inventory.hbs');
//var rowTemplate = require('./../handlebars/inventory/row.hbs');
var employeeOperationTemplate = require('./../handlebars/employee/employee_operation.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../js/general.js');

function init() {
    $('#employee-link').addClass('active');
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
    $overlay.append(employeeOperationTemplate(popupData));
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

    //EMPLOYEE TYPE//
    $(document).on('click', '#create-employee-type-link, #create-employee-button', function (e) {
        popupHandler(e, {type: "employee_type"});
    });

    $(document).on('click', '#create-user-type-submit', function () {
        var $operationOverlay = $('#operation-overlay');

        var postData = {
            permissions: {}
        };

        $operationOverlay.find('.checkbox-input').each(function() {
            var $checkboxInput = $(this);

            postData['permissions'][$checkboxInput.attr('data-name')] = $checkboxInput.prop('checked');
        });

        postData['name'] = $operationOverlay.find('#employee-type-input').val();

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/employee/create_user_type/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $operationOverlay.removeClass('active');
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    var $settingResult = $('#settings-result');
                    $settingResult.removeClass('success');
                    $settingResult.addClass('denied');
                    $settingResult.text('Permission Denied');
                    $settingResult.show();
                    $settingResult.fadeOut(2000);
                } else {
                    $('.operation-popup-container').find('.error').text(response.responseText).show()
                }
            }
        });
    });
    //EMPLOYEE TYPE//

    //GET EMPLOYEE TYPE//
    $(document).on('click', '#user-type-settings', function (e) {
        var userTypeId = $(this).closest('.user-type-item').attr('data-id');

        var getData = {
            'user_type': userTypeId
        };

        $.ajax({
            url: globals.base_url + '/employee/get_employee_type/',
            data: getData,
            dataType: 'json',
            type: "GET",
            success: function (response) {
                response['type'] = "employee_type";
                response['columns'] = globals.columns;
                response['edit'] = true;
                popupHandler(e, response);

                $('#edit-user-type-submit').data('id', userTypeId);
                $('#delete-user-type-submit').data('id', userTypeId);
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    var $settingResult = $('#settings-result');
                    $settingResult.removeClass('success');
                    $settingResult.addClass('denied');
                    $settingResult.text('Permission Denied');
                    $settingResult.show();
                    $settingResult.fadeOut(2000);
                } else {
                    $('.operation-popup-container').find('.error').text(response.responseText).show()
                }
            }
        });
    });
    //GET EMPLOYEE TYPE//


    //EDIT EMPLOYEE TYPE//
    $(document).on('click', '#edit-user-type-submit', function () {
        var $operationOverlay = $('#operation-overlay');

        var postData = {
            permissions: {}
        };

        $operationOverlay.find('.checkbox-input').each(function() {
            var $checkboxInput = $(this);
            postData['permissions'][$checkboxInput.attr('data-name')] = $checkboxInput.prop('checked');
        });

        postData['name'] = $operationOverlay.find('#employee-type-input').val();
        postData['user_type'] = $(this).data('id');

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/employee/edit_user_type/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                console.log(JSON.stringify(response));

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
                } else {
                    $('.operation-popup-container').find('.error').text(response.responseText).show()
                }
            }
        });
    });
    //EDIT EMPLOYEE TYPE//


    //DELETE EMPLOYEE TYPE//
    $(document).on('click', '#delete-user-type-submit', function () {

        var userTypeId = $(this).data('id');

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/employee/delete_user_type/',
            data: {'user_type': userTypeId},
            dataType: 'json',
            type: "POST",
            success: function (response) {
                $('#operation-overlay').removeClass('active');
                $('.user-type-item[data-id="' + userTypeId + '"]').remove();
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    var $settingResult = $('#settings-result');
                    $settingResult.removeClass('success');
                    $settingResult.addClass('denied');
                    $settingResult.text('Permission Denied');
                    $settingResult.show();
                    $settingResult.fadeOut(2000);
                } else {
                    $('.operation-popup-container').find('.error').text(response.responseText).show()
                }
            }
        });
    });
    //DELETE EMPLOYEE TYPE//


    //CREATE USER//
    $(document).on('click', '#user-create', function (e) {
        popupHandler(e, {type: "create_employee", stores: globals.stores, user_types: globals.user_types, user_type_id: parseInt($(this).attr('data-id'))});
    });

    $(document).on('change', '#assign-store-input', function () {
        var $input = $(this);
        var $inputDescriptionWrapper = $input.siblings('.input-description-wrapper');
        $inputDescriptionWrapper.find('.active').removeClass('active');
        var $description = $inputDescriptionWrapper.find('.input-description[data-type="' + $input.val() + '"]');
        $description.addClass('active');
    });

    $(document).on('click', '#create-employee-submit', function () {
        var $operationOverlay = $('#operation-overlay');
        var userType = $operationOverlay.find('#user-type-input').val();
        var connection = $operationOverlay.find('#assign-store-input').val();
        var firstName = $operationOverlay.find('#first-name-input').val();
        var lastName = $operationOverlay.find('#last-name-input').val();
        var username = $operationOverlay.find('#username-input').val();
        var password = $operationOverlay.find('#password-input').val();

        var postData = {
            'user_type': userType,
            'connection': connection,
            'username': username,
            'email': connection,
            'password': password,
            'first_name': firstName,
            'last_name': lastName,
            'store': null
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/employee/register/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                console.log(response);
            },
            error: function (response) {
                console.log(JSON.stringify(response.responseJSON));
            }
        });
    });
    //CREATE USER//
});