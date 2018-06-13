import json, re
from django.forms.models import model_to_dict
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
import whey2ez.modules.checker as checker
import whey2ez.modules.base as helper
from django.contrib.auth import authenticate
from whey2ez.models import Permission, UserType, User, Employee, Store
from whey2ez.decorators import login_required, user_permission, data_required
from whey2ez.modules.base import get_boss


@login_required
@user_permission('create_user_type')
@data_required(['permissions', 'visible_columns', 'name'], 'BODY')
def create_user_type(request):
    current_user = request.user

    post_permissions = request.BODY['permissions']
    name = request.BODY['name']

    if name == "":
        data = {'success': False,  'error_msg': 'User type name cannot be an empty string.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    permissions = Permission.objects.create(
        add_column=post_permissions['add_column'],
        edit_column=post_permissions['edit_column'],
        delete_column=post_permissions['delete_column'],
        add_item=post_permissions['add_item'],
        edit_item=post_permissions['edit_item'],
        delete_item=post_permissions['delete_item'],
        import_file=post_permissions['import'],
        export_file=post_permissions['export'],
        drop_table=post_permissions['drop_table'],
        receive=post_permissions['receive'],
        damage=post_permissions['damage'],
        reset_cost=post_permissions['reset_cost'],
        reset_price=post_permissions['reset_price'],
        create_store=post_permissions['create_store'],
        edit_store=post_permissions['edit_store'],
        delete_store=post_permissions['delete_store'],
        create_transaction=post_permissions['create_transaction'],
        edit_transaction_settings=post_permissions['edit_transaction_settings'],
        create_user=post_permissions['create_user'],
        create_user_type=post_permissions['create_user_type'],
        edit_permissions=post_permissions['edit_permissions']
    )

    permissions.visible_columns = request.BODY['visible_columns']
    permissions.save()

    if current_user.boss:
        current_boss = current_user.boss
    else:
        current_boss = current_user.employee.boss

    user_type = UserType.objects.create(
        name=name,
        permission=permissions,
        boss=current_boss
    )

    return JsonResponse(model_to_dict(user_type), safe=False)


@login_required
@user_permission('create_user')
@data_required(['user_type', 'connection', 'username', 'password', 'first_name', 'last_name', 'store'], 'POST')
def create_employee(request):
    current_user = request.user
    current_boss = get_boss(current_user)

    username = request.POST['username'].strip().lower()
    password = request.POST['password']
    first_name = request.POST['first_name']
    last_name = request.POST['last_name']
    user_type = request.POST['user_type']
    connection = request.POST['connection']
    store = request.POST['store']

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

    # Check username
    if len(username) <= 2 or len(username) >= 16:
        print username
        data = {'success': False,  'error_msg': 'Username must be between 3 to 15 characters.'}
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

    chosen_user_type = UserType.objects.get(id=user_type)

    created_employee = Employee.objects.create(
        boss=current_boss,
        connection=connection,
        permission=chosen_user_type.permission,
        user_type=chosen_user_type
    )

    if store != '':
        created_employee.store = Store.objects.get(id=store)
        created_employee.save()

    created_user = User.objects.create(
        username=username,
        password=helper.create_password(password),
        first_name=first_name,
        last_name=last_name,
        employee=created_employee
    )

    # Validate password
    authenticate(username=username, password=password)


    # logs = InventoryLog.objects.filter(date__range=(start_time, end_time)).order_by('date').values(
    #     'action', 'date', 'cost', 'memo', 'user__first_name', 'user__last_name', 'items__size', 'items__brand',
    #     'items__model', 'itemlogs__quantity')

    return JsonResponse(model_to_dict(created_user), safe=False)
