from django.shortcuts import render
from whey2ez.modules.base import get_base_url
from django.http import HttpResponseRedirect
from django.forms.models import model_to_dict
from whey2ez.modules.base import decimal_format, get_transactions, get_utc_epoch_time, get_boss, get_establishment
from whey2ez.models import UserType, Employee, User, ItemLog
import json, time


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


def site(request):
    return HttpResponseRedirect('/login/')


def register(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/dashboard/')

    return render(request, 'register.html', data)


def login(request):
    data = {
        'base_url': get_base_url()
    }

    # If user is login redirect to overview
    if request.user.is_authenticated():
        return HttpResponseRedirect('/dashboard/')

    return render(request, 'login.html', data)


def inventory(request):
    current_user = request.user

    # Only go to overview if user is logged in
    if not current_user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    user_business = current_boss.business
    user_settings = current_boss.settings

    # Item Log
    item_log = json.dumps(list(ItemLog.objects.filter(business=user_business).order_by('-date').values(
        'user__first_name', 'user__last_name', 'action', 'operation', 'item_name', 'change', 'previous_value',
        'date', 'details', 'id')))

    user_inventory = user_business.inventory

    if user_settings.order_by != 'none':
        sorted_inventory = sorted(user_inventory.items(), key=lambda (k, v): v[user_settings.order_by], reverse=user_settings.reverse)
    else:
        sorted_inventory = sorted(user_inventory.items(), key=lambda (k, v): int(k), reverse=False)

    data = {
        'base_url': get_base_url(),
        'business_id': user_business.id,
        'business_name': user_business.name,
        'inventory': json.dumps(sorted_inventory),
        'link_columns': json.dumps(user_business.link_columns),
        'columns': json.dumps(user_business.columns['columns']),
        'name': current_user.first_name + " " + current_user.last_name,
        'stores': list(user_business.stores.all().values()),
        'item_log': item_log,
        'settings': json.dumps(model_to_dict(user_settings))
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

    employees_list = []

    for current_employee in employees:
        employee_user = User.objects.get(employee=current_employee.id)
        name = employee_user.first_name + ' ' + employee_user.last_name
        employees_list.append({'name': name, 'title': current_employee.user_type.name, 'username': employee_user.username})

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'user_type_list': user_types,
        'user_types': json.dumps(user_types),
        'employee_list': employees_list,
        'employees': json.dumps(employees_list),
        'columns': json.dumps(user_business.columns['columns'])
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
    user_settings['business_tax'] = decimal_format(float(user_business.tax)*100, 3, False)
    user_settings['ip_address'] = user_settings['ip_address'].split('.')
    user_settings['link_columns'] = user_business.link_columns

    data = {
        'base_url': get_base_url(),
        'name': current_user.first_name + " " + current_user.last_name,
        'column_list': user_business.columns['columns'],
        'columns': json.dumps(user_business.columns['columns']),
        'link_columns': json.dumps(user_business.link_columns),
        'link_dict': user_business.link_columns,
        'business_id': user_business.id,
        'business_name': user_business.name,
        'stores': list(user_business.stores.all().values()),
        'settings': user_settings,
        'start_time': user_settings['start_time'],
        'date_range': user_settings['date_range'],
        'receipt_settings': json.dumps(user_settings)
    }

    if len(user_business.inventory):
        user_settings['example_item'] = next(iter(user_business.inventory.items()))[1]

    return render(request, 'transaction.html', data)


def create_transaction_page(request):
    current_user = request.user

    # Only go to overview if user is logged in
    if not current_user.is_authenticated():
        return HttpResponseRedirect('/login/')

    current_boss = get_boss(current_user)
    establishment = get_establishment(request.GET['id'], request.GET['type'], current_boss)

    data = {
        'base_url': get_base_url(),
        'type': request.GET['type'],
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

    date_range = user_settings['date_range']
    start_time = None
    end_time = None

    if date_range == '*':
        transactions = get_transactions(current_user.boss)
    else:
        start_time = get_utc_epoch_time(days=date_range)
        end_time = get_utc_epoch_time()
        transactions = get_transactions(current_user.boss, start_time=start_time, end_time=end_time)

    data = {
        'base_url': get_base_url(),
        'business_id': user_business.id,
        'business_name': user_business.name,
        'columns': json.dumps(user_business.columns['columns']),
        'link_columns': json.dumps(user_business.link_columns),
        'link_dict': user_business.link_columns,
        'date_range': date_range,
        'transactions': json.dumps(transactions),
        'inventory': len(user_business.inventory)
    }

    if len(transactions):
        start_epoch = int(start_time)
        end_epoch = int(end_time)

        data['start_epoch'] = start_epoch
        data['end_epoch'] = end_epoch
        data['start_time'] = time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(start_epoch))
        data['end_time'] = time.strftime('%b %#d, %Y %#I:%M%p', time.localtime(end_time))

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
