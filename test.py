import time
created_link = 1539617266
now = int(round(time.time()))

within = 86400

day_from_now = 1539703666 - 86400

print day_from_now

if (now - created_link) > 86400:
    print 'Over 24hours'
else:
    print 'Not over 24hours'