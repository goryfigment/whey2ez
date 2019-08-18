from django.shortcuts import render
from whey2ez.modules.base import get_base_url
from django.http import HttpResponseRedirect
from django.forms.models import model_to_dict
from whey2ez.modules.base import decimal_format, get_boss
from whey2ez.models import UserType, Employee, User, ItemLog, Store
import json
import time


def error_page(request):
    data = {
        'base_url': get_base_url()
    }

    return render(request, '404.html', data)


def server_error(request):
    data = {
        'base_url': get_base_url()
    }

    return render(request, '500.html', data)


def home(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'home.html', data)


def register(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'register.html', data)


def login(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'login.html', data)


def forgot_password(request):
    data = {
        'base_url': get_base_url(),
        'expired': False
    }

    if 'code' in request.GET:
        current_user = User.objects.get(reset_link=request.GET['code'])

        if (int(round(time.time())) - current_user.reset_date) > 86400:
            data['expired'] = True

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/inventory/')

    return render(request, 'forgot_password.html', data)


def inventory(request):
    current_user = request.user

    # Only go to overview if user is logged in
    if not current_user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    if current_user.boss:
        boss_username = current_user.username
    else:
        boss_username = User.objects.get(boss=current_user.employee.boss).username

    user_business = current_boss.business
    stores = user_business.stores.all().values()
    store_log = {}
    store_dict = {}

    if len(stores):
        active_store = str(stores.first()['id'])
    else:
        active_store = ''

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_inventory = current_store['inventory']

        if current_store['order_by'] != 'none':
            current_store['inventory'] = sorted(store_inventory.items(), key=lambda (k, v): v[current_store['order_by']], reverse=current_store['reverse'])
        else:
            current_store['inventory'] = sorted(store_inventory.items(), key=lambda (k, v): int(k), reverse=False)

        store_log[store_id] = list(ItemLog.objects.filter(store=store_id).order_by('-date').values(
            'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
            'date', 'details', 'id'))

    data = {
        'boss_username': boss_username,
        'base_url': get_base_url(),
        'business_id': user_business.id,
        'business_name': user_business.name,
        'active_store': active_store,
        'store_log': json.dumps(store_log),
        'name': current_user.first_name + " " + current_user.last_name,
        'stores': json.dumps(store_dict)
    }

    return render(request, 'inventory.html', data)


def employee(request):
    current_user = request.user

    # If user is login redirect to overview
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_business = current_boss.business
    user_types = list(UserType.objects.filter(boss=current_boss).values())
    employees = Employee.objects.filter(boss=current_boss).order_by('-user_type')
    stores = user_business.stores.all().values()

    employees_list = []

    for current_employee in employees:
        employee_user = User.objects.get(employee=current_employee.id)
        name = employee_user.first_name + ' ' + employee_user.last_name
        employees_list.append({'name': name, 'title': current_employee.user_type.name, 'username': employee_user.username, 'store': employee_user.employee.store})

    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_dict[store_id]['transactions'] = []

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'user_type_list': user_types,
        'user_types': json.dumps(user_types),
        'employee_list': employees_list,
        'employees': json.dumps(employees_list),
        'stores': json.dumps(store_dict)
    }

    return render(request, 'employee.html', data)


def transaction(request):
    current_user = request.user

    # If not login go to login page
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)

    user_settings = model_to_dict(current_boss.settings)
    user_business = current_boss.business
    # user_settings['business_tax'] = decimal_format(float(user_business.tax)*100, 3, False)
    user_settings['ip_address'] = user_settings['ip_address'].split('.')
    stores = user_business.stores.all().values()
    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store
        store_dict[store_id]['transactions'] = []

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': json.dumps(store_dict),
        'start_point': user_settings['start_time'],
        'date_range': user_settings['date_range'],
        'settings': json.dumps(user_settings),
        'all': 'ALL'
    }

    # if len(user_business.inventory):
    #     user_settings['example_item'] = next(iter(user_business.inventory.items()))[1]

    return render(request, 'transaction.html', data)


def create_transaction_page(request):
    current_user = request.user

    # Only go to overview if user is logged in
    if not current_user.is_authenticated():
        return HttpResponseRedirect('/login/')

    establishment = Store.objects.get(id=request.GET['id'])

    data = {
        'base_url': get_base_url(),
        'id': establishment.id,
        'tax': establishment.tax,
        'tax_percent': decimal_format(float(establishment.tax)*100, 3, False)
    }

    return render(request, 'create_transaction.html', data)


def overview_page(request):
    current_user = request.user

    # If user is login redirect to overview
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_settings = model_to_dict(current_boss.settings)
    user_business = current_boss.business
    stores = user_business.stores.all().values()
    store_dict = {}

    for current_store in stores:
        store_id = str(current_store['id'])
        store_dict[store_id] = current_store

    data = {
        'base_url': get_base_url(),
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': json.dumps(store_dict),
        'date_range': user_settings['date_range'],
        'start_point': user_settings['start_time']
    }

    return render(request, 'overview.html', data)


def store(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    user_business = current_boss.business

    # If user is login redirect to overview
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/login/')

    data = {
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': list(user_business.stores.all().values())
    }

    return render(request, 'store.html', data)
