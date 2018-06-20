import json, math, bcrypt, re, time
from django.conf import settings
from django.http import HttpResponse
from django.core import serializers
from django.http import HttpResponseBadRequest
from whey2ez.models import Transaction, Store


def get_base_url():
    return settings.BASE_URL


def render_json(data):
    return HttpResponse(json.dumps(data), 'application/json')


def decimal_format(f, n, round_decimal):
    d = '{:0.' + str(n) + 'f}'
    if round_decimal:
        return d.format(round(float(f) * 10 ** n) / 10 ** n)
    else:
        return d.format(math.floor(float(f) * 10 ** n) / 10 ** n)


def bad_request(message, data):
    data = {'success': False, 'error_msg:': message, 'data': data}
    return HttpResponseBadRequest(json.dumps(data), 'application/json')


def model_to_dict(model):
    try:
        serial_obj = serializers.serialize('json', [model])
        obj_as_dict = json.loads(serial_obj)[0]['fields']
        obj_as_dict['id'] = model.pk
        return obj_as_dict
    except:
        return None


def models_to_dict(model_list):
    model_list = list(model_list)
    my_list = []
    for model in model_list:
        model_dict = model_to_dict(model)
        if model_dict:
            my_list.append(model_dict)

    return my_list


def transaction_name_regex(string, item):
    key_list = re.findall('\{{.*?\}}', string)
    for key in key_list:
        item_key = key.replace('{{', '').replace('}}', '')
        string = string.replace(key, item[item_key])

    return string


def transaction_total(transactions):
    total = {'cash': 0, 'credit': 0, 'total': 0}
    for trans in transactions:
        item_discount = 0
        trans['total'] = 0
        trans['date'] = epoch_strftime(trans['date'], '%b %#d, %Y %I:%M%p')

        for item in trans['items']['list']:
            item_discount += float(item['discount'])

        # Calculations
        trans_tax = round(float(trans['tax'])*float(trans['subtotal'])*100)/100
        trans_total = float(trans['subtotal']) + trans_tax - float(item_discount)
        # Data: Tax, Discount, Total
        trans['tax'] = '{0:.2f}'.format(trans_tax)
        trans['discount'] = '{0:.2f}'.format(item_discount)
        trans['total'] = '{0:.2f}'.format(trans_total)

        if trans['payment_type'] == 'Cash':
            total['cash'] += trans_total
        else:
            total['credit'] += trans_total

        total['total'] += trans_total

    return {'total': {'cash': '{0:.2f}'.format(total['cash']), 'credit': '{0:.2f}'.format(total['credit']), 'total': '{0:.2f}'.format(total['total'])}, 'transactions': transactions}


def get_utc_epoch_time(days=0):
    return int(round(time.time() - (int(days)*86400)))


def epoch_strftime(utc_time, regex):
    return time.strftime(regex, time.localtime(int(utc_time)))


def get_transactions(boss_id, start_time=None, end_time=None, order='date'):
    if start_time and end_time:
        return models_to_dict(Transaction.objects.filter(boss=boss_id, date__range=(start_time, end_time)).order_by(order))
    else:
        return models_to_dict(Transaction.objects.filter(boss=boss_id).order_by(order))


def validate_password(password, hashed_password):
    return bcrypt.hashpw(password.encode('utf8'), hashed_password.encode('utf8')) == hashed_password


def create_password(password):
    return bcrypt.hashpw(password.encode('utf8'), bcrypt.gensalt())


def get_boss(current_user):
    if current_user.boss:
        return current_user.boss
    else:
        return current_user.employee.boss


def get_establishment(store_id, store_type, boss):
    if store_type == "main":
        return boss.business
    else:
        return Store.objects.get(id=store_id)


def sort_inventory(user_settings, user_inventory):
    if user_settings.order_by != 'none':
        return sorted(user_inventory.items(), key=lambda (k, v): v[user_settings.order_by], reverse=user_settings.reverse)
    else:
        return sorted(user_inventory.items(), key=lambda (k, v): int(k), reverse=False)
