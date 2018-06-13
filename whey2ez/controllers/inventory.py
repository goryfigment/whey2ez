import json, time
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.forms.models import model_to_dict
import pandas as pd
from io import BytesIO as IO
from whey2ez.controllers.operation import inventory_operation
import whey2ez.modules.checker as checker
from whey2ez.modules.base import get_boss, get_establishment, sort_inventory
from whey2ez.models import ItemLog
from whey2ez.decorators import login_required, user_permission, data_required


@login_required
@user_permission('add_column')
@data_required(['column_name', 'id', 'type'], 'POST')
def add_column(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)

    column_name = request.POST['column_name'].lower()
    items = establishment.inventory
    columns = establishment.columns['columns']

    if column_name == '':
        data = {'success': False, 'error_msg:': 'Column name is an empty string.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if column_name in columns:
        data = {'success': False, 'error_msg:': 'Column name already exist.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    columns.append(column_name)
    for key, item in items.iteritems():
        item.update({column_name: ""})

    establishment.save()

    user_settings = current_boss.settings
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'inventory': user_inventory, 'columns': establishment.columns['columns']}, safe=False)


@login_required
@user_permission('add_item')
@data_required(['item', 'id', 'type'], 'BODY')
def add_item(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.BODY['id'], request.BODY['type'], current_boss)
    linked_columns = current_boss.business.link_columns
    # Check if all link columns has static data
    item = checker.check_link_columns(linked_columns, request.BODY['item'])
    if isinstance(item, HttpResponseBadRequest):
        return item

    items = establishment.inventory
    columns = establishment.columns['columns']

    for key, val in item.iteritems():
        if key not in columns:
            data = {'success': False, 'error_msg:': 'All columns do not exist!', 'data': request}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if len(items):
        item_id = int(max(items, key=int)) + 1
    else:
        item_id = 1

    items[item_id] = item

    establishment.save()

    user_settings = current_boss.settings
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'item': {item_id: item}, 'inventory': user_inventory}, safe=False)


@login_required
@user_permission('edit_column')
@data_required(['new_column_name', 'prev_column_name', 'id', 'type'], 'POST')
def edit_column(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)

    prev_column_name = request.POST['prev_column_name']
    new_column_name = request.POST['new_column_name']
    columns = establishment.columns['columns']
    items = establishment.inventory
    linked_columns = establishment.link_columns

    if prev_column_name not in columns:
        data = {'success': False, 'error_msg:': 'Column name does not exist.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Edit column list
    establishment.columns['columns'] = [w.replace(prev_column_name, new_column_name) for w in columns]
    # Edit inventory
    for key, item in items.iteritems():
        item[new_column_name] = item.pop(prev_column_name)
    # Check link columns
    for key, item in linked_columns.iteritems():
        if linked_columns[key] == prev_column_name:
            linked_columns[key] = new_column_name

    establishment.save()

    user_settings = current_boss.settings

    user_settings.transaction_filter['filter'] = [w.replace(prev_column_name, new_column_name) for w in columns]

    if prev_column_name == user_settings.order_by:
        user_settings.order_by = new_column_name

    user_settings.save()
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'columns': establishment.columns['columns'], 'inventory': user_inventory}, safe=False)


@login_required
@user_permission('edit_item')
@data_required(['item', 'item_id', 'id', 'type'], 'BODY')
def edit_item(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.BODY['id'], request.BODY['type'], current_boss)
    linked_columns = establishment.link_columns

    item = checker.check_link_columns(linked_columns, request.BODY['item'])

    if isinstance(item, HttpResponseBadRequest):
        return item

    item_id = str(request.BODY['item_id'])
    columns = establishment.columns['columns']
    items = establishment.inventory

    for key, val in item.iteritems():
        if key not in columns:
            data = {'success': False, 'error_msg:': 'All columns do not exist!'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

    items[item_id] = item
    establishment.save()

    user_settings = current_boss.settings
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'item': {item_id: item}, 'inventory': user_inventory}, safe=False)


