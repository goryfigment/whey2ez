from django.http import JsonResponse, HttpResponseBadRequest
from whey2ez.modules.base import decimal_format, transaction_name_regex
from django.forms.models import model_to_dict
from whey2ez.models import ItemLog, Store
from whey2ez.modules.base import get_boss, sort_inventory
from whey2ez.decorators import login_required, user_permission, data_required


@login_required
@user_permission('')
@data_required(['column', 'link_type', 'id'], 'POST')
def link_columns(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    column = request.POST['column']
    link_type = request.POST['link_type']
    store = Store.objects.get(id=request.POST['id'])
    store_inventory = store.inventory

    if link_type not in store.link_columns:
        return HttpResponseBadRequest('Link type does not exist.', 'application/json')

    store.link_columns[link_type] = column.strip()

    if link_type == 'price' or link_type == 'cost':  # Turn all data to float values
        for item_id, item in store_inventory.iteritems():
            current_price = item[column]
            if current_price.replace('.', '', 1).isdigit():
                item[column] = decimal_format(float(current_price), 2, False)
            else:
                item[column] = '0.00'

    elif link_type == 'quantity':  # Turn all data to int values
        for key, item in store_inventory.iteritems():
            current_quantity = item[column]
            if str(current_quantity).isdigit():
                item[column] = int(current_quantity)
            else:
                item[column] = 0

    store.save()
    user_settings = current_boss.settings
    store.inventory = sort_inventory(user_settings, store.inventory)

    return JsonResponse({'store': model_to_dict(store)}, safe=False)


def inventory_operation(request, action, operation, link_column, callback_function):
    current_user = request.user
    current_boss = get_boss(current_user)
    store = Store.objects.get(id=request.POST['id'])
    linked_columns = store.link_columns

    changing_column = linked_columns[link_column]
    name_column = linked_columns['name']
    item = store.inventory[request.POST['item_id']]
    previous_value = item[changing_column]

    # Do operation
    item[changing_column] = callback_function(item[changing_column], request.POST['change_value'])

    store.save()

    created_item_log = ItemLog.objects.create(
        user=current_user,
        action=action,
        operation=operation,
        item_name=transaction_name_regex(name_column, item),
        change=request.POST['change_value'],
        previous_value=previous_value,
        details={"notes": request.POST['details']}
    )

    created_item_log.store = store
    created_item_log.save()
    item_logs = list(ItemLog.objects.filter(store=store).order_by('-date').values(
        'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
        'date', 'details', 'id'))

    user_settings = current_boss.settings
    store.inventory = sort_inventory(user_settings, store.inventory)

    return {'store': model_to_dict(store), 'item_log': item_logs}


