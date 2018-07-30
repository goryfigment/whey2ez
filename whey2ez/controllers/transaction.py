import re, time
from django.http import JsonResponse, HttpResponseBadRequest
from django.forms.models import model_to_dict
from whey2ez.models import Transaction
from whey2ez.modules.base import transaction_name_regex, transaction_total
from whey2ez.decorators import login_required, user_permission, data_required
from whey2ez.modules.base import get_boss, get_establishment
from whey2ez.modules.receipt_printer import receipt_printer


@login_required
@data_required(['search_value', 'id', 'type'], 'GET')
def inventory_search(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = get_establishment(request.GET['id'], request.GET['type'], current_boss)
    search_value = re.sub(r'[^\w]', '', request.GET['search_value'])
    search_results = []

    # Get inventory
    user_inventory = establishment.inventory
    link_columns = establishment.link_columns

    name_key = link_columns['name']
    price_key = link_columns['price']

    # Get filters
    filters = current_boss.settings.transaction_filter['filter']

    if 'ALL' in filters:
        filters = user_inventory.values()[0].keys()

    # Loop through inventory
    for key, item in user_inventory.iteritems():
        # Loop through filters
        for data in filters:
            # Check if 'search' matches!
            current_data = re.sub(r'[^\w]', '', str(item[data])).lower()
            if search_value in current_data:
                # Create new data defined by the user
                new_data = {'price': item[price_key], 'name': transaction_name_regex(name_key, item), 'id': key}
                search_results.append(new_data)
                break

    return JsonResponse(search_results, safe=False)


@login_required
@user_permission('create_transaction')
@data_required(['store_type', 'store_id', 'items', 'payment_type', 'tax', 'subtotal', 'memo'], 'BODY')
def create_transaction(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    store_type = request.BODY['store_type']
    store_id = request.BODY['store_id']
    establishment = get_establishment(store_id, store_type, current_boss)
    user_inventory = establishment.inventory
    quantity_column = establishment.link_columns['quantity']
    cost_column = establishment.link_columns['cost']
    transaction_items = request.BODY['items']

    if not len(transaction_items):
        return HttpResponseBadRequest('Must have at least one item per transaction.', 'application/json')

    for key, item in transaction_items.iteritems():
        item['id'] = key
        item['cost'] = user_inventory[key][cost_column]

    item_list = []

    # Subtract from inventory
    for key, item in transaction_items.iteritems():
        inventory_item = user_inventory[key]
        inventory_qty = int(inventory_item[quantity_column])
        transaction_qty = int(item['quantity'])

        inventory_qty -= transaction_qty
        if inventory_qty < 0:
                inventory_qty = 0

        user_inventory[key][quantity_column] = inventory_qty

        item_list.append(item)

        establishment.save()
        # Subtract from store inventory also if connected to a store
        # if store_id:
        #     store_qty = int(store_id.custom['inventory'][key][quantity_column])
        #     store_qty -= transaction_qty
        #     if store_qty < 0:
        #         store_qty = 0
        #
        #     store_id.custom['inventory'][key][quantity_column] = store_qty
        #     store_id.save()

    if store_type == 'main':
        store_id = None

    transaction = Transaction.objects.create(
        boss=current_boss,
        seller=current_user,
        store=store_id,
        payment_type=request.BODY['payment_type'],
        subtotal=request.BODY['subtotal'],
        tax=request.BODY['tax'],
        memo=request.BODY['memo'],
        items={"list": item_list}
    )

    return JsonResponse({'transaction': model_to_dict(transaction), 'success': True}, safe=False)


@login_required
@data_required(['start_time', 'end_time'], 'GET')
def get_transaction(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    start_time = request.GET['start_time']
    end_time = request.GET['end_time']

    if str(start_time) == '*':
        transactions = list(Transaction.objects.filter(boss=current_boss).order_by('-date').values())
        start_time = '*'
        end_time = '*'
    else:
        transactions = list(Transaction.objects.filter(boss=current_boss, date__range=(start_time, end_time)).order_by('-date').values())
        start_time = time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(int(start_time)))
        end_time = time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(int(end_time)))

    # ADD DATE TO TRANSACTION ITEMS & CALCULATE TOTAL
    total_data = transaction_total(transactions)

    return JsonResponse({
        'inventory': len(current_boss.business.inventory),
        'transactions': total_data['transactions'],
        'total': total_data['total'],
        'start_time': start_time,
        'end_time': end_time
    }, safe=False)


@login_required
@user_permission('edit_transaction_settings')
@data_required(['settings', 'store_tax'], 'BODY')
def save_settings(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_business = current_boss.business
    user_settings = current_boss.settings

    settings = request.BODY["settings"]
    store_tax = request.BODY["store_tax"]
    user_business.tax = str(float(settings['tax'])/100)

    if 'ALL' in user_settings.transaction_filter['filter']:
        user_settings.transaction_filter['filter'] = []

    user_settings.transaction_filter['filter'] = settings['filter']
    user_settings.date_range = settings['date_range']
    user_settings.start_time = settings['start_time']

    user_settings.save()
    user_business.save()

    # stores = Store.objects.filter(user=current_user.id)
    # user_settings.save()
    #
    # for store in stores:
    #     current_store_tax = store_tax[str(store.id)]
    #     if current_store_tax != '':
    #         store.tax = str(float(current_store_tax)/100)
    #     else:
    #         store.tax = ''
    #
    #     store.save()
    #
    # store_list = list(stores.values('id', 'name', 'number', 'tax'))
    # for current_store in store_list:
    #     current_store['tax'] = str(float(current_store['tax'])*100)

    return JsonResponse({'business_tax': user_business.tax, 'transaction_settings': model_to_dict(user_settings)}, safe=False)


@login_required
@data_required(['transaction'], 'BODY')
def get_receipt(request):
    current_user = request.user
    current_boss = get_boss(current_user)

    # Print receipt
    receipt_printer(current_boss.settings, request.BODY['transaction'])

    return JsonResponse({'success': True}, safe=False)


@login_required
@user_permission('')
@data_required(['ip_address', 'header', 'footer'], 'BODY')
def save_receipt_settings(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_settings = current_boss.settings

    user_settings.ip_address = request.BODY['ip_address']
    user_settings.header = request.BODY['header']
    user_settings.footer = request.BODY['footer']

    user_settings.save()

    return JsonResponse({'transaction_settings': model_to_dict(user_settings)}, safe=False)
