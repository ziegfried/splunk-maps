# Copyright by SPP Handelsges.m.b.H. 2011 - http://www.spp.at/
import sys, re, csv

# import spp.debug
#spp.debug.redirect_all("geonormalize")

LAT_FIELD_REGEX = re.compile("(.*_|^)lat(itude)?$")
LNG_SUFFIXES = ['lng', 'lon', 'longitude']
GEO_FIELD = '_geo'
KNOWN_FIELDS = [('_lat', '_lng'), ('clientip_lat', 'clientip_lon'), ('ip_latitude', 'ip_longitude')]


def find_geo_fields(fields):
    for f in KNOWN_FIELDS:
        if f[0] in fields and f[1] in fields:
            return f[0], f[1]
    for f in fields:
        if LAT_FIELD_REGEX.match(f):
            lat_f = f
            for suffix in LNG_SUFFIXES:
                lng_f = re.sub("lat(itude)?", suffix, lat_f)
                if lng_f in fields:
                    return lat_f, lng_f
    return None, None


try:
    reader = csv.DictReader(sys.stdin)
    headers = reader.fieldnames
    if not GEO_FIELD in headers:
        headers.append(GEO_FIELD)
    writer = csv.DictWriter(sys.stdout, headers)
    writer.writer.writerow(headers)

    (lat_field, lng_field) = find_geo_fields(reader.fieldnames)

    for r in reader:
        if GEO_FIELD in r and r[GEO_FIELD] is not None and len(r[GEO_FIELD]) > 0:
            writer.writerow(r)
        elif lat_field:
            if r[lat_field] and r[lng_field]:
                r[GEO_FIELD] = ",".join([r[lat_field], r[lng_field]])
            writer.writerow(r)
except:
    import traceback

    print >> sys.stderr, traceback.format_exc()