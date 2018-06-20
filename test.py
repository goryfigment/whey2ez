import re

name_regex = '{{name}}'
prev_column_name = 'name'
new_column_name = 'names'

key_list = re.findall('\{{.*?\}}', name_regex)

for key in key_list:
    name_regex = name_regex.replace('{{' + prev_column_name + '}}', '{{' + new_column_name + '}}')

print name_regex