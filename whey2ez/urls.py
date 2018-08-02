from django.conf.urls import url
from django.contrib import admin
from whey2ez.controllers import site, account_handler, inventory, employee, operation, transaction

urlpatterns = [
    url(r'^$', site.home, name='home'),
    url(r'^admin/', admin.site.urls),
    url(r'^register/$', site.register, name='register_page'),
    url(r'^login/$', site.login, name='login_page'),
    url(r'^inventory/$', site.inventory, name='inventory_page'),
    url(r'^store/$', site.store, name='store_page'),
    url(r'^employee/$', site.employee, name='employee_page'),
    url(r'^transaction/$', site.transaction, name='transaction_page'),
    url(r'^create_transaction/$', site.create_transaction_page, name='create_transaction_page'),
    url(r'^overview/$', site.overview_page, name='overview_page'),

    # Account Handler
    url(r'^account/register/$', account_handler.register, name='register'),
    url(r'^account/login/$', account_handler.user_login, name='login'),
    url(r'^logout/$', account_handler.user_logout, name='logout'),

    # Operation
    url(r'^operation/link_columns/$', operation.link_columns, name='link_columns'),

    # Inventory
    url(r'^inventory/add_column/$', inventory.add_column, name='add_column'),
    url(r'^inventory/add_item/$', inventory.add_item, name='add_item'),
    url(r'^inventory/edit_column/$', inventory.edit_column, name='edit_column'),
    url(r'^inventory/edit_item/$', inventory.edit_item, name='edit_item'),
    url(r'^inventory/delete_column/$', inventory.delete_column, name='delete_column'),
    url(r'^inventory/delete_item/$', inventory.delete_item, name='delete_item'),
    url(r'^inventory/read_excel/$', inventory.read_excel, name='read_excel'),
    url(r'^inventory/import_submit/$', inventory.import_submit, name='import_submit'),
    url(r'^inventory/export_submit/$', inventory.export_submit, name='export_submit'),
    url(r'^inventory/drop_table/$', inventory.drop_table, name='drop_table'),
    url(r'^inventory/item_log/$', inventory.get_item_log, name='item_log'),
    url(r'^inventory/save_settings/$', inventory.save_settings, name='inventory_settings'),

    # Inventory Operation
    url(r'^inventory/received/$', inventory.received, name='received'),
    url(r'^inventory/damaged/$', inventory.damaged, name='damaged'),
    url(r'^inventory/reset_cost/$', inventory.reset_cost, name='reset_cost'),
    url(r'^inventory/reset_price/$', inventory.reset_price, name='reset_price'),

    # Employee
    url(r'^employee/create_user_type/$', employee.create_user_type, name='create_user_type'),
    url(r'^employee/edit_user_type/$', employee.edit_user_type, name='edit_user_type'),
    url(r'^employee/delete_user_type/$', employee.delete_user_type, name='delete_user_type'),
    url(r'^employee/register/$', employee.create_employee, name='create_employee'),
    url(r'^employee/get_employee_type/$', employee.get_employee_type, name='get_employee_type'),

    # Transaction
    url(r'^inventory/search/$', transaction.inventory_search, name='inventory_search'),
    url(r'^transaction/get_transaction/$', transaction.get_transaction, name='get_transaction'),
    url(r'^transaction/create_transaction/$', transaction.create_transaction, name='create_transaction'),
    url(r'^transaction/save_settings/$', transaction.save_settings, name='transaction_settings'),
    url(r'^transaction/save_receipt_settings/$', transaction.save_receipt_settings, name='save_receipt_settings'),
    url(r'^transaction/receipt/$', transaction.get_receipt, name='receipt'),
]
