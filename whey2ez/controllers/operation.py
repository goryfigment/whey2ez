import json
from django.http import JsonResponse, HttpResponseBadRequest
import whey2ez.modules.checker as checker
from whey2ez.modules.base import decimal_format, transaction_name_regex
from whey2ez.models import ItemLog
from whey2ez.modules.base import get_boss, get_establishment, sort_inventory


def link_columns(request):
    checker.check_req_data(['column', 'link_type'], request.POST)

    current_user = request.user
    checker.check_permission(current_user)

    column = request.POST['column']
    link_type = request.POST['link_type']

    if current_user.boss:
        establishment = current_user.boss.business
    else:
        establishment = current_user.employee.boss.business

    user_inventory = establishment.inventory

    if link_type not in establishment.link_columns:
        data = {'success': False, 'error_msg:': 'Link type does not exist.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    establishment.link_columns[link_type] = column.strip()

    if link_type == 'price' or link_type == 'cost':  # Turn all data to float values
        for item_id, item in user_inventory.iteritems():
            current_price = item[column]
            if current_price.replace('.', '', 1).isdigit():
                item[column] = decimal_format(float(current_price), 2, False)
            else:
                item[column] = '0.00'

    elif link_type == 'quantity':  # Turn all data to int values
        for key, item in user_inventory.iteritems():
            current_quantity = item[column]
            if str(current_quantity).isdigit():
                item[column] = int(current_quantity)
            else:
                item[column] = 0

    establishment.save()

    return JsonResponse(establishment.link_columns, safe=False)


def inventory_operation(request, action, operation, link_column, callback_function):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.POST['id'], request.POST['type'], current_boss)
    linked_columns = establishment.link_columns

    changing_column = linked_columns[link_column]
    name_column = linked_columns['name']
    item = establishment.inventory[request.POST['item_id']]
    previous_value = item[changing_column]

    # Do operation
    item[changing_column] = callback_function(item[changing_column], request.POST['change_value'])

    establishment.save()

    created_item_log = ItemLog.objects.create(
        user=current_user,
        action=action,
        operation=operation,
        item_name=transaction_name_regex(name_column, item),
        change=request.POST['change_value'],
        previous_value=previous_value,
        details={"notes": request.POST['details']}
    )

    if request.POST['type'] == 'main':
        created_item_log.business = establishment
        created_item_log.save()
        item_logs = list(ItemLog.objects.filter(business=establishment).order_by('-date').values(
            'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
            'date', 'details', 'id'))
    else:
        created_item_log.business = establishment
        created_item_log.save()
        item_logs = list(ItemLog.objects.filter(store=establishment).order_by('-date').values(
            'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
            'date', 'details', 'id'))

    user_settings = current_boss.settings
    user_inventory = sort_inventory(user_settings, establishment.inventory)

    return {'inventory': user_inventory, 'item_log': item_logs}


