import json, re
from django.forms.models import model_to_dict
from django.http import JsonResponse, HttpResponseBadRequest
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
    current_boss = get_boss(current_user)

    post_permissions = request.BODY['permissions']
    name = request.BODY['name'].strip()

    if name == "":
        return HttpResponseBadRequest('Column name does not exist.', 'application/json')

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
        delete_user_type=post_permissions['delete_user_type'],
        edit_permissions=post_permissions['edit_permissions']
    )

    permissions.visible_columns = request.BODY['visible_columns']
    permissions.save()

    user_type = UserType.objects.create(
        name=name,
        permission=permissions,
        boss=current_boss
    )

    return JsonResponse(model_to_dict(user_type), safe=False)


@login_required
@user_permission('delete_user_type')
@data_required(['user_type'], 'POST')
def delete_user_type(request):
    user_type = UserType.objects.get(id=request.POST['user_type'])
    employees = Employee.objects.filter(user_type=user_type)

    # Delete all employees associated to user type
    for employee in employees:
        employee.user.delete()

    user_type.delete()

    return JsonResponse({'success': True}, safe=False)


@login_required
@user_permission('edit_permissions')
@data_required(['permissions', 'visible_columns', 'name', 'user_type'], 'BODY')
def edit_user_type(request):
    post_permissions = request.BODY['permissions']
    name = request.BODY['name'].strip()

    if name == "":
        return HttpResponseBadRequest('Column name does not exist.', 'application/json')

    user_type = UserType.objects.get(id=request.BODY['user_type'])
    permissions = user_type.permission

    permissions.add_column = post_permissions['add_column']
    permissions.edit_column = post_permissions['edit_column']
    permissions.delete_column = post_permissions['delete_column']
    permissions.add_item = post_permissions['add_item']
    permissions.edit_item = post_permissions['edit_item']
    permissions.delete_item = post_permissions['delete_item']
    permissions.import_file = post_permissions['import']
    permissions.export_file = post_permissions['export']
    permissions.drop_table = post_permissions['drop_table']
    permissions.receive = post_permissions['receive']
    permissions.damage = post_permissions['damage']
    permissions.reset_cost = post_permissions['reset_cost']
    permissions.reset_price = post_permissions['reset_price']
    permissions.create_store = post_permissions['create_store']
    permissions.edit_store = post_permissions['edit_store']
    permissions.delete_store = post_permissions['delete_store']
    permissions.create_transaction = post_permissions['create_transaction']
    permissions.edit_transaction_settings = post_permissions['edit_transaction_settings']
    permissions.create_user = post_permissions['create_user']
    permissions.create_user_type = post_permissions['create_user_type']
    permissions.delete_user_type = post_permissions['delete_user_type']
    permissions.edit_permissions = post_permissions['edit_permissions']

    permissions.visible_columns = request.BODY['visible_columns']
    permissions.save()

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
        data = {'success': False,  'error_msg': 'Must have a first name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check last name
    if not len(last_name):
        data = {'success': False,  'error_msg': 'Must have a last name.'}
        return HttpResponseBadRequest(json.dumps(data), 'application/json')

    # Check username
    if len(username) <= 2 or len(username) >= 16:
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

    return JsonResponse(model_to_dict(created_user), safe=False)


@login_required
@data_required(['user_type'], 'GET')
def get_employee_type(request):
    user_type = UserType.objects.get(id=request.GET['user_type'])
    permission_model = model_to_dict(user_type.permission)
    user_type = model_to_dict(user_type)
    user_type['permission'] = permission_model

    return JsonResponse(user_type, safe=False)
