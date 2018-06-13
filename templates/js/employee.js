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
        popupHandler(e, {type: "employee_type", columns: globals.columns});
    });

    $(document).on('click', '#create-user-type-submit', function (e) {
        var $operationOverlay = $('#operation-overlay');

        var visibleColumns = [];
        var postData = {
            permissions: {}
        };

        $operationOverlay.find('.checkbox-input').each(function() {
            var $checkboxInput = $(this);

            if ($checkboxInput.attr('data-type') == 'columns' && $checkboxInput.prop('checked')) {
                visibleColumns.push($checkboxInput.attr('data-name'));
            } else {
                postData['permissions'][$checkboxInput.attr('data-name')] = $checkboxInput.prop('checked');
            }
        });

        postData['visible_columns'] = visibleColumns;
        postData['name'] = $operationOverlay.find('#employee-type-input').val();

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/employee/create_user_type/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                console.log(JSON.stringify(response));
                $operationOverlay.removeClass('active');
            },
            error: function (response) {
                console.log(JSON.stringify(response.responseJSON['error_msg']));
            }
        });
    });
    //EMPLOYEE TYPE//

    //CREATE USER//
    $(document).on('click', '#user-create', function (e) {
        popupHandler(e, {type: "create_employee", user_types: globals.user_types, user_type_id: $(this).attr('data-id')});
    });

    $(document).on('change', '#assign-store-input', function () {
        var $input = $(this);
        var $inputDescriptionWrapper = $input.siblings('.input-description-wrapper');
        $inputDescriptionWrapper.find('.active').removeClass('active');
        var $description = $inputDescriptionWrapper.find('.input-description[data-type="' + $input.val() + '"]')
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
                //var error = response.responseJSON['error_msg'];
                //
                //if (error == 'Username must be between 3 to 15 characters.') {
                //    var $error = $('.error.username');
                //    $error.text(error);
                //    $error.show();
                //} else if(error == 'Username exists.') {
                //    $error = $('.error.username');
                //    $error.text('Username is not available.');
                //    $error.show();
                //}
                //
                //if (error == 'Password must be 8 characters or more.') {
                //    $error = $('.error.password');
                //    $error.text(error);
                //    $error.show();
                //
                //} else if(error == 'Invalid password.') {
                //    $error = $('.error.password');
                //    $error.text('Password must contain letter and digit.');
                //    $error.show();
                //}
                //
                //if(error == 'Invalid email.') {
                //    $error = $('.error.email');
                //    $error.text('Must be a valid email.');
                //    $error.show();
                //} else if(error == 'Email exists.') {
                //    $error = $('.error.email');
                //    $error.text('Email is not available.');
                //    $error.show();
                //}
                //
                //if(error == 'Must have a first name.') {
                //    $error = $('.error.email');
                //    $error.show();
                //}
                //
                //if(error == 'Must have a last name.') {
                //    $error = $('.error.email');
                //    $error.show();
                //}
            }
        });
    });
    //CREATE USER//
});