@login_required
@user_permission('delete_column')
@data_required(['column_name', 'id', 'type'], 'POST')
def delete_column(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)

    column_name = request.POST['column_name']
    columns = establishment.columns['columns']
    items = establishment.inventory
    linked_columns = establishment.link_columns

    if column_name == '':
        data = {'success': False, 'error_msg:': 'Column name is an empty string.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if column_name not in columns:
        data = {'success': False, 'error_msg:': 'Column name does not exist.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')
    
    # Remove column from list
    columns.remove(column_name)

    # Delete column from inventory
    for key, item in items.iteritems():
        item.pop(column_name, None)

    # Check link columns
    for key, item in linked_columns.iteritems():
        if linked_columns[key] == column_name:
            linked_columns[key] = False

    establishment.save()

    user_settings = current_boss.settings
    transaction_filter = user_settings.transaction_filter['filter']

    if column_name == user_settings.order_by:
        user_settings.order_by = "none"

    if column_name in transaction_filter:
        transaction_filter.remove(column_name)

    user_settings.save()
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'columns': establishment.columns['columns'], 'inventory': user_inventory}, safe=False)


@login_required
@user_permission('delete_item')
@data_required(['item_id', 'id', 'type'], 'POST')
def delete_item(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)

    item_id = str(request.POST['item_id'])
    items = establishment.inventory

    items.pop(item_id, None)
    establishment.save()
    user_inventory = sort_inventory(current_boss.settings, establishment.inventory)

    return JsonResponse({'inventory': user_inventory}, safe=False)


@login_required
@user_permission('import_file')
@data_required(['excel_file'], 'FILES')
def read_excel(request):
    if request.method == 'POST' and request.FILES['excel_file']:
        excel_file = pd.read_excel(request.FILES['excel_file'])

        columns = excel_file.columns

        json_data = {'headers': [], 'data': [], 'column': {}}

        for index in range(0, len(excel_file[columns[0]])):
            row_data = []

            for column in columns:
                if index == 0:
                    json_data['headers'].append(column)

                current_data = str(excel_file[column][index])
                if current_data == 'nan':
                    current_data = ""
                else:
                    current_data = " ".join(current_data.strip().split())

                row_data.append(current_data)

            json_data['data'].append(row_data)

        return JsonResponse(json_data, safe=False)


@login_required
@user_permission('import_file')
@data_required(['inventory', 'columns', 'type', 'id'], 'BODY')
def import_submit(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.BODY['id'], request.BODY['type'], current_boss)

    post_inventory = request.BODY['inventory']
    custom_column = establishment.columns['columns']
    post_column = request.BODY['columns']
    user_inventory = establishment.inventory
    linked_columns = establishment.link_columns
    missing_columns = []

    for column in custom_column:
        if column in post_column:
            post_column.remove(column)
        else:
            missing_columns.append(column)

    establishment.columns['columns'] = custom_column + post_column

    # Check every item
    if len(user_inventory):

        # If adding new columns add to every item
        for column in post_column:
            for key, item in user_inventory.iteritems():
                item[column] = ""

        quantity_column = linked_columns['quantity']
        cost_column = linked_columns['cost']
        price_column = linked_columns['price']

        for key, item in post_inventory.iteritems():
            # Add missing columns to new items
            for column in missing_columns:
                item[column] = ""

            if quantity_column:
                quantity = item[quantity_column].strip()
                if quantity == "" or not quantity.isdigit():
                    quantity = 0
                else:
                    quantity = int(quantity)

                item[quantity_column] = quantity

            if cost_column:
                cost = item[cost_column].strip()
                if cost == "" or not cost.isdigit():
                    cost = 0
                else:
                    cost = int(cost)

                item[cost_column] = cost

            if price_column:
                price = item[price_column].strip()
                if price == "" or not price.isdigit():
                    price = 0
                else:
                    price = int(price)

                item[price_column] = price

    user_inventory.update(post_inventory)
    establishment.save()

    user_inventory = sort_inventory(current_boss.settings, establishment.inventory)

    return JsonResponse({'inventory': user_inventory, 'columns': establishment.columns['columns']}, safe=False)


