require('./../css/general.css');
require('./../css/login.css');
var $ = require('jquery');

$(document).ready(function() {
    $(document).on('click', '#login', function () {
        var $submit = $(this);
        var $loginContainer = $submit.closest('#login-container');

        var postData = {
            'username': $loginContainer.find('#username').val(),
            'password': $loginContainer.find('#password').val()
        };

        $.ajax({
            headers: {"X-CSRFToken": $submit.siblings('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/account/login/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                if (response['success']) {
                    window.location.replace(globals.base_url + '/inventory');
                }
            },
            error: function (response) {
                $('.error').show();
            }
        });
    });
});