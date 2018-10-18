require('./../css/general.css');
require('./../css/inventory.css');
require('./../library/fontawesome/fontawesome.js');
require('./../library/tippy/tippy.css');

//handlebars
var inventoryTemplate = require('./../handlebars/inventory/inventory.hbs');
var itemLogTemplate = require('./../handlebars/inventory/item_log.hbs');
var settingsTemplate = require('./../handlebars/inventory/inventory_settings.hbs');
var rowTemplate = require('./../handlebars/inventory/row.hbs');
var storeTemplate = require('./../handlebars/operation/store.hbs');
var inventoryOperationTemplate = require('./../handlebars/inventory/inventory_operation.hbs');
var operationTemplate = require('./../handlebars/operation/operation.hbs');
var storeItemTemplate = require('./../handlebars/operation/store_item.hbs');

//libraries
var $ = require('jquery');
var helper = require('./../js/helpers.js');
require('./../library/tippy/tippy.js');
require('./../js/general.js');
require('./../library/calendar/calendar.js');

function init() {
    var activeStore = globals.stores[globals.active_store];

    $('#inventory-link').addClass('active');
    $('.store-container').append(storeItemTemplate({'stores': globals.stores, 'active_store': parseInt(globals.active_store)}));

    var $inventoryWrapper = $('#inventory-wrapper');
    $inventoryWrapper.append(inventoryTemplate({'stores_length': Object.keys(globals.stores).length, 'store': activeStore, 'boss_username': globals.boss_username}));

    var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
    $logWrapper.append(itemLogTemplate({'item_log': globals.store_log[globals.active_store]}));

    if(globals.active_store != '') {
        var $settingsWrapper = $inventoryWrapper.siblings('#settings-wrapper');
        $settingsWrapper.append(settingsTemplate({'columns': activeStore['columns'], 'settings': activeStore['settings']}));
    }
}

function tabHandler($clickedTab) {
    $clickedTab.siblings('.active').removeClass('active');
    $clickedTab.addClass('active');

    var $wrapper = $($clickedTab.attr('data-wrapper'));
    $wrapper.siblings('.active').removeClass('active');
    $wrapper.addClass('active');
}

function popupHandler(e, popupData, template) {
    e.stopPropagation();
    var $overlay = $('#operation-overlay');
    $overlay.empty();
    $overlay.addClass('active');
    if(template){
        $overlay.append(template(popupData));
    } else {
        $overlay.append(inventoryOperationTemplate(popupData));
    }
}

function createXmlHttpRequestObject() {
    if(window.XMLHttpRequest) {
        return new XMLHttpRequest();
    } else {
        return new ActiveXObject("Microsoft.XMLHTTP")
    }
}

function getLogReport(start_time, end_time) {
    var postData = {
        'start_time': Math.ceil(start_time.valueOf()/1000),
        'end_time': Math.ceil(end_time.valueOf()/1000)
    };

    $.ajax({
        url: globals.base_url + '/inventory/item_log/',
        data: postData,
        dataType: 'json',
        type: "GET",
        success: function (response) {
            //console.log(response);
            var $logWrapper = $('#log-wrapper');
            globals.item_log = response['item_log'];
            $logWrapper.empty();
            $logWrapper.append(itemLogTemplate(response));
        }
    });
}

