from django.forms.models import model_to_dict
from django.http import JsonResponse, HttpResponseBadRequest
from whey2ez.models import Store
from whey2ez.decorators import login_required, user_permission, data_required
from whey2ez.modules.base import get_boss


@login_required
@user_permission('boss_only')
@data_required(['store_name'], 'POST')
def create_store(request):
    current_user = request.user
    current_boss = get_boss(current_user)
    business = current_boss.business

    store_name = request.POST['store_name']

    if store_name == '':
        return HttpResponseBadRequest('Store name is an empty string.', 'application/json')

    user_stores = business.stores.all()

    for user_store in user_stores:
        if user_store.name == store_name:
            return HttpResponseBadRequest('Store name already exist.', 'application/json')

    store = Store.objects.create(name=request.POST['store_name'])
    # ADD TO BUSINESS STORE LIST
    business.stores.add(store)
    store.link_columns = {"quantity": False, "price": False, "cost": False, 'name': False}
    store.columns = []
    store.transaction_filter = ['ALL']
    store.save()

    return JsonResponse(model_to_dict(store), safe=False)


