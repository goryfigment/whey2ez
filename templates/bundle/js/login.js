webpackJsonp([6],{

/***/ 35:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(25);
__webpack_require__(36);
var $ = __webpack_require__(6);

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

/***/ }),

/***/ 36:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })

},[35]);