$(document).ready(function() {
    init();

    $(document).on('click', '.tab:not(.active), .operation-tab:not(.active):not(.disabled)', function () {
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

    //FILE UPLOAD//
    $(document).on('click', '.file-upload-button', function () {
        var $itemFileUpload = $('#item-file-upload');
        $itemFileUpload.attr('data-id', $(this).closest('tr').attr('data-id'));
        $itemFileUpload.click();
    });

    $(document).on('change', '#item-file-upload', function () {
        var $fileUploadButton = $(this);
        var file = $fileUploadButton.get(0).files[0];
        var fileType = file["type"];
        var ValidImageTypes = ["image/jpeg", "image/png"];
        if ($.inArray(fileType, ValidImageTypes) < 0) {
            alert('Must be an image file: jpeg, png.');
            return;
        }

        var storeId = $('.establishment.active').attr('data-id');

        var formData = new FormData();
        formData.append('file', file);
        formData.append('id', storeId);
        formData.append('item_id', $fileUploadButton.attr('data-id'));

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/file_upload/',
            data: formData,
            type: "POST",
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
                //console.log(JSON.stringify(response));

            }
        });
    });
    //FILE UPLOAD//

    //SEARCH ITEM//
    $(document).on('keyup', '#search-input, #operation-search-input', function () {
        var $searchInput = $(this);
        var searchValue = $searchInput.val().trim().toLowerCase();
        var searchFilters = [];
        var $table = $($(this).attr('data-table') + ' tbody');

        $searchInput.siblings('.search-filter-wrapper').find('.column-filter:checked').each(function() {
            searchFilters.push($(this).val());
        });

        //loops through rows
        $table.find('tr').each(function() {
            var match = false;
            var $currentRow = $(this);
            //loops through filters and compares
            for (var i = 0; i < searchFilters.length; i++) {
                //find each filter value
                var filterValue = $currentRow.find('.' + searchFilters[i]).text().toLowerCase();
                //if find match
                if(filterValue.indexOf(searchValue) != -1) {
                    match = true;
                    break;
                }
            }

            if(match) {
                $currentRow.show();
            } else {
                $currentRow.hide();
            }
        })
    });

    $(document).on('click', '.column-filter', function () {
        var $columnFilter = $(this);
        $columnFilter.closest('.search-filter-wrapper').siblings('input').keyup();
    });
    //SEARCH ITEM//

    //ADD COLUMN FUNCTIONS//
    $(document).on('click', '#add-button', function (e) {
        var $activeInventory = $('.establishment.active');
        var store = globals.stores[$activeInventory.attr('data-id')];
        popupHandler(e, {type: "add", columns: store['columns'], 'picture_column': store['picture_column']});
    });

    $(document).on('click', '#add-column-submit', function () {
        var $activeInventory = $('.establishment.active');
        var columnName = $(this).siblings('#add-column-input').val();
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            column_name: columnName,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/add_column/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));

                // Show updated inventory
                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                // Remove popup
                $('#operation-overlay').removeClass('active');

                // CACHE THE DATA
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#add-column-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#add-column-wrapper').find('.error').text(response.responseText).show();
                }
            }
        });
    });

    $(document).on('click', '#add-picture-column-submit', function () {
        var $activeInventory = $('.establishment.active');
        var columnName = $(this).siblings('#add-picture-column-input').val();
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            column_name: columnName,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/add_picture_column/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));

                // Show updated inventory
                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                // Remove popup
                $('#operation-overlay').removeClass('active');

                // CACHE THE DATA
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#add-column-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#add-column-wrapper').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //ADD COLUMN FUNCTIONS//


    //ADD ITEM FUNCTIONS//
    $(document).on('click', '#add-item-submit', function () {
        var $activeInventory = $('.establishment.active');
        var $operationOverlay = $(this).closest('#operation-overlay');
        var storeId = $activeInventory.attr('data-id');

        var itemData = {};
        $operationOverlay.find('.add-item-input').each(function() {
            var $currentInput = $(this);
            itemData[$currentInput.attr('data-column')] = $currentInput.val();
        });

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/add_item/',
            data: JSON.stringify({'item': itemData, id: storeId}),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $operationOverlay.removeClass('active');
                var $inventoryTable = $('#inventory-table tbody');

                $inventoryTable.prepend(rowTemplate({'item': response['item'], 'columns': response['store']['columns']}));

                // CACHE THE DATA
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                var $wrapper = $('#add-item-wrapper');

                $wrapper.find('.error').each(function() {
                    $(this).hide();
                });

                if(response.status && response.status == 403) {
                    $wrapper.find('.error.permission').text('Permission Denied').show();
                } else {
                    var errorList = JSON.parse(response.responseText);
                    for (var i = 0; i < errorList.length; i++) {
                        var columnName = errorList[i][0];
                        var errorMsg = errorList[i][1];

                        $wrapper.find(".error[data-column='" + columnName + "']").text(errorMsg).show();
                    }
                }
            }
        });
    });
    //ADD ITEM FUNCTIONS//

    //EDIT COLUMN FUNCTIONS//
    $(document).on('click', '#edit-button', function (e) {
        var $activeInventory = $('.establishment.active');
        var storeId = $activeInventory.attr('data-id');

        popupHandler(e, {type: "edit", columns: globals.stores[storeId]['columns'], inventory: globals.stores[storeId]['inventory'], inventory_length: globals.stores[storeId]['inventory'].length});
    });

    $(document).on('click', '#edit-column-submit', function () {
        var $columnEditSubmit = $(this);
        var $activeInventory = $('.establishment.active');
        var $operationOverlay = $columnEditSubmit.closest('#operation-overlay');
        var prevColumnName = $operationOverlay.find('#edit-prev-column-input').val();
        var newColumnName = $operationOverlay.find('#edit-column-input').val();
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            new_column_name: newColumnName,
            prev_column_name: prevColumnName,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/edit_column/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                var $inventoryTable = $('#inventory-table');
                var $columnHeader = $inventoryTable.find('thead th[data-value="' + prevColumnName + '"]');
                //Edit column header
                $columnHeader.attr('data-value', newColumnName);
                $columnHeader.find('.column-text').text(newColumnName);
                //Edit filter
                var $filterContainer = $(".column-filter[value='" + prevColumnName + "']").parent();
                $filterContainer.html('<input class="column-filter" type="checkbox" value="' + newColumnName +'" checked=""> ' + newColumnName);
                //Close overlay
                $operationOverlay.removeClass('active');
                //CACHE
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#edit-column-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#edit-column-wrapper').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //EDIT COLUMN FUNCTIONS//


    //EDIT ITEM FUNCTIONS//
    $(document).on('click', '#operation-table.edit tbody tr', function () {
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        var $editStep2 = $('#edit-step-2');

        for (var key in item) {
            $editStep2.find("[data-column='" + key + "']").val(item[key]);
        }

        $editStep2.siblings('#edit-step-1').removeClass('active');
        $editStep2.addClass('active');
        $editStep2.find('#edit-item-submit').data('id', itemId);
    });

    $(document).on('click', '#edit-back-button', function () {
        var $editStep2 = $(this).closest('#edit-step-2');
        $editStep2.removeClass('active');
        $editStep2.siblings('#edit-step-1').addClass('active');
    });

    $(document).on('click', '#edit-item-submit', function () {
        var $editItemSubmit = $(this);
        var $activeInventory = $('.establishment.active');
        var itemId = $editItemSubmit.data('id');
        var $operationOverlay = $editItemSubmit.closest('#operation-overlay');
        var storeId = $activeInventory.attr('data-id');

        var itemData = {};

        $operationOverlay.find('.edit-item-input').each(function() {
            var $currentInput = $(this);
            itemData[$currentInput.attr('data-column')] = $currentInput.val();
        });

        var postData = {
            'item': itemData,
            'item_id': itemId,
            'id': storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/edit_item/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                //Replace old item with new item
                var $row = $('#inventory-table [data-id="' + itemId + '"]');
                $(rowTemplate({'item_id': itemId, 'item': response['item'], 'columns': response['store']['columns']})).insertAfter($row);
                $row.remove();
                //Remove popup
                $operationOverlay.removeClass('active');
                //Maintain current inventory in the frontend
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                var $wrapper = $('#edit-item-wrapper');

                $wrapper.find('.error').each(function() {
                    $(this).hide();
                });

                if(response.status && response.status == 403) {
                    $wrapper.find('.error.permission').text('Permission Denied').show();
                } else {
                    var errorList = JSON.parse(response.responseText);
                    for (var i = 0; i < errorList.length; i++) {
                        var columnName = errorList[i][0];
                        var errorMsg = errorList[i][1];

                        $wrapper.find(".error[data-column='" + columnName + "']").text(errorMsg).show();
                    }
                }
            }
        });
    });
    //EDIT ITEM FUNCTIONS//


    //DELETE COLUMN FUNCTIONS//
    $(document).on('click', '#delete-button', function (e) {
        var $activeInventory = $('.establishment.active');
        popupHandler(e, {type: "delete", columns: globals.stores[$activeInventory.attr('data-id')]['columns'], inventory: globals.stores[$activeInventory.attr('data-id')]['inventory'], inventory_length: Object.keys(globals.stores[$activeInventory.attr('data-id')]['inventory']).length});
    });

    $(document).on('click', '#delete-column-submit', function () {
        var columnName = $(this).siblings('#delete-column-input').val();
        var $activeInventory = $('.establishment.active');
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            column_name: columnName,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/delete_column/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                var $inventoryTable = $('#inventory-table');
                var deleteIndex = $inventoryTable.find('thead th[data-value="' + columnName + '"]').index();
                //Delete column header
                $inventoryTable.find('thead th').eq(deleteIndex).remove();
                //Delete rows of that delete column
                $inventoryTable.find('tbody tr').each(function() {
                    $(this).find('td').eq(deleteIndex).remove();
                });
                //Delete filter
                $(".column-filter[value='" + columnName + "']").parent().remove();
                //Close overlay
                $('#operation-overlay').removeClass('active');
                //Maintain current inventory in the frontend
                globals.stores[storeId] = response['store'];

                if(!globals.stores[storeId]['columns'].length) {
                    var $inventoryWrapper = $('#inventory-wrapper');
                    $inventoryWrapper.empty();
                    $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));
                }
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#delete-column-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#delete-column-wrapper').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //DELETE COLUMN FUNCTIONS//


    //DELETE ITEM FUNCTIONS//
    $(document).on('click', '#operation-table.delete tbody tr', function () {
        var $row = $(this);
        var $deleteStep2 = $('#delete-step-2');
        var $deleteItemContainer = $('#delete-item-container');
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        $deleteItemContainer.empty();
        $deleteItemContainer.append($row.parent().siblings('thead').clone());
        $deleteItemContainer.append('<tbody></tbody>');
        $deleteItemContainer.find('tbody').append($row.clone());

        $deleteStep2.siblings('#delete-step-1').removeClass('active');
        $deleteStep2.addClass('active');
        $deleteStep2.find('#delete-item-submit').data('id', itemId);
    });

    $(document).on('click', '#delete-back-button', function () {
        var $deleteStep2 = $(this).closest('#delete-step-2');
        $deleteStep2.removeClass('active');
        $deleteStep2.siblings('#delete-step-1').addClass('active');
    });

    $(document).on('click', '#delete-item-submit', function () {
        var $deleteItemSubmit = $(this);
        var itemId = $deleteItemSubmit.data('id');
        var $operationOverlay = $deleteItemSubmit.closest('#operation-overlay');
        var $activeInventory = $('.establishment.active');
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            item_id: itemId,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/delete_item/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $operationOverlay.removeClass('active');
                $('#inventory-table [data-id="' + itemId + '"]').remove();

                //CACHE
                globals.stores[storeId] = response['store'];
            },
            error: function (response) {
                var $wrapper = $('#delete-item-wrapper');

                $wrapper.find('.error').each(function() {
                    $(this).hide();
                });

                if(response.status && response.status == 403) {
                    $wrapper.find('.error.permission').text('Permission Denied').show();
                } else {
                    var errorList = JSON.parse(response.responseText);
                    for (var i = 0; i < errorList.length; i++) {
                        var columnName = errorList[i][0];
                        var errorMsg = errorList[i][1];

                        $wrapper.find(".error[data-column='" + columnName + "']").text(errorMsg).show();
                    }
                }
            }
        });
    });
    //DELETE ITEM FUNCTIONS//


    //IMPORT FILE FUNCTIONS//
    $(document).on('click', '#import-button', function (e) {
        popupHandler(e, {type: "import"});
    });

    $(document).on('click', '#file-upload-link', function () {
        $(this).siblings('#file-upload').click();
    });

    $(document).on('change', '#file-upload', function (e) {
        var file = $(this).get(0).files[0];
        var formData = new FormData();
        formData.append('excel_file', file);

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/read_excel/',
            data: formData,
            type: "POST",
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
                //console.log(JSON.stringify(response));
                popupHandler(e, {type: "import2", import_data: response});
            }
        });
    });

    $(document).on('click', '.include-input', function () {
        var $includeInput = $(this);
        var $importTable = $includeInput.closest('#import-table');
        var columnPosition = (parseInt($includeInput.attr('data-column')) + 1).toString();
        var $columnData = $importTable.find('tbody tr td:nth-child(' + columnPosition + ')');

        $columnData.each(function() {
            if($includeInput.prop('checked')) {
                $(this).addClass('included');
            } else {
                $(this).removeClass('included');
            }
        });
    });

    $(document).on('click', '#import-submit-button', function () {
        //Find all included columns
        var $importTable = $('#import-table');
        var column = [];
        var inventory = {};
        var $activeInventory = $('.establishment.active');
        var storeId = $activeInventory.attr('data-id');
        var id = 1;
        var storeInventory = globals.stores[storeId]['inventory'];
        var inventoryObject = {};

        for (var i = 0; i < storeInventory.length; i++) {
            inventoryObject[storeInventory[i][0]] = storeInventory[i][1];
        }

        var globalKeys = Object.keys(inventoryObject);

        if(Object.keys(globalKeys).length !== 0) {
            id = parseInt(globalKeys[globalKeys.length-1]);
        }

        //GET HEADERS
        $importTable.find('.include-input:checked').each(function() {
            var $includeInput = $(this);
            var columnPosition = parseInt($includeInput.attr('data-column'));
            var columnHeader = $importTable.find('.header-input[data-column="' + columnPosition + '"]').val();
            column.push(columnHeader.toLowerCase());
        });

        //GET ROWS
        $importTable.find('tbody tr').each(function() {
            var $included = $(this).find('.included');
            var row = {};

            $included.each(function(i) {
                var current_header = column[i];
                row[current_header] = $(this).text();
            });

            inventory[id.toString()] = row;
            id += 1;
        });

        var postData = {
            columns: column,
            inventory: inventory,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/import_submit/',
            data: JSON.stringify(postData),
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');
                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                //CACHE
                globals.stores[storeId] = response['store'];
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
    //IMPORT FILE FUNCTIONS//


    //EXPORT FILE FUNCTIONS//
    $(document).on('click', '#export-button', function (e) {
        popupHandler(e, {type: "export"});
    });

    $(document).on('click', '#export-submit', function () {
        var fileType = $('#export-type-input').val();
        var exportLink = document.getElementById('export-download');
        var store = globals.stores[$('.establishment.active').attr('data-id')];
        var storeInventory = store['inventory'];
        var columns = store['columns'];
        var inventory = {};
        var valid = false;
        var inventoryJson = [];

        for (var i = 0; i < storeInventory.length; i++) {
            inventory[storeInventory[i][0]] = storeInventory[i][1];
            inventoryJson.push(storeInventory[i][1]);
        }

        if(fileType == 'csv' || fileType == 'json') {
            $.ajax({
                headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
                url: globals.base_url + '/inventory/export_submit/',
                data: JSON.stringify({'columns': {}, 'inventory': {}, 'type': fileType}),
                dataType: 'json',
                type: "POST",
                success: function (response) {
                    valid = true;
                    callback();
                },
                error: function (response) {
                    if(response.status && response.status == 403) {
                        $('#export-wrapper').find('.error').text('Permission Denied').show();
                    }
                }
            });
        }

        if(fileType == 'json') {
            var tab = window.open();
        }

        function callback() {
            if (valid && fileType == 'csv') {
                var csvFile = '';

                for (var i = 0; i < columns.length; i++) {
                    if (i == columns.length - 1) {
                        csvFile += columns[i] + '\r\n';
                    } else {
                        csvFile += columns[i] + ',';
                    }
                }

                for (var p = 0; p < inventoryJson.length; p++) {
                    var currentRow = inventoryJson[p];

                    for (var c = 0; c < columns.length; c++) {
                        if (c == columns.length - 1) {
                            csvFile += '"' + currentRow[columns[c]] + '"\r\n';
                        } else {
                            csvFile += '"' + currentRow[columns[c]] + '",';
                        }
                    }
                }

                var blob = new Blob([csvFile], {type: 'text/csv;charset=utf-8;'});
                var url = URL.createObjectURL(blob);
                exportLink.setAttribute("href", url);
                exportLink.setAttribute("download", "inventory.csv");
                exportLink.click();
            } else if (valid && fileType == 'json') {
                tab.document.open();
                tab.document.write('<pre style="background:#000; color:#fff; margin: -8px;">' + JSON.stringify({'inventory': inventoryJson}, null, 2) + '</pre>');
                tab.document.close();
            }
        }

        if(fileType == 'excel') {
            var xmlHttp = createXmlHttpRequestObject();
            xmlHttp.open('POST', '/inventory/export_submit/', true);
            xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xmlHttp.setRequestHeader("X-CSRFToken", $('input[name="csrfmiddlewaretoken"]').attr('value'));
            xmlHttp.responseType = 'blob';

            xmlHttp.onload = function() {
                if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
                    var blob = this.response;
                    var contentTypeHeader = xmlHttp.getResponseHeader("Content-Type");
                    exportLink.setAttribute("href", window.URL.createObjectURL(new Blob([blob], {type: contentTypeHeader})));
                    exportLink.setAttribute("download", "inventory.xlsx");
                    exportLink.click();
                } else if (xmlHttp.status === 403) {
                    $('#export-wrapper').find('.error').text('Permission Denied').show();
                }
           };
           xmlHttp.send(JSON.stringify({'columns': columns, 'inventory': inventoryJson, 'type': fileType}));
        }
    });
    //EXPORT FILE FUNCTIONS//

     //DROP TABLE FUNCTIONS//
    $(document).on('click', '#drop-table-button', function (e) {
        popupHandler(e, {type: "drop_table"});
    });

    $(document).on('click', '#drop-table-submit', function () {
        var $activeInventory = $('.establishment.active');
        var storeId = $activeInventory.attr('data-id');

        var postData = {
            drop_table: true,
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/drop_table/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');

                //CACHE
                globals.stores[storeId] = response['store'];

                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#drop-table-wrapper').find('.error').text('Permission Denied').show();
                }
            }
        });
    });
    //DROP TABLE FUNCTIONS//


    //RECIEVED FUNCTIONS//
    $(document).on('click', '#receiving-button', function (e) {
        var store = globals.stores[$('.establishment.active').attr('data-id')];

        if(!store['link_columns']['quantity']){
            popupHandler(e, {type: "quantity", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else if(!store['link_columns']['name']) {
            popupHandler(e, {type: "name", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else {
            popupHandler(e, {type: "received", columns: store['columns'], inventory: store['inventory'], inventory_length: store['inventory'].length});
        }
    });

    $(document).on('click', '#operation-table.add tbody tr', function () {
        var $row = $(this);
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        var $deleteStep2 = $('#received-step-2');
        var $deleteItemContainer = $('#received-item-container');
        $deleteItemContainer.empty();
        $deleteItemContainer.append($row.parent().siblings('thead').clone());
        $deleteItemContainer.append('<tbody></tbody>');
        $deleteItemContainer.find('tbody').append($row.clone());

        $deleteStep2.siblings('#received-step-1').removeClass('active');
        $deleteStep2.addClass('active');
        $deleteStep2.find('#received-item-submit').data('id', itemId);
    });

    $(document).on('click', '#received-back-button', function () {
        var $deleteStep2 = $(this).closest('#received-step-2');
        $deleteStep2.removeClass('active');
        $deleteStep2.siblings('#received-step-1').addClass('active');
    });

    $(document).on('click', '#received-item-submit', function () {
        var storeId = $('.establishment.active').attr('data-id');

        var postData = {
            id: storeId,
            change_value: $('#received-input').val(),
            details: $('#details-input').val(),
            item_id: $(this).data('id')
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/received/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');

                globals.stores[storeId] = response['store'];
                globals.store_log[storeId] = response['item_log'];

                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
                $logWrapper.empty();
                $logWrapper.append(itemLogTemplate({'item_log': response['item_log']}));

                tabHandler($('#log-tab'));
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#received-step-2').find('.error').text('Permission Denied').show();
                } else {
                    $('#received-step-2').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //RECEIVED FUNCTIONS//

    //DAMAGED FUNCTIONS//
    $(document).on('click', '#damaged-button', function (e) {
        var store = globals.stores[$('.establishment.active').attr('data-id')];

        if(!store['link_columns']['quantity']){
            popupHandler(e, {type: "quantity", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else if(!store['link_columns']['name']) {
            popupHandler(e, {type: "name", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else {
            popupHandler(e, {type: "damaged", columns: store['columns'], inventory: store['inventory'], inventory_length: store['inventory'].length});
        }
    });

    $(document).on('click', '#operation-table.delete.damaged tbody tr', function () {
        var $row = $(this);
        var $deleteStep2 = $('#damaged-step-2');
        var $deleteItemContainer = $('#damaged-item-container');
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        $deleteItemContainer.empty();
        $deleteItemContainer.append($row.parent().siblings('thead').clone());
        $deleteItemContainer.append('<tbody></tbody>');
        $deleteItemContainer.find('tbody').append($row.clone());

        $deleteStep2.siblings('#damaged-step-1').removeClass('active');
        $deleteStep2.addClass('active');
        $deleteStep2.find('#damaged-item-submit').data('id', itemId);
    });

    $(document).on('click', '#damaged-back-button', function () {
        var $deleteStep2 = $(this).closest('#damaged-step-2');
        $deleteStep2.removeClass('active');
        $deleteStep2.siblings('#damaged-step-1').addClass('active');
    });

    $(document).on('click', '#damaged-item-submit', function () {
        var storeId = $('.establishment.active').attr('data-id');
        var postData = {
            id: storeId,
            change_value: $('#damaged-input').val(),
            details: $('#details-input').val(),
            item_id: $(this).data('id')
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/damaged/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');

                globals.stores[storeId] = response['store'];

                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
                $logWrapper.empty();
                $logWrapper.append(itemLogTemplate({'item_log': response['item_log']}));

                tabHandler($('inventory-tab'));
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#damaged-step-2').find('.error').text('Permission Denied').show();
                } else {
                    $('#damaged-step-2').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //DAMAGED FUNCTIONS//

    //RESET COST FUNCTIONS//
    $(document).on('click', '#reset-cost-button', function (e) {
        var store = globals.stores[$('.establishment.active').attr('data-id')];

        if(!store['link_columns']['cost']){
            popupHandler(e, {type: "cost", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else if(!store['link_columns']['name']) {
            popupHandler(e, {type: "name", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else {
            popupHandler(e, {type: "reset_cost", columns: store['columns'], inventory: store['inventory'], inventory_length: store['inventory'].length});
        }
    });

    $(document).on('click', '#reset-cost-back-button', function () {
        var $deleteStep2 = $(this).closest('#reset-cost-step-2');
        $deleteStep2.removeClass('active');
        $deleteStep2.siblings('#reset-cost-step-1').addClass('active');
    });

    $(document).on('click', '#operation-table.reset-cost tbody tr', function () {
        var $row = $(this);
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        var $deleteStep2 = $('#reset-cost-step-2');
        var $deleteItemContainer = $('#reset-cost-item-container');
        $deleteItemContainer.empty();
        $deleteItemContainer.append($row.parent().siblings('thead').clone());
        $deleteItemContainer.append('<tbody></tbody>');
        $deleteItemContainer.find('tbody').append($row.clone());

        $deleteStep2.siblings('#reset-cost-step-1').removeClass('active');
        $deleteStep2.addClass('active');
        $deleteStep2.find('#reset-cost-item-submit').data('id', itemId);
    });

    $(document).on('click', '#reset-cost-item-submit', function () {
        var storeId = $('.establishment.active').attr('data-id');
        var postData = {
            id: storeId,
            change_value: $('#reset-cost-input').val(),
            details: $('#details-input').val(),
            item_id: $(this).data('id')
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/reset_cost/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');

                globals.stores[storeId] = response['store'];

                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
                $logWrapper.empty();
                $logWrapper.append(itemLogTemplate({'item_log': response['item_log']}));

                tabHandler($('inventory-tab'));
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#reset-cost-step-2').find('.error').text('Permission Denied').show();
                } else {
                    $('#reset-cost-step-2').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //RESET COST FUNCTIONS//

    //RESET PRICE FUNCTIONS//
    $(document).on('click', '#reset-price-button', function (e) {
        var store = globals.stores[$('.establishment.active').attr('data-id')];

        if(!store['link_columns']['price']){
            popupHandler(e, {type: "price", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else if(!store['link_columns']['name']) {
            popupHandler(e, {type: "name", columns: store['columns'], link_columns: store['link_columns']}, operationTemplate);
        } else {
            popupHandler(e, {type: "reset_price", columns: store['columns'], inventory: store['inventory'], inventory_length: store['inventory'].length});
        }
    });

    $(document).on('click', '#reset-price-back-button', function () {
        var $deleteStep2 = $(this).closest('#reset-price-step-2');
        $deleteStep2.removeClass('active');
        $deleteStep2.siblings('#reset-price-step-1').addClass('active');
    });

    $(document).on('click', '#operation-table.reset-price tbody tr', function () {
        var $row = $(this);
        var itemId = $(this).attr('data-id');
        var storeInventory = globals.stores[$('.establishment.active').attr('data-id')]['inventory'];
        var $deleteStep2 = $('#reset-price-step-2');
        var $deleteItemContainer = $('#reset-price-item-container');

        for (var i = 0; i < storeInventory.length; i++) {
            var currentId = storeInventory[i][0];
            if(currentId == itemId) {
                var item = storeInventory[i][1];
                break;
            }
        }

        $deleteItemContainer.empty();
        $deleteItemContainer.append($row.parent().siblings('thead').clone());
        $deleteItemContainer.append('<tbody></tbody>');
        $deleteItemContainer.find('tbody').append($row.clone());

        $deleteStep2.siblings('#reset-price-step-1').removeClass('active');
        $deleteStep2.addClass('active');
        $deleteStep2.find('#reset-price-item-submit').data('id', itemId);
    });

    $(document).on('click', '#reset-price-item-submit', function () {
        var storeId = $('.establishment.active').attr('data-id');
        var postData = {
            id: storeId,
            change_value: $('#reset-price-input').val(),
            details: $('#details-input').val(),
            item_id: $(this).data('id')
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/inventory/reset_price/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));
                $('#operation-overlay').removeClass('active');

                globals.stores[storeId] = response['store'];

                var $inventoryWrapper = $('#inventory-wrapper');
                $inventoryWrapper.empty();
                $inventoryWrapper.append(inventoryTemplate({'store': response['store'], 'boss_username': globals.boss_username}));

                var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
                $logWrapper.empty();
                $logWrapper.append(itemLogTemplate({'item_log': response['item_log']}));

                tabHandler($('inventory-tab'));
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#reset-price-step-2').find('.error').text('Permission Denied').show();
                } else {
                    $('#reset-price-step-2').find('.error').text(response.responseText).show();
                }
            }
        });
    });
    //RESET PRICE FUNCTIONS//


    // UPDATE TRANSACTION
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

        getLogReport(firstDate, lastDate);

        $calendarWrapper.find('#calendar-exit').click();
    });
    // UPDATE TRANSACTION


    // SAVE SETTINGS
    //$(document).on('click', '#inventory-settings-submit', function () {
    //    //Get filters, Get default tax, Get every store tax
    //    var $orderByInput = $('#order-by-input');
    //    var $reverseCheckbox = $('#reverse-checkbox');
    //    var $activeInventory = $('.establishment.active');
    //
    //    var postData = {
    //        id: $activeInventory.attr('data-id'),
    //        'order_by': $orderByInput.val(),
    //        'reverse': $reverseCheckbox.is(":checked")
    //    };
    //
    //    $.ajax({
    //        headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
    //        url: globals.base_url + '/inventory/save_settings/',
    //        data: JSON.stringify(postData),
    //        dataType: 'json',
    //        type: "POST",
    //        success: function (response) {
    //            globals.inventory = response['inventory'];
    //
    //            var $inventoryWrapper = $('#inventory-wrapper');
    //            $inventoryWrapper.empty();
    //            $inventoryWrapper.append(inventoryTemplate({'columns': globals.columns, 'inventory': globals.inventory}));
    //
    //            var $settingResult = $('#settings-result');
    //            $settingResult.removeClass('denied');
    //            $settingResult.addClass('success');
    //            $settingResult.text('Saved!');
    //            $settingResult.show();
    //            $settingResult.fadeOut(2000);
    //        },
    //        error: function (response) {
    //            if(response.status && response.status == 403) {
    //                var $settingResult = $('#settings-result');
    //                $settingResult.removeClass('success');
    //                $settingResult.addClass('denied');
    //                $settingResult.text('Permission Denied');
    //                $settingResult.show();
    //                $settingResult.fadeOut(2000);
    //            }
    //        }
    //    });
    //});
    // SAVE SETTINGS


    // LINK COLUMN //
    $(document).on('click', '#link-column-submit', function () {
        var $operationOverlay = $('#operation-overlay');
        var $linkColumnInput = $operationOverlay.find('#link-column-input');
        var storeId = $('.establishment.active').attr('data-id');

        var postData = {
            link_type: $linkColumnInput.attr('data-type'),
            column: $linkColumnInput.val(),
            id: storeId
        };

        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/operation/link_columns/',
            data: postData,
            dataType: 'json',
            type: "POST",
            success: function (response) {
                //console.log(JSON.stringify(response));

                // Remove popup
                $('#operation-overlay').removeClass('active');

                // CACHE THE DATA
                globals.stores[storeId] = response['store'];

                console.log(globals.stores[storeId])

                console.log(response['store'])
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#link-column-wrapper').find('.error').text('Permission Denied').show();
                }
            }
        });
    });
    // LINK COLUMN //

    // STORE //
    $(document).on('click', '#create-store-button, #create-store-link', function (e) {
        popupHandler(e, {}, storeTemplate);
    });

    $(document).on('click', '#create-store-submit', function () {
        $.ajax({
            headers: {"X-CSRFToken": $('input[name="csrfmiddlewaretoken"]').attr('value')},
            url: globals.base_url + '/store/create_store/',
            data: {'store_name': $('#store-name-input').val()},
            dataType: 'json',
            type: "POST",
            success: function (response) {
                console.log(JSON.stringify(response));
                var storeId = response['id'].toString();
                var $storeContainer = $('.store-container');
                globals.stores[storeId] = response;

                $storeContainer.empty();
                $storeContainer.append(storeItemTemplate({'stores': globals.stores}));
                $('.store-item[data-id="' + storeId + '"]').click();
                $('#operation-overlay').removeClass('active');
            },
            error: function (response) {
                if(response.status && response.status == 403) {
                    $('#link-column-wrapper').find('.error').text('Permission Denied').show();
                } else {
                    $('#operation-overlay').find('.error').text(response.responseText).show();
                }
            }
        });
    });

    $(document).on('click', '.establishment:not(.active)', function (e) {
        var $establishment = $(this);
        $establishment.closest('.inner-side-wrapper').find('.active').removeClass('active');
        $establishment.addClass('active');

        if ($establishment.hasClass('store-item')) {
            var storeId = $establishment.attr('data-id');
            var currentStore = globals.stores[storeId];

            var $inventoryWrapper = $('#inventory-wrapper');
            $inventoryWrapper.empty();
            $inventoryWrapper.append(inventoryTemplate({'store': currentStore, 'boss_username': globals.boss_username}));

            var $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
            $logWrapper.empty();
            $logWrapper.append(itemLogTemplate({'item_log': globals.store_log[storeId]}));
        }
        //else {
        //    $inventoryWrapper = $('#inventory-wrapper');
        //    $inventoryWrapper.empty();
        //    $inventoryWrapper.append(inventoryTemplate({'columns': globals.columns, 'inventory': globals.inventory}));
        //
        //    $logWrapper = $inventoryWrapper.siblings('#log-wrapper');
        //    $logWrapper.empty();
        //    $logWrapper.append(itemLogTemplate({'item_log': globals.item_log}));
        //}
    });
    // STORE //
});