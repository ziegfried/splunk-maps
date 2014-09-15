import sys
import re

import splunk.Intersplunk

import geoip


(isgetinfo, sys.argv) = splunk.Intersplunk.isGetInfo(sys.argv)
keywords, options = splunk.Intersplunk.getKeywordsAndOptions()

# Handle error on windows
if len(keywords) > 1 and keywords[1] in ['__GETINFO__', '__EXECUTE__']:
    if len(keywords) > 2:
        keywords = keywords[2:]
    else:
        keywords = []

if len(keywords) > 1:
    splunk.Intersplunk.parseError("Invalid keywords %s! Usage: geoip [options] <IP field>" % keywords)
    sys.exit(0)

if len(keywords):
    ip_field = keywords[0]
    preprocess = None
else:
    ip_field = 'geoip'
    ip_rex = re.compile(r"([12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9])")

    def extract_ip(row):
        if "_raw" in row:
            m = ip_rex.search(row['_raw'])
            if m:
                row['geoip'] = m.group(1)
        return row

    preprocess = extract_ip

resolve_hostnames = None
if 'resolve_hostnames' in options:
    resolve_hostnames = geoip._bool(options['resolve_hostnames'])

if isgetinfo:
    try:
        geoip.get_geo_db_info()
    except geoip.GeoipError, e:
        splunk.Intersplunk.parseError("Error: %s" % e)
    splunk.Intersplunk.outputInfo(True, False, True, False, None, req_fields=ip_field, clear_req_fields=False)

while True:
    line = sys.stdin.readline()
    if not line.strip(): break
try:
    geoip.process_csv_stream(sys.stdin, sys.stdout, prefix=("%s_" % ip_field), ip_field=ip_field,
                             add_missing_fields=True, resolve_hostnames=resolve_hostnames, ip_field_mandatory=False,
                             preprocess_row=preprocess)
except geoip.GeoipError, e:
    print "ERROR"
    print '"Error: %s"' % e
except:
    print "ERROR"
    import traceback

    print >> sys.stderr, traceback.format_exc()
    print '"An unknwon error occured while performing the geoip lookup: %s"' % sys.exc_info()[0]