@login_required
@user_permission('export_file')
@data_required(['inventory', 'columns'], 'BODY')
def export_submit(request):
    byte_io = IO()

    excel_file = pd.DataFrame(request.BODY['inventory'])
    excel_file = excel_file[request.BODY['columns']]

    writer = pd.ExcelWriter(byte_io, engine='xlsxwriter')
    excel_file.to_excel(writer, sheet_name='Inventory')
    writer.save()
    writer.close()

    byte_io.seek(0)

    response = HttpResponse(byte_io.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename=inventory.xlsx'

    return response


@login_required
@user_permission('drop_table')
@data_required(['drop_table', 'type', 'id'], 'POST')
def drop_table(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)

    if request.POST['drop_table']:
        establishment.inventory = {}
        establishment.columns = {'columns': []}
        establishment.link_columns = {"quantity": False, "price": False, "cost": False, "name": False}
        establishment.save()

        user_settings = current_boss.settings
        user_settings.order_by = "none"
        user_settings.save()

        return JsonResponse({'columns': establishment.columns['columns'], 'inventory': establishment.inventory}, safe=False)


@login_required
@user_permission('receive')
@data_required(['item_id', 'change_value', 'id', 'type', 'details'], 'POST')
def received(request):
    def received_operation(column, change_value):
        return column + int(change_value)

    return JsonResponse(inventory_operation(request, 'Edit', 'Received', 'quantity', received_operation), safe=False)


@login_required
@user_permission('damage')
@data_required(['item_id', 'change_value', 'id', 'type', 'details'], 'POST')
def damaged(request):
    def damaged_operation(column, change_value):
        return int(column) - int(change_value)

    return JsonResponse(inventory_operation(request, 'Edit', 'Damaged', 'quantity', damaged_operation), safe=False)


@login_required
@user_permission('reset_cost')
@data_required(['item_id', 'change_value', 'id', 'type', 'details'], 'POST')
def reset_cost(request):
    def received_operation(column, change_value):
        return '{0:.2f}'.format(float(change_value))

    return JsonResponse(inventory_operation(request, 'Edit', 'Reset Cost', 'cost', received_operation), safe=False)


@login_required
@user_permission('reset_cost')
@data_required(['item_id', 'change_value', 'id', 'type', 'details'], 'POST')
def reset_price(request):
    def received_operation(column, change_value):
        return '{0:.2f}'.format(float(change_value))

    return JsonResponse(inventory_operation(request, 'Edit', 'Reset Price', 'price', received_operation), safe=False)


@login_required
@data_required(['start_time', 'end_time'], 'GET')
def get_item_log(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_business = current_boss.business

    start_time = request.GET['start_time']
    end_time = request.GET['end_time']

    item_log = list(ItemLog.objects.filter(business=user_business, date__range=(start_time, end_time)).order_by('-date')
                    .values('user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change',
                    'previous_value', 'date', 'details', 'id'))

    return JsonResponse({
        'item_log': item_log,
        'start_time': time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(int(start_time))),
        'end_time': time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(int(end_time))),
    }, safe=False)


@login_required
@user_permission('')
@data_required(['order_by', 'reverse', 'id', 'type'], 'BODY')
def save_settings(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_settings = current_boss.settings
    establishment = get_establishment(request.BODY['id'], request.BODY['type'], current_boss)

    user_settings.order_by = request.BODY["order_by"]
    user_settings.reverse = request.BODY["reverse"]

    user_settings.save()

    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return JsonResponse({'inventory_settings': model_to_dict(user_settings), 'inventory': user_inventory}, safe=False)
