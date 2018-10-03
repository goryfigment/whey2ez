import json
import re
from django.http import HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from whey2ez.modules.base import render_json
import whey2ez.modules.checker as checker
import whey2ez.modules.base as helper
from django.contrib.auth import authenticate, login, logout
from whey2ez.models import User, Boss, Business, Settings, Store
from whey2ez.decorators import login_required, data_required
from whey2ez.modules.base import get_boss
from whey2ez.modules.base import decimal_format
from django.forms.models import model_to_dict


def register(request):
    checker.check_req_data(['username', 'email', 'password', 'first_name', 'last_name', 'business_name'], request.POST)

    username = request.POST['username'].strip().lower()
    email = request.POST['email'].strip().lower()
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    business_name = request.POST['business_name']

    # Check first name
    if not len(first_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a first name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check last name
    if not len(last_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a last name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check business name
    if not len(business_name):
        print username
        data = {'success': False,  'error_msg': 'Must have a business name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check username
    if len(username) <= 2 or len(username) >= 16:
        print username
        data = {'success': False,  'error_msg': 'Username must be between 3 to 15 characters.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check Email
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        data = {'success': False,  'error_msg': 'Invalid email.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if valid password: Must be 8 or more characters and contain a combo of letters and numbers
    if not len(password) >= 8:
        data = {'success': False,  'error_msg': 'Password must be 8 characters or more.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    if not bool(re.search(r'\d', password)) or not bool(re.search(r'[a-zA-Z]', password)):
        data = {'success': False,  'error_msg': 'Invalid password.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(username=username).exists():
        data = {'success': False,  'error_msg': 'Username exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check if email exist in the database
    if User.objects.filter(email=email).exists():
        data = {'success': False,  'error_msg': 'Email exists.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    user_settings = Settings.objects.create()
    business = Business.objects.create(name=business_name)
    boss = Boss.objects.create(settings=user_settings, business=business)
    User.objects.create(
        username=username,
        email=email,
        password=helper.create_password(password),
        first_name=first_name,
        last_name=last_name,
        boss=boss
    )

    # Validate password
    auth_user = authenticate(email=email, password=password)
    # Login user
    login(request, auth_user)

    return render_json({'success': True})


def user_login(request):
    checker.check_req_data(['username', 'password'], request.POST)

    username = request.POST['username'].strip().lower()
    password = request.POST['password'].strip().lower()

    if '@' in username:
        # Check Email
        if not re.match(r"[^@]+@[^@]+\.[^@]+", username):
            data = {'success': False,  'error_msg': 'Invalid email'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Check if the user exist first
        if not User.objects.filter(email=username).exists():
            data = {'success': False,  'error_msg': 'User does not exists.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Validate password
        user = authenticate(email=username, password=password)
    else:
        # Check if username is over 15 characters
        if len(username) > 15:
            data = {'success': False,  'error_msg': 'Username to long.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')
        # Check if the user exist first
        if not User.objects.filter(username=username).exists():
            data = {'success': False,  'error_msg': 'User does not exists.'}
            return HttpResponseBadRequest(json.dumps(data), 'application/json')

        # Validate password
        user = authenticate(username=username, password=password)

    login(request, user)

    return render_json({'success': True})


def user_logout(request):
    logout(request)
    return HttpResponseRedirect('/login/')


@login_required
def settings(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    establishment = current_boss.business

    return JsonResponse({'link_columns': establishment.link_columns, 'columns': establishment.columns['columns'], 'name': establishment.name}, safe=False)


@login_required
@data_required(['link_columns', 'store_id'], 'BODY')
def save_settings(request):
    store = Store.objects.get(id=request.BODY['store_id'])
    store_inventory = store.inventory

    link_columns = request.BODY['link_columns']

    for link_type, column in link_columns.iteritems():
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

    store.link_columns = link_columns

    store.save()

    return JsonResponse(model_to_dict(store), safe=False)