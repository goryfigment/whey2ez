import json
import re
import bcrypt
import string
import random
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseBadRequest
from whey2ez.modules.base import render_json
import whey2ez.modules.checker as checker
import whey2ez.modules.base as helper
from django.contrib.auth import authenticate, login, logout
from whey2ez.models import User, Boss, Business, Settings


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

    code = ''.join(random.SystemRandom().choice(string.ascii_lowercase + string.ascii_uppercase + string.digits) for _ in range(6))

    settings = Settings.objects.create()
    business = Business.objects.create(name=business_name)
    boss = Boss.objects.create(settings=settings, business=business)
    User.objects.create(
        username=username,
        email=email,
        password=helper.create_password(password),
        first_name=first_name,
        last_name=last_name,
        code=code,
        boss=boss
    )

    # Business
    business.link_columns = {"quantity": False, "price": False, "cost": False, 'name': False}
    business.columns.setdefault('columns', [])
    business.save()
    # Setting
    settings.transaction_filter.setdefault('filter', ['ALL'])
    settings.save()

